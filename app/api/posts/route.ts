import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { PostWithAuthor } from '@/lib/types';

const PAGE_SIZE = 10;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const cursor = searchParams.get('cursor') ?? undefined;
  const authorId = searchParams.get('authorId') ?? undefined;
  const viewerOnly = searchParams.get('viewerOnly') === '1';

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let q = supabase
    .from('posts')
    .select(`
      id, user_id, title, content, image_url, source_url, is_auto, is_anonymous,
      likes_count, comments_count, created_at,
      author:profiles!posts_user_id_fkey ( id, username, display_name, avatar_url, is_bot )
    `)
    .order('created_at', { ascending: false })
    .limit(PAGE_SIZE + 1);

  if (cursor) q = q.lt('created_at', cursor);
  if (authorId) q = q.eq('user_id', authorId);
  if (viewerOnly) {
    if (!user) {
      return NextResponse.json({ posts: [], nextCursor: null });
    }
    q = q.eq('user_id', user.id);
  }

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let posts: PostWithAuthor[] = (data ?? []) as unknown as PostWithAuthor[];
  if (posts.length > PAGE_SIZE) posts = posts.slice(0, PAGE_SIZE);
  const nextCursor = posts.length === PAGE_SIZE ? posts[posts.length - 1].created_at : null;

  if (user && posts.length) {
    const ids = posts.map(p => p.id);
    const { data: liked } = await supabase
      .from('likes')
      .select('post_id')
      .eq('user_id', user.id)
      .in('post_id', ids);
    const likedSet = new Set((liked ?? []).map(l => l.post_id));
    posts = posts.map(p => ({ ...p, viewer_has_liked: likedSet.has(p.id) }));
  }

  return NextResponse.json({ posts, nextCursor });
}

export async function POST(request: NextRequest) {
  // [2026-08-16] 로그인 제거. 누구나 익명으로 글 작성 가능.
  // user_id 없이 insert. is_anonymous는 항상 true.

  const body = await request.json().catch(() => ({}));
  const answers = body?.answers;
  const title = typeof body?.title === 'string' ? body.title.trim() : '';
  const content = typeof body?.content === 'string' ? body.content.trim() : '';
  const imageUrl = typeof body?.image_url === 'string' ? body.image_url.trim() : '';

  if (!title || !content) {
    return NextResponse.json(
      { error: '제목/본문이 비어있어요.' },
      { status: 400 },
    );
  }

  const supabase = createClient();
  const { data: post, error: insertErr } = await supabase
    .from('posts')
    .insert({
      title,
      content,
      image_url: imageUrl || null,
      is_auto: false,
      is_anonymous: true,  // [2026-08-16] 항상 익명
    })
    .select('id')
    .single();

  if (insertErr || !post) {
    return NextResponse.json({ error: insertErr?.message ?? '저장 실패' }, { status: 500 });
  }

  if (answers && typeof answers === 'object') {
    // [2026-08-16] user_id 없이 insert (로그인 제거)
    await supabase
      .from('card_answers')
      .insert({ answers: answers as unknown as any, post_id: post.id });
  }

  return NextResponse.json({ post: { id: post.id } });
}
