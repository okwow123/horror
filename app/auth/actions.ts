'use server';

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

function getOrigin() {
  return process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
}

export async function signInWithEmail(formData: FormData): Promise<void> {
  const email = String(formData.get('email') ?? '').trim();
  if (!email) {
    redirect('/login?error=' + encodeURIComponent('이메일을 입력해 주세요.'));
  }

  const supabase = createClient();
  const origin = getOrigin();

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: `${origin}/auth/callback` },
  });

  if (error) {
    redirect('/login?error=' + encodeURIComponent(error.message));
  }
  redirect(`/login/check-email?email=${encodeURIComponent(email)}`);
}

// Kakao 로그인은 Supabase Kakao provider 의 default scope 강제 박기 문제로
// /auth/kakao/start → /auth/kakao/callback 직접 OAuth 플로우로 구현.
// (관련: app/auth/kakao/*)

export async function signOut(): Promise<void> {
  const supabase = createClient();
  await supabase.auth.signOut();
  redirect('/');
}
