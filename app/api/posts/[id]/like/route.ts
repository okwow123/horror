import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const postId = params.id;
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: '로그인이 필요해요' }, { status: 401 });

  // 이미 좋아요 했는지 확인
  const { data: existing } = await supabase
    .from('likes')
    .select('post_id')
    .eq('user_id', user.id)
    .eq('post_id', postId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from('likes')
      .delete()
      .eq('user_id', user.id)
      .eq('post_id', postId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else {
    const { error } = await supabase
      .from('likes')
      .insert({ user_id: user.id, post_id: postId });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { data: post } = await supabase
    .from('posts')
    .select('likes_count')
    .eq('id', postId)
    .single();

  return NextResponse.json({ liked: !existing, likes_count: post?.likes_count ?? 0 });
}
