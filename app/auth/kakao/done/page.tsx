'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

function KakaoDoneInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const tokenHash = searchParams.get('token_hash');
    const next = searchParams.get('next') || '/';

    if (!tokenHash) {
      setError('토큰이 전달되지 않았어요. 다시 시도해 주세요.');
      return;
    }

    (async () => {
      const supabase = createClient();
      const { error } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: 'magiclink',
      });
      if (error) {
        setError(error.message);
        return;
      }
      router.replace(next);
      router.refresh();
    })();
  }, [searchParams, router]);

  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center px-6">
        <div className="max-w-md text-center space-y-4">
          <p className="text-3xl">🩸</p>
          <p className="text-blood-400">{error}</p>
          <a href="/login" className="inline-block px-6 py-3 bg-blood-700 hover:bg-blood-600 text-white rounded-lg">
            다시 로그인
          </a>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-3">
        <p className="text-3xl animate-flicker">🕯️</p>
        <p className="text-midnight-300 text-sm animate-pulse-slow">로그인 중…</p>
      </div>
    </main>
  );
}

export default function KakaoDonePage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen flex items-center justify-center">
        <p className="text-midnight-500 text-sm">준비 중…</p>
      </main>
    }>
      <KakaoDoneInner />
    </Suspense>
  );
}
