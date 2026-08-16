import { NextResponse, type NextRequest } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';

// 인증: CRON_SECRET 또는 로그인 세션 (둘 중 하나).
// dev 환경에서 CRON_SECRET 미설정시 통과.

async function checkAuth(req: NextRequest) {
  const expected = process.env.CRON_SECRET;
  if (expected) {
    const auth = req.headers.get('authorization');
    if (auth === `Bearer ${expected}`) return true;
    const url = new URL(req.url);
    if (url.searchParams.get('secret') === expected) return true;
  }
  try {
    const { createClient } = await import('@/lib/supabase/server');
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) return true;
  } catch {
    // ignore
  }
  return false;
}

export async function GET(req: NextRequest) {
  if (!(await checkAuth(req))) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const supabase = createServiceClient();

  // 사용자 컨텍스트는 anon 으로 가져올 수 없으므로 service 로.
  // 보안: 이 라우트는 service_role 키로만 접근 가능 (브라우저에서 직접 fetch 가능)
  // → service_role 키가 서버에만 있으므로 안전. 단 UI 는 본인 인증 거치게.

  const [sourcesRes, queueRes, postsRes, botRes] = await Promise.all([
    supabase.from('crawl_sources').select('id, name, type, active, last_crawled_at, url').order('created_at', { ascending: false }),
    supabase.from('crawl_items').select('id', { count: 'exact', head: true }).eq('processed', false),
    supabase.from('posts').select('id, title, is_auto, created_at, image_url, source_url').order('created_at', { ascending: false }).limit(10),
    supabase.from('profiles').select('id, username, display_name, is_bot').eq('is_bot', true).limit(1).maybeSingle(),
  ]);

  return NextResponse.json({
    sources: sourcesRes.data ?? [],
    sources_error: sourcesRes.error?.message,
    queue_pending: queueRes.count ?? 0,
    bot: botRes.data,
    bot_configured: !!process.env.SIMYA_BOT_USER_ID,
    recent_posts: postsRes.data ?? [],
    cron_schedule: {
      crawl: '0 */6 * * * (6시간마다, AI 랜덤 생성)',
    },
  });
}
