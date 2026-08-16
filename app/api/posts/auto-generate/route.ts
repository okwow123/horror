// AI 자동 이야기 생성 API.
// [2026-08-16] 로그인 제거. 누구나 호출 가능.
// MiniMax 에게 1인칭 공포 단편 한 편을 새로 만들어 반환.
// 게시는 하지 않음 (미리보기 단계).

import { NextResponse, type NextRequest } from 'next/server';
import { generateAutoStory } from '@/lib/auto-story';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(_request: NextRequest) {
  try {
    const result = await generateAutoStory();
    return NextResponse.json({
      title: result.title,
      content: result.content,
      used_fallback: result.used_fallback,
      sources: result.sources,
      concept: result.concept,
      ai_configured: !!process.env.MINIMAX_API_KEY,
    });
  } catch (e) {
    console.error('[auto-generate] error:', e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : '알 수 없는 오류' },
      { status: 500 },
    );
  }
}
