export default function AuthCodeErrorPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="max-w-md text-center space-y-4">
        <h1 className="text-3xl font-serif text-blood-500">로그인에 실패했습니다</h1>
        <p className="text-midnight-300">
          잠시 후 다시 시도해 주세요. 문제가 계속되면 다른 로그인 방식을 이용해 주세요.
        </p>
        <a
          href="/login"
          className="inline-block px-6 py-3 bg-blood-700 hover:bg-blood-600 text-white rounded-lg transition"
        >
          다시 로그인
        </a>
      </div>
    </main>
  );
}
