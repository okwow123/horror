// [2026-08-16] 로그인 제거.

import Link from 'next/link';
import { CardFlow } from '@/components/CardFlow';
import { ArrowLeft } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default function CardsCreatePage() {
  return (
    <main className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-2">
        <Link
          href="/post/create"
          className="inline-flex items-center gap-1 text-xs text-midnight-500 hover:text-midnight-300"
        >
          <ArrowLeft size={12} /> 다른 방식으로 쓰기
        </Link>
      </div>
      <div className="mb-6 text-center space-y-1">
        <h1 className="text-3xl font-serif text-blood-500">이야기를 깬다</h1>
        <p className="text-sm text-midnight-400">카드에 답하기만 하면, 어둠이 이야기를 써 줘.</p>
      </div>
      <CardFlow />
    </main>
  );
}
