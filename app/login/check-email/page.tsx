export default function CheckEmailPage({ searchParams }: { searchParams: { email?: string } }) {
  const email = searchParams.email ?? '이메일';
  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-md text-center space-y-5">
        <div className="text-6xl animate-flicker">📨</div>
        <h1 className="text-3xl font-serif text-blood-500">매직 링크를 보냈어요</h1>
        <p className="text-midnight-200">
          <span className="text-white font-medium">{email}</span> 로 로그인 링크를 보냈습니다.
          <br />이메일을 열어 링크를 누르면 자동으로 로그인돼요.
        </p>
        <p className="text-xs text-midnight-500">
          이메일이 오지 않으면 스팸함을 확인하거나 잠시 후 다시 시도해 주세요.
        </p>
        <a href="/login" className="inline-block text-sm text-blood-400 underline">다시 시도</a>
      </div>
    </main>
  );
}
