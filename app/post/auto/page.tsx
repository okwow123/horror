// [2026-08-16] 로그인 제거. 누구나 익명으로 AI 글쓰기 가능.

import { AutoStoryClient } from '@/components/AutoStoryClient';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export default function AutoCreatePage() {
  return (
    <main className="max-w-2xl mx-auto px-4 py-8">
      <AutoStoryClient aiConfigured={!!process.env.MINIMAX_API_KEY} />
    </main>
  );
}
