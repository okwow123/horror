'use client';

import { useEffect, useState } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { cn, timeAgo } from '@/lib/utils';
import type { Comment } from '@/lib/types';

interface CommentSectionProps {
  postId: string;
  viewerId: string | null;
  onCountChange?: (n: number) => void;
}

export function CommentSection({ postId, viewerId, onCountChange }: CommentSectionProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/posts/${postId}/comments`);
        const data = await res.json();
        if (cancelled) return;
        setComments(data.comments ?? []);
        onCountChange?.((data.comments ?? []).length);
      } catch {
        if (!cancelled) setError('댓글을 불러오지 못했어요');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [postId, onCountChange]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!viewerId || submitting || !text.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/posts/${postId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: text.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '댓글 등록 실패');
      setComments(c => [...c, data.comment]);
      onCountChange?.(comments.length + 1);
      setText('');
    } catch (e) {
      setError(e instanceof Error ? e.message : '댓글 등록 실패');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="border-t border-midnight-700/60 bg-midnight-900/40">
      <div className="px-4 py-3 space-y-3 max-h-80 overflow-y-auto scrollbar-thin">
        {loading && <p className="text-xs text-midnight-500">댓글 불러오는 중…</p>}
        {!loading && comments.length === 0 && (
          <p className="text-xs text-midnight-500">아직 댓글이 없어요.</p>
        )}
        {comments.map(c => (
          <div key={c.id} className="flex gap-2 text-sm">
            <div className="w-7 h-7 rounded-full bg-midnight-700 flex items-center justify-center text-[10px] text-midnight-300 flex-shrink-0">
              {(c.author?.display_name || c.author?.username || '?')[0].toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className={cn('font-medium text-xs', c.author?.is_bot ? 'text-blood-400' : 'text-midnight-100')}>
                  {c.author?.display_name || c.author?.username || '익명'}
                </span>
                <span className="text-[10px] text-midnight-500">{timeAgo(c.created_at)}</span>
              </div>
              <p className="text-midnight-200 break-words">{c.content}</p>
            </div>
          </div>
        ))}
      </div>

      {viewerId ? (
        <form onSubmit={submit} className="flex items-center gap-2 px-4 py-3 border-t border-midnight-700/40">
          <input
            value={text}
            onChange={e => setText(e.target.value)}
            maxLength={500}
            placeholder="무서운 한마디…"
            className="flex-1 px-3 py-2 bg-midnight-800 border border-midnight-700 rounded-lg text-sm text-white placeholder:text-midnight-500 focus:outline-none focus:border-blood-700"
          />
          <button
            type="submit"
            disabled={submitting || !text.trim()}
            className="w-9 h-9 flex items-center justify-center bg-blood-700 hover:bg-blood-600 text-white rounded-lg disabled:opacity-40"
          >
            {submitting ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </form>
      ) : (
        <p className="px-4 py-3 text-xs text-midnight-500 border-t border-midnight-700/40 text-center">
          댓글을 쓰려면 <a href="/login" className="text-blood-400 underline">로그인</a>하세요.
        </p>
      )}

      {error && <p className="px-4 pb-3 text-xs text-blood-500">{error}</p>}
    </div>
  );
}
