import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('comments')
    .select(`
      id, user_id, post_id, content, created_at,
      author:profiles!comments_user_id_fkey ( id, username, display_name, avatar_url, is_bot )
    `)
    .eq('post_id', params.id)
    .order('created_at', { ascending: true })
    .limit(100);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ comments: data ?? [] });
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: '로그인이 필요해요' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const content = String(body?.content ?? '').trim();
  if (content.length < 1 || content.length > 500) {
    return NextResponse.json({ error: '댓글은 1~500자로 입력해 주세요' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('comments')
    .insert({ user_id: user.id, post_id: params.id, content })
    .select(`
      id, user_id, post_id, content, created_at,
      author:profiles!comments_user_id_fkey ( id, username, display_name, avatar_url, is_bot )
    `)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ comment: data });
}
