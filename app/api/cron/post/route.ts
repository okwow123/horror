import { NextResponse, type NextRequest } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { rewriteCrawledStory } from '@/lib/story';
import { pickRandomImage } from '@/lib/images';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function checkAuth(req: NextRequest) {
  const expected = process.env.CRON_SECRET;
  if (!expected) return true;
  const auth = req.headers.get('authorization');
  if (auth === `Bearer ${expected}`) return true;
  const url = new URL(req.url);
  if (url.searchParams.get('secret') === expected) return true;
  return false;
}

export async function GET(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const supabase = createServiceClient();
  const botId = process.env.SIMYA_BOT_USER_ID;

  const { data: items, error: itemsErr } = await supabase
    .from('crawl_items')
    .select('id, raw_title, raw_content, raw_url, language, source_id')
    .eq('processed', false)
    .order('created_at', { ascending: true })
    .limit(2);

  if (itemsErr) return NextResponse.json({ error: itemsErr.message }, { status: 500 });
  if (!items || items.length === 0) {
    return NextResponse.json({ ok: true, message: '처리할 항목이 없음', posted: 0 });
  }

  if (!botId) {
    console.warn('[cron/post] SIMYA_BOT_USER_ID not set, skipping insert');
    return NextResponse.json({ ok: true, message: '봇 유저 미설정', posted: 0 });
  }

  let posted = 0;
  for (const item of items) {
    try {
      const { title, content, usedFallback } = await rewriteCrawledStory({
        rawTitle: item.raw_title || '',
        rawContent: item.raw_content,
        language: item.language === 'en' ? 'en' : 'ko',
      });

      if (!title || !content) {
        console.warn('[cron/post] empty title/content, skip. item=', item.id);
        continue;
      }

      // 결정적 이미지 선택 (raw_url 해시 → 같은 글 재게시 시 같은 이미지)
      const image = pickRandomImage(item.raw_url || item.id);

      const { error: insErr } = await supabase.from('posts').insert({
        user_id: botId,
        title,
        content,
        image_url: image.url,
        source_url: item.raw_url || null,
        is_auto: true,
      });
      if (insErr) {
        console.error('[cron/post] insert error', insErr);
        continue;
      }
      await supabase
        .from('crawl_items')
        .update({ processed: true, used_at: new Date().toISOString() })
        .eq('id', item.id);
      posted++;
      console.log(`[cron/post] posted item=${item.id} used_fallback=${usedFallback} content_len=${content.length}`);
    } catch (e) {
      console.error('[cron/post] rewrite/insert failed', item.id, e);
    }
  }

  return NextResponse.json({ ok: true, posted });
}
