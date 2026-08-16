import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { generateStoryFromCards, type CardAnswers } from '@/lib/story';
import { pickRandomImage } from '@/lib/images';

// AI 가 이야기만 생성 (저장 X). 사용자가 미리보기 보고 이미지 선택 후 게시.
// - AI 실패시 자동 fallback 으로 진행 (used_fallback=true 표시)
// - API key 미설정도 fallback 으로 처리 (UI 가 사용자에게 알림)

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: '로그인이 필요해요' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const answers = (body?.answers ?? {}) as CardAnswers;
  if (!answers || typeof answers !== 'object') {
    return NextResponse.json({ error: '잘못된 요청' }, { status: 400 });
  }

  const story = await generateStoryFromCards(answers);
  const seedKey = JSON.stringify(answers);
  const recommended = pickRandomImage(seedKey);

  return NextResponse.json({
    title: story.title,
    content: story.content,
    used_fallback: story.usedFallback,
    recommended_image: recommended,
    ai_configured: !!process.env.MINIMAX_API_KEY,
  });
}
