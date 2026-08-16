import { signInWithEmail } from '../auth/actions';
import { ErrorBox } from '@/components/ErrorBox';

export default function LoginPage({ searchParams }: { searchParams: { error?: string; email?: string } }) {
  return (
    <main className="min-h-screen flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-3">
          <h1 className="text-5xl font-serif text-blood-500 tracking-widest animate-flicker">심야</h1>
          <p className="text-midnight-300 text-sm">深夜 · 공포 이야기 피드</p>
        </div>

        {searchParams.error && <ErrorBox message={searchParams.error} />}

        <div className="bg-midnight-800 border border-midnight-700 rounded-2xl p-6 space-y-6 shadow-2xl">
          {/* 카카오 — 직접 OAuth (Supabase Kakao provider 우회) */}
          <a
            href="/auth/kakao/start"
            className="block w-full bg-[#FEE500] text-black font-medium py-3 rounded-lg hover:brightness-95 transition text-center"
          >
            🟡 카카오로 시작하기
          </a>

          <div className="flex items-center gap-3 text-midnight-500 text-xs">
            <div className="flex-1 h-px bg-midnight-700" />
            <span>또는</span>
            <div className="flex-1 h-px bg-midnight-700" />
          </div>

          <form action={signInWithEmail} className="space-y-3">
            <label className="block text-sm text-midnight-200">이메일 (매직 링크 발송)</label>
            <input
              name="email"
              type="email"
              required
              placeholder="you@example.com"
              className="w-full px-4 py-3 bg-midnight-900 border border-midnight-700 rounded-lg text-white placeholder:text-midnight-500 focus:outline-none focus:border-blood-600"
            />
            <button
              type="submit"
              className="w-full bg-blood-700 hover:bg-blood-600 text-white font-medium py-3 rounded-lg transition"
            >
              매직 링크 보내기
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-midnight-500">
          가입 시 심야 이용약관에 동의한 것으로 간주합니다.
        </p>
      </div>
    </main>
  );
}
