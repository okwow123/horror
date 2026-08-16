// Kakao OAuth 직접 호출 (Supabase Kakao provider 우회).
// 이유: Supabase 의 Kakao provider 가 default scope 에 `account_email` 을 강제 박아서
// 비-비즈니스 앱에서 항상 동의항목 에러 발생. 직접 호출하면 scope 100% 우리 손.

import { NextResponse, type NextRequest } from 'next/server';

function getOrigin(req: NextRequest) {
  // 1) 환경변수 (프로덕션)
  if (process.env.NEXT_PUBLIC_SITE_URL) return process.env.NEXT_PUBLIC_SITE_URL;
  // 2) 요청 헤더에서 (로컬/프리뷰)
  return req.nextUrl.origin;
}

export async function GET(req: NextRequest) {
  const clientId = process.env.KAKAO_CLIENT_ID;
  if (!clientId) {
    return NextResponse.json(
      { error: 'KAKAO_CLIENT_ID 가 설정되지 않았어요' },
      { status: 500 },
    );
  }

  const origin = getOrigin(req);
  const redirectUri = `${origin}/auth/kakao/callback`;

  // 비-비즈니스 앱: account_email 사용 불가. 닉네임/이미지만.
  const scope = ['profile_nickname', 'profile_image'].join(' ');

  const url = new URL('https://kauth.kakao.com/oauth/authorize');
  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', scope);

  return NextResponse.redirect(url.toString());
}
