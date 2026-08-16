// [2026-08-16] 로그인 제거. 누구나 익명으로 피드 사용.

import { fetchFeed } from '@/lib/posts';
import { Feed } from '@/components/Feed';
import Link from 'next/link';
import { PenSquare, Gamepad2 } from 'lucide-react';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function HomePage({ searchParams }: { searchParams: { highlight?: string } }) {
  const { posts, nextCursor } = await fetchFeed({ viewerId: null });

  return (
    <main className="max-w-2xl mx-auto px-4 py-4">
      <div className="mb-4 flex items-center justify-end gap-2">
        <Link
          href="/passenger-game"
          className="flex items-center gap-1.5 px-3 py-2 border border-blood-700/70 bg-blood-900/40 text-blood-200 hover:text-blood-100 hover:bg-blood-800/60 hover:border-blood-500 text-sm rounded-lg transition font-bold"
          title="PASSENGER: ROAD OF DEATH — 브라우저 호러 미스터리 게임"
        >
          <Gamepad2 size={16} /> 🎮 공포게임
        </Link>
        <Link
          href="/haunted"
          className="flex items-center gap-1.5 px-3 py-2 border border-blood-700/50 text-blood-300 hover:text-blood-200 hover:border-blood-500 text-sm rounded-lg transition"
        >
          🎃 흉가 체험
        </Link>
        <Link
          href="/post/create"
          className="flex items-center gap-1.5 px-4 py-2 bg-blood-700 hover:bg-blood-600 text-white text-sm rounded-lg transition"
        >
          <PenSquare size={16} /> 이야기 쓰기
        </Link>
      </div>

      <Feed
        initialPosts={posts}
        initialCursor={nextCursor}
        viewerId={null}
        highlightId={searchParams.highlight}
      />
    </main>
  );
}
