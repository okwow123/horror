import { createClient } from './supabase/server';
import type { PostWithAuthor } from './types';

const PAGE_SIZE = 10;

export interface FetchFeedOptions {
  cursor?: string; // ISO date
  authorId?: string;
  viewerId?: string | null;
}

export async function fetchFeed(opts: FetchFeedOptions = {}): Promise<{
  posts: PostWithAuthor[];
  nextCursor: string | null;
}> {
  const supabase = createClient();
  let q = supabase
    .from('posts')
    .select(
      `
      id, user_id, title, content, image_url, source_url, is_auto, is_anonymous,
      likes_count, comments_count, created_at,
      author:profiles!posts_user_id_fkey ( id, username, display_name, avatar_url, is_bot )
    `,
    )
    .order('created_at', { ascending: false })
    .limit(PAGE_SIZE + 1);

  if (opts.cursor) q = q.lt('created_at', opts.cursor);
  if (opts.authorId) q = q.eq('user_id', opts.authorId);

  const { data, error } = await q;
  if (error) throw new Error(error.message);

  let posts = (data ?? []) as unknown as PostWithAuthor[];
  if (posts.length > PAGE_SIZE) posts = posts.slice(0, PAGE_SIZE);
  const nextCursor = posts.length === PAGE_SIZE ? posts[posts.length - 1].created_at : null;

  // viewer 가 좋아요 했는지 표시
  if (opts.viewerId && posts.length) {
    const ids = posts.map(p => p.id);
    const { data: liked } = await supabase
      .from('likes')
      .select('post_id')
      .eq('user_id', opts.viewerId)
      .in('post_id', ids);
    const likedSet = new Set((liked ?? []).map(l => l.post_id));
    posts = posts.map(p => ({ ...p, viewer_has_liked: likedSet.has(p.id) }));
  }

  return { posts, nextCursor };
}
