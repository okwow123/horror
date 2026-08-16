// Kakao OAuth 콜백:
// 1) code → access_token 교환
// 2) access_token 으로 user info 조회
// 3) Supabase admin 으로 user 생성/조회 (synthetic email 기반)
// 4) action_link 의 token_hash 를 클라이언트 done 페이지로 전달
// 5) done 페이지가 supabase.auth.verifyOtp 로 세션 확립

import { NextResponse, type NextRequest } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

const KAKAO_CLIENT_ID = process.env.KAKAO_CLIENT_ID ?? '';
const KAKAO_CLIENT_SECRET = process.env.KAKAO_CLIENT_SECRET ?? '';

interface KakaoTokenResponse {
  access_token: string;
  token_type: string;
  refresh_token?: string;
  expires_in: number;
  scope?: string;
  refresh_token_expires_in?: number;
}

interface KakaoUser {
  id: number;
  kakao_account?: {
    profile?: {
      nickname?: string;
      profile_image_url?: string;
      thumbnail_image_url?: string;
    };
    email?: string | null;
  };
  properties?: {
    nickname?: string;
    profile_image?: string;
    thumbnail_image?: string;
  };
}

function getOrigin(req: NextRequest) {
  return process.env.NEXT_PUBLIC_SITE_URL ?? req.nextUrl.origin;
}

function loginError(req: NextRequest, msg: string) {
  const url = new URL('/login', req.url);
  url.searchParams.set('error', msg);
  return NextResponse.redirect(url);
}

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  const errorParam = req.nextUrl.searchParams.get('error');
  if (errorParam) return loginError(req, `카카오: ${errorParam}`);
  if (!code) return loginError(req, '인증 코드가 없어요');

  if (!KAKAO_CLIENT_ID) return loginError(req, 'KAKAO_CLIENT_ID 미설정');

  const origin = getOrigin(req);
  const redirectUri = `${origin}/auth/kakao/callback`;

  // 1) code → access_token
  const tokenBody = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: KAKAO_CLIENT_ID,
    redirect_uri: redirectUri,
    code,
  });
  if (KAKAO_CLIENT_SECRET) tokenBody.set('client_secret', KAKAO_CLIENT_SECRET);

  const tokenRes = await fetch('https://kauth.kakao.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: tokenBody,
  });
  if (!tokenRes.ok) {
    const t = await tokenRes.text().catch(() => '');
    console.error('[kakao] token exchange failed', tokenRes.status, t.slice(0, 200));
    return loginError(req, '카카오 토큰 교환 실패');
  }
  const tokenData: KakaoTokenResponse = await tokenRes.json();

  // 2) user info
  const userRes = await fetch('https://kapi.kakao.com/v2/user/me', {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });
  if (!userRes.ok) {
    console.error('[kakao] user/me failed', userRes.status);
    return loginError(req, '카카오 사용자 정보 조회 실패');
  }
  const kakaoUser: KakaoUser = await userRes.json();

  const kakaoId = String(kakaoUser.id);
  const nickname =
    kakaoUser.kakao_account?.profile?.nickname ||
    kakaoUser.properties?.nickname ||
    `kakao_${kakaoId}`;
  const avatarUrl =
    kakaoUser.kakao_account?.profile?.profile_image_url ||
    kakaoUser.properties?.profile_image ||
    null;

  // 3) Supabase user 생성 (magic link OTP → verifyOtp)
  const supabase = createServiceClient();
  const syntheticEmail = `kakao-${kakaoId}@kakao.simya.app`;

  const { data: linkData, error: linkErr } = await supabase.auth.admin.generateLink({
    type: 'magiclink',
    email: syntheticEmail,
    options: {
      // 신규면 raw_user_meta_data 에 박힘 (트리거가 username 만드는데 사용)
      data: {
        provider: 'kakao',
        provider_id: kakaoId,
        display_name: nickname,
        avatar_url: avatarUrl,
      },
    },
  });

  if (linkErr || !linkData) {
    console.error('[kakao] generateLink error', linkErr);
    return loginError(req, '계정 생성 실패');
  }

  const actionLink = linkData.properties?.action_link ?? (linkData as any).action_link;
  if (!actionLink) {
    console.error('[kakao] no action_link', linkData);
    return loginError(req, '세션 토큰 생성 실패');
  }

  // action_link 형식: https://<project>/auth/v1/verify?token=<TOKEN>&type=magiclink&redirect_to=...
  const verifyUrl = new URL(actionLink);
  const tokenHash = verifyUrl.searchParams.get('token');
  if (!tokenHash) {
    console.error('[kakao] no token in action_link', actionLink);
    return loginError(req, '세션 토큰 파싱 실패');
  }

  // 4) done 페이지로 토큰 전달
  const doneUrl = new URL('/auth/kakao/done', origin);
  doneUrl.searchParams.set('token_hash', tokenHash);
  doneUrl.searchParams.set('next', '/');
  return NextResponse.redirect(doneUrl.toString());
}
