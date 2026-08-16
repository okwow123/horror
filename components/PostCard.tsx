'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { Heart, MessageCircle, Bookmark, MoreHorizontal, User as UserIcon } from 'lucide-react';
import { cn, timeAgo } from '@/lib/utils';
import type { PostWithAuthor } from '@/lib/types';
import { CommentSection } from './CommentSection';

interface PostCardProps {
  post: PostWithAuthor;
  viewerId: string | null;
  highlight?: boolean;
}

const COLLAPSE_THRESHOLD = 180;

export function PostCard({ post: initialPost, viewerId, highlight }: PostCardProps) {
  const [post, setPost] = useState(initialPost);
  const [liking, setLiking] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const cardRef = useRef<HTMLElement>(null);
  const author = post.author;
  const bot = author?.is_bot;
  const anon = post.is_anonymous;

  // highlight 가 true 면 스크롤
  useEffect(() => {
    if (highlight && cardRef.current) {
      setTimeout(() => {
        cardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 200);
    }
  }, [highlight]);

  const toggleLike = async () => {
    if (!viewerId || liking) return;
    setLiking(true);
    const wasLiked = post.viewer_has_liked;
    setPost(p => ({
      ...p,
      viewer_has_liked: !wasLiked,
      likes_count: p.likes_count + (wasLiked ? -1 : 1),
    }));
    try {
      const res = await fetch(`/api/posts/${post.id}/like`, { method: 'POST' });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setPost(p => ({ ...p, likes_count: data.likes_count, viewer_has_liked: data.liked }));
    } catch {
      setPost(p => ({
        ...p,
        viewer_has_liked: wasLiked,
        likes_count: p.likes_count + (wasLiked ? 1 : -1),
      }));
    } finally {
      setLiking(false);
    }
  };

  const contentLong = post.content.length > COLLAPSE_THRESHOLD;

  return (
    <article
      ref={cardRef}
      className={cn(
        'bg-midnight-800 border border-midnight-700 rounded-2xl overflow-hidden shadow-xl transition',
        highlight && 'ring-2 ring-blood-500 ring-offset-2 ring-offset-midnight-900',
      )}
    >
      {/* Header */}
      <header className="flex items-center gap-3 px-4 py-3">
        <Link
          href={anon ? '#' : author?.username ? `/profile/${author.username}` : '#'}
          onClick={e => anon && e.preventDefault()}
          className={cn(
            'w-9 h-9 rounded-full flex items-center justify-center overflow-hidden flex-shrink-0 ring-1',
            anon ? 'bg-midnight-800 ring-midnight-700' : 'bg-midnight-700 ring-midnight-600',
          )}
        >
          {anon ? (
            <UserIcon size={18} className="text-midnight-400" />
          ) : author?.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={author.avatar_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <UserIcon size={18} className="text-midnight-300" />
          )}
        </Link>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className={cn('font-medium text-sm truncate', anon ? 'text-midnight-300 italic' : bot ? 'text-blood-400' : 'text-white')}>
              {anon ? '익명' : (author?.display_name || author?.username || '익명')}
            </span>
            {anon && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-midnight-700/80 text-midnight-300 border border-midnight-600/50">
                ANON
              </span>
            )}
            {bot && !anon && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-blood-900/50 text-blood-300 border border-blood-800/50">
                BOT
              </span>
            )}
            {viewerId === post.user_id && !anon && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-midnight-700 text-midnight-300">
                내 글
              </span>
            )}
          </div>
          <div className="text-xs text-midnight-400">
            {anon ? '익명의 이야기' : `@${author?.username || 'unknown'}`} · {timeAgo(post.created_at)}
          </div>
        </div>
        <button className="text-midnight-400 hover:text-white p-1" aria-label="더보기">
          <MoreHorizontal size={18} />
        </button>
      </header>

      {/* Image — Instagram의 메인 */}
      <div className="relative w-full bg-midnight-900" style={{ aspectRatio: '4 / 5' }}>
        {post.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={post.image_url}
            alt=""
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-midnight-800 to-midnight-950">
            <span className="text-6xl text-midnight-700">🕯️</span>
          </div>
        )}
        {/* 하단 그라데이션 (텍스트 가독성용) */}
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/70 to-transparent pointer-events-none" />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 px-2 py-2">
        <button
          onClick={toggleLike}
          disabled={!viewerId || liking}
          className={cn(
            'flex items-center justify-center w-9 h-9 rounded-lg transition',
            post.viewer_has_liked
              ? 'text-blood-500'
              : 'text-white hover:bg-midnight-700',
            !viewerId && 'opacity-50 cursor-not-allowed',
          )}
          aria-label="좋아요"
        >
          <Heart size={22} fill={post.viewer_has_liked ? 'currentColor' : 'none'} />
        </button>
        <button
          onClick={() => setShowComments(s => !s)}
          className="flex items-center justify-center w-9 h-9 rounded-lg text-white hover:bg-midnight-700 transition"
          aria-label="댓글"
        >
          <MessageCircle size={22} />
        </button>
        <div className="flex-1" />
        <button
          onClick={() => setBookmarked(b => !b)}
          className={cn(
            'flex items-center justify-center w-9 h-9 rounded-lg transition',
            bookmarked ? 'text-blood-500' : 'text-white hover:bg-midnight-700',
          )}
          aria-label="북마크"
        >
          <Bookmark size={22} fill={bookmarked ? 'currentColor' : 'none'} />
        </button>
      </div>

      {/* Likes + Caption */}
      <div className="px-4 pb-3 space-y-1.5">
        {post.likes_count > 0 && (
          <p className="text-sm font-semibold text-white">
            좋아요 {post.likes_count.toLocaleString()}
          </p>
        )}
        <div className="text-sm text-midnight-100 leading-relaxed">
          {post.title && (
            <span className="font-serif text-base text-blood-100 mr-1.5">{post.title}</span>
          )}
          <span className="whitespace-pre-wrap">
            {contentLong && !expanded
              ? post.content.slice(0, COLLAPSE_THRESHOLD) + '…'
              : post.content}
          </span>
          {contentLong && (
            <button
              onClick={() => setExpanded(e => !e)}
              className="ml-1 text-midnight-400 hover:text-midnight-200 text-xs"
            >
              {expanded ? '접기' : '더 보기'}
            </button>
          )}
        </div>
        {post.comments_count > 0 && !showComments && (
          <button
            onClick={() => setShowComments(true)}
            className="text-xs text-midnight-400 hover:text-midnight-200"
          >
            댓글 {post.comments_count}개 모두 보기
          </button>
        )}
      </div>

      {showComments && (
        <CommentSection
          postId={post.id}
          viewerId={viewerId}
          onCountChange={n => setPost(p => ({ ...p, comments_count: n }))}
        />
      )}
    </article>
  );
}
