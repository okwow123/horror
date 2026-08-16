import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: '로그인이 필요해요' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const targetId = String(body?.targetId ?? '');
  if (!targetId) return NextResponse.json({ error: '잘못된 요청' }, { status: 400 });
  if (targetId === user.id) return NextResponse.json({ error: '자기 자신은 팔로우할 수 없어요' }, { status: 400 });

  // 이미 팔로우 중인지 확인
  const { data: existing } = await supabase
    .from('follows')
    .select('follower_id')
    .eq('follower_id', user.id)
    .eq('following_id', targetId)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from('follows')
      .delete()
      .eq('follower_id', user.id)
      .eq('following_id', targetId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ following: false });
  } else {
    const { error } = await supabase
      .from('follows')
      .insert({ follower_id: user.id, following_id: targetId });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ following: true });
  }
}
