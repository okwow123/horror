'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Sparkles, ArrowLeft, Loader2 } from 'lucide-react';

export function CreateForm() {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const t = title.trim();
    const c = content.trim();
    if (!t || !c) {
      setError('제목과 본문을 모두 입력해 주세요.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: t,
          content: c,
          is_anonymous: isAnonymous,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || '게시 실패');
      router.push(`/?highlight=${data.post.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : '알 수 없는 오류');
      setSubmitting(false);
    }
  };

  return (
    <>
      <div className="mb-2 flex items-center justify-between">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-xs text-midnight-500 hover:text-midnight-300"
        >
          <ArrowLeft size={12} /> 피드로 돌아가기
        </Link>
        <Link
          href="/post/auto"
          className="inline-flex items-center gap-1 text-xs text-blood-400 hover:text-blood-300"
        >
          <Sparkles size={12} /> AI 가 대신 써줄까?
        </Link>
      </div>
      <div className="mb-6 text-center space-y-1">
        <h1 className="text-3xl font-serif text-blood-500">이야기를 깬다</h1>
        <p className="text-sm text-midnight-400">오늘의 무서운 이야기, 천천히 적어 봐.</p>
      </div>

      <form onSubmit={submit} className="space-y-4">
        <div>
          <label htmlFor="title" className="block text-sm text-midnight-200 mb-1">
            제목
          </label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="예: 14층의 나"
            maxLength={100}
            disabled={submitting}
            className="w-full px-3 py-2 bg-midnight-900 border border-midnight-700 rounded-lg text-white placeholder:text-midnight-500 focus:outline-none focus:border-blood-500 disabled:opacity-60"
          />
        </div>

        <div>
          <label htmlFor="content" className="block text-sm text-midnight-200 mb-1">
            본문
          </label>
          <textarea
            id="content"
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="그날, 나는..."
            rows={14}
            disabled={submitting}
            className="w-full px-3 py-3 bg-midnight-900 border border-midnight-700 rounded-lg text-white placeholder:text-midnight-500 focus:outline-none focus:border-blood-500 resize-y leading-relaxed disabled:opacity-60"
          />
          <p className="text-[11px] text-midnight-500 mt-1 text-right">
            {content.length.toLocaleString()}자
          </p>
        </div>

        <label className="flex items-center gap-2 px-4 py-3 bg-midnight-900/50 border border-midnight-700 rounded-lg cursor-pointer hover:border-midnight-500">
          <input
            type="checkbox"
            checked={isAnonymous}
            onChange={e => setIsAnonymous(e.target.checked)}
            disabled={submitting}
            className="w-4 h-4 rounded border-midnight-600 bg-midnight-800 text-blood-600 focus:ring-blood-600 focus:ring-offset-midnight-900"
          />
          <span className="text-sm text-midnight-200">익명으로 게시</span>
          <span className="text-[11px] text-midnight-500 ml-auto">작성자가 "익명"으로 표시돼요</span>
        </label>

        {error && (
          <p className="text-sm text-blood-500 text-center">{error}</p>
        )}

        <button
          type="submit"
          disabled={submitting || !title.trim() || !content.trim()}
          className="w-full px-4 py-3 bg-blood-700 hover:bg-blood-600 text-white font-medium rounded-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {submitting && <Loader2 size={16} className="animate-spin" />}
          {submitting ? '게시 중…' : '피드에 올리기'}
        </button>
      </form>
    </>
  );
}
