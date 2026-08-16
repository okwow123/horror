// Vercel Cron 라우트: AI 가 컨셉 풀에서 무작위로 무서운 이야기를 새로 지어서 봇 유저로 자동 게시.
// 크롤링 없이 매번 다른 컨셉. 1회 = 1편.
//
// [2026-08-15] 이미지 생성 제거. 텍스트만 게시. (인스타 피드는 글이 메인)

import { NextResponse, type NextRequest } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { generateRandomHorrorStory } from '@/lib/random-story';

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

  if (!botId) {
    return NextResponse.json({ ok: false, error: 'SIMYA_BOT_USER_ID 미설정' }, { status: 500 });
  }

  // 한 번 호출에 1~2편 생성
  const count = Math.min(Math.max(Number(new URL(req.url).searchParams.get('count') || '1'), 1), 3);
  const results: unknown[] = [];

  for (let i = 0; i < count; i++) {
    try {
      const story = await generateRandomHorrorStory();

      if (!story.title || !story.content) {
        results.push({ error: '빈 title/content — skip', concept: story.concept });
        continue;
      }

      const { data: ins, error: insErr } = await supabase.from('posts').insert({
        user_id: botId,
        title: story.title,
        content: story.content,
        image_url: null,  // 텍스트만. 인스타용 이미지 매핑은 별도 단계.
        is_auto: true,
        source_url: null,
      }).select('id').single();

      if (insErr) {
        results.push({ error: insErr.message, concept: story.concept });
        continue;
      }

      results.push({
        post_id: ins.id,
        title: story.title,
        used_fallback: story.usedFallback,
        concept: { place: story.concept.place, setup: story.concept.setup },
        content_len: story.content.length,
      });
    } catch (e) {
      results.push({ error: String(e) });
    }
  }

  return NextResponse.json({ ok: true, posted: results.filter(r => 'post_id' in (r as any)).length, results });
}
