import { NextResponse, type NextRequest } from 'next/server';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { crawlSource } from '@/lib/crawler';
import { rewriteCrawledStory } from '@/lib/story';
import { generateRandomHorrorStory } from '@/lib/random-story';
import { pickRandomImage } from '@/lib/images';

// 수동 트리거 — 단계 조합 가능:
//   steps=generate    : AI 가 컨셉 풀에서 무서운 이야기를 새로 지어서 즉시 게시 (1편)
//   steps=generate,3  : 3편 한꺼번에
//   steps=crawl       : 소스 크롤만 (큐 적재)
//   steps=post        : 큐에서 꺼내 리라이팅 후 게시
//   steps=crawl,post  : 풀 크롤 사이클
//
// 인증 (둘 중 하나):
//   - CRON_SECRET (Vercel Cron, curl, 외부 호출)
//   - 로그인된 세션 (admin UI 의 fetch)

async function checkAuth(req: NextRequest) {
  const expected = process.env.CRON_SECRET;
  if (expected) {
    const auth = req.headers.get('authorization');
    if (auth === `Bearer ${expected}`) return true;
    const url = new URL(req.url);
    if (url.searchParams.get('secret') === expected) return true;
  }
  try {
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

  const url = new URL(req.url);
  const stepsParam = url.searchParams.get('steps') || 'generate';
  const steps = new Set(stepsParam.split(',').map(s => s.trim()).filter(Boolean));
  const result: Record<string, unknown> = { ok: true };

  const supabase = createServiceClient();
  const botId = process.env.SIMYA_BOT_USER_ID;

  // ----- generate: AI 가 컨셉 풀에서 무서운 이야기를 새로 지음 (즉시 게시) -----
  if (steps.has('generate')) {
    if (!botId) {
      result.generate = { skipped: true, reason: 'SIMYA_BOT_USER_ID 미설정' };
    } else {
      const count = Math.min(
        Math.max(Number(url.searchParams.get('count') || '1'), 1),
        5,
      );
      const generated: unknown[] = [];
      for (let i = 0; i < count; i++) {
        try {
          const story = await generateRandomHorrorStory();
          if (!story.title || !story.content) {
            generated.push({ error: '빈 title/content', concept: story.concept });
            continue;
          }
          // [2026-08-15] 텍스트만. 이미지 없음.
          const { data: ins, error: insErr } = await supabase.from('posts').insert({
            user_id: botId,
            title: story.title,
            content: story.content,
            image_url: null,
            is_auto: true,
            source_url: null,
          }).select('id').single();
          if (insErr) {
            generated.push({ error: insErr.message, concept: story.concept });
            continue;
          }
          generated.push({
            post_id: ins.id,
            title: story.title,
            used_fallback: story.usedFallback,
            concept: { place: story.concept.place, setup: story.concept.setup },
            content_len: story.content.length,
          });
        } catch (e) {
          generated.push({ error: String(e) });
        }
      }
      result.generate = generated;
    }
  }

  // ----- crawl: 소스에서 원문 긁어와서 큐(crawl_items)에 적재 -----
  if (steps.has('crawl')) {
    const { data: sources } = await supabase
      .from('crawl_sources')
      .select('*')
      .eq('active', true);

    const crawlSummary: Array<{ source: string; fetched: number; saved: number; error?: string }> = [];
    for (const source of sources ?? []) {
      try {
        const stories = await crawlSource(source);
        let saved = 0;
        for (const s of stories) {
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
        crawlSummary.push({ source: source.name, fetched: stories.length, saved });
      } catch (e) {
        crawlSummary.push({ source: source.name, fetched: 0, saved: 0, error: String(e) });
      }
    }
    result.crawl = crawlSummary;
  }

  // ----- post: 큐에서 1개 꺼내 AI 리라이팅 후 게시 -----
  if (steps.has('post')) {
    if (!botId) {
      result.post = { skipped: true, reason: 'SIMYA_BOT_USER_ID 미설정' };
    } else {
      const { data: items } = await supabase
        .from('crawl_items')
        .select('id, raw_title, raw_content, raw_url, language')
        .eq('processed', false)
        .order('created_at', { ascending: true })
        .limit(1);

      if (!items || items.length === 0) {
        result.post = { skipped: true, reason: '처리할 항목 없음 (먼저 crawl 실행)' };
      } else {
        const posted: unknown[] = [];
        for (const item of items) {
          try {
            const { title, content, usedFallback } = await rewriteCrawledStory({
              rawTitle: item.raw_title || '',
              rawContent: item.raw_content,
              language: item.language === 'en' ? 'en' : 'ko',
            });
            if (!title || !content) {
              posted.push({ item_id: item.id, error: 'title/content 비어있음 — skip' });
              continue;
            }
            const image = pickRandomImage(item.raw_url || item.id);
            const { data: ins, error: insErr } = await supabase.from('posts').insert({
              user_id: botId,
              title,
              content,
              image_url: image.url,
              source_url: item.raw_url,
              is_auto: true,
            }).select('id').single();
            if (insErr) {
              posted.push({ item_id: item.id, error: insErr.message });
              continue;
            }
            await supabase
              .from('crawl_items')
              .update({ processed: true, used_at: new Date().toISOString() })
              .eq('id', item.id);
            posted.push({
              item_id: item.id,
              post_id: ins.id,
              title,
              used_fallback: usedFallback,
              content_len: content.length,
            });
          } catch (e) {
            posted.push({ item_id: item.id, error: String(e) });
          }
        }
        result.post = posted;
      }
    }
  }

  return NextResponse.json(result);
}
