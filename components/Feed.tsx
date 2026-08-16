'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { PostWithAuthor } from '@/lib/types';
import { PostCard } from './PostCard';

interface FeedProps {
  initialPosts: PostWithAuthor[];
  initialCursor: string | null;
  viewerId: string | null;
  highlightId?: string;
}

export function Feed({ initialPosts, initialCursor, viewerId, highlightId }: FeedProps) {
  const [posts, setPosts] = useState<PostWithAuthor[]>(initialPosts);
  const [cursor, setCursor] = useState<string | null>(initialCursor);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  // 부모에서 새 initialPosts 가 들어오면 (예: 새 글 작성 후 router.refresh)
  // state 와 동기화. 무한 스크롤로 추가된 loaded posts 가 있으면 합치고,
  // 없으면 initialPosts 로 교체.
  useEffect(() => {
    setPosts(prev => {
      if (prev.length === 0) return initialPosts;
      // prev 의 loaded 부분 (initialPosts 길이 이후) 을 보존
      const initialLen = initialPosts.length;
      const extraLoaded = prev.slice(initialLen);
      // initialPosts 의 첫 항목 id 가 prev 의 첫 항목 id 와 같으면 prev 유지
      if (prev[0]?.id === initialPosts[0]?.id) return prev;
      return [...initialPosts, ...extraLoaded];
    });
    setCursor(initialCursor);
  }, [initialPosts, initialCursor]);

  const loadMore = useCallback(async () => {
    if (loading || !cursor) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/posts?cursor=${encodeURIComponent(cursor)}`);
      if (!res.ok) throw new Error('피드를 불러오지 못했어요');
      const data = await res.json();
      setPosts(prev => [...prev, ...data.posts]);
      setCursor(data.nextCursor);
    } catch (e) {
      setError(e instanceof Error ? e.message : '알 수 없는 오류');
    } finally {
      setLoading(false);
    }
  }, [cursor, loading]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting) loadMore();
      },
      { rootMargin: '300px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadMore]);

  if (posts.length === 0) {
    return (
      <div className="text-center py-20 space-y-3">
        <p className="text-6xl">🕯️</p>
        <p className="text-midnight-300">아직 이야기가 없어요.</p>
        <p className="text-sm text-midnight-500">첫 이야기를 들려주세요.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {posts.map(post => (
        <PostCard
          key={post.id}
          post={post}
          viewerId={viewerId}
          highlight={post.id === highlightId}
        />
      ))}

      <div ref={sentinelRef} className="h-10 flex items-center justify-center text-sm text-midnight-500">
        {loading && '불러오는 중…'}
        {error && <span className="text-blood-500">{error}</span>}
        {!cursor && !loading && posts.length > 0 && (
          <span className="text-midnight-600">— 피드 끝 —</span>
        )}
      </div>
    </div>
  );
}
