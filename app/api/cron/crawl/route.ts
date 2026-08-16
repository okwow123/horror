import { NextResponse, type NextRequest } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { crawlSource } from '@/lib/crawler';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Vercel Hobby 60s

// Vercel Cron 은 GET 으로 호출. 보호: Authorization: Bearer <CRON_SECRET> 또는 ?secret=
function checkAuth(req: NextRequest) {
  const expected = process.env.CRON_SECRET;
  if (!expected) return true; // dev 환경
  const auth = req.headers.get('authorization');
  if (auth === `Bearer ${expected}`) return true;
  const url = new URL(req.url);
  if (url.searchParams.get('secret') === expected) return true;
  return false;
}

export async function GET(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const supabase = createServiceClient();
  const { data: sources, error } = await supabase
    .from('crawl_sources')
    .select('*')
    .eq('active', true);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const summary: Array<{ source: string; fetched: number; saved: number }> = [];
  for (const source of sources ?? []) {
    const stories = await crawlSource(source);
    let saved = 0;
    for (const s of stories) {
      // 중복 방지: 같은 source 의 같은 url 은 무시
      if (s.url) {
        const { data: dup } = await supabase
          .from('crawl_items')
          .select('id')
          .eq('source_id', source.id)
          .eq('raw_url', s.url)
          .maybeSingle();
        if (dup) continue;
      }
      const { error: insErr } = await supabase.from('crawl_items').insert({
        source_id: source.id,
        raw_title: s.title.slice(0, 500),
        raw_content: s.content.slice(0, 8000),
        raw_url: s.url,
        language: s.language,
      });
      if (!insErr) saved++;
    }
    await supabase
      .from('crawl_sources')
      .update({ last_crawled_at: new Date().toISOString() })
      .eq('id', source.id);
    summary.push({ source: source.name, fetched: stories.length, saved });
  }

  return NextResponse.json({ ok: true, summary });
}
