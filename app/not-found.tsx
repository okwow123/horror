import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="min-h-[60vh] flex items-center justify-center px-6">
      <div className="text-center space-y-4 max-w-md">
        <p className="text-6xl">🕯️</p>
        <h1 className="text-3xl font-serif text-blood-500">여긴 아무도 없다</h1>
        <p className="text-midnight-300">찾던 페이지가 어둠 속으로 사라졌어요.</p>
        <Link href="/" className="inline-block px-6 py-3 bg-blood-700 hover:bg-blood-600 text-white rounded-lg transition">
          피드로 돌아가기
        </Link>
      </div>
    </main>
  );
}
