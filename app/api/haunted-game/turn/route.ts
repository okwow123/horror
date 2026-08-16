// 흉가 게임 — LLM 동적 노드 생성 API.
// 7단계까지 진행. 매번 LLM이 묘사 + 선택지를 생성.

import { NextResponse, type NextRequest } from 'next/server';
import { chat } from '@/lib/minimax';
import {
  SYSTEM_PROMPT, buildUserPrompt, buildFirstUserPrompt,
  NODE_TITLES, type HauntedNode, type HauntedChoice, type EndingType,
} from '@/lib/haunted-game/prompts';
import type { AmbientType } from '@/lib/audio/ambient';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

interface TurnRequest {
  turnNumber: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;
  history: Array<{ node: number; choice: string; choiceText: string }>;
  choiceText: string | null;  // turnNumber 0 일 때는 null
}

const VALID_AMBIENTS: AmbientType[] = ['rain', 'wind', 'footsteps', 'heartbeat', 'breath', 'door', 'silence'];
const VALID_INTENTS: HauntedChoice['intent'][] = ['cautious', 'bold', 'flee', 'observe', 'engage'];
const VALID_ENDINGS: EndingType[] = ['good', 'bad', 'cryptic', 'rescue'];

function clampTurn(n: number): 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 {
  const i = Math.max(0, Math.min(7, Math.floor(n)));
  return i as 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;
}

function normalizeNode(raw: any, fallbackTurn: number): HauntedNode | null {
  if (!raw || typeof raw !== 'object') return null;

  const text = String(raw.text ?? '').trim();
  if (!text) return null;

  const isEnding = raw.isEnding === true || fallbackTurn >= 7;

  const choicesRaw = Array.isArray(raw.choices) ? raw.choices : [];
  const choices: HauntedChoice[] = isEnding
    ? []
    : choicesRaw.slice(0, 3).map((c: any) => ({
        text: String(c?.text ?? '...').trim().slice(0, 100) || '...',
        intent: VALID_INTENTS.includes(c?.intent) ? c.intent : 'observe',
      }));

  if (!isEnding && choices.length < 3) {
    // 선택지가 부족하면 보충
    while (choices.length < 3) {
      choices.push({ text: '주변을 살핀다', intent: 'observe' });
    }
  }

  const ambient: AmbientType = VALID_AMBIENTS.includes(raw.ambient) ? raw.ambient : 'silence';

  const endingType: EndingType | undefined = isEnding && VALID_ENDINGS.includes(raw.endingType) ? raw.endingType : undefined;

  return {
    text: text.slice(0, 500),
    choices,
    isEnding,
    endingType,
    ambient,
    turnNumber: fallbackTurn,
  };
}

function fallbackNode(turnNumber: number, choiceText?: string): HauntedNode {
  const isEnding = turnNumber >= 7;
  return {
    text: isEnding
      ? '한옥이 다시 잠잠해졌다. 문득, 네가 여기 있었던 게 맞는지 헷갈리기 시작한다.'
      : `${NODE_TITLES[turnNumber] ?? '어딘가'}에 섰다. ${choiceText ? '"' + choiceText + '" — 그 선택의 끝에서.' : ''}달빛이 비스듬히 떨어지고, 어둠 속에서 무언가 숨 쉬는 소리가 들린다.`,
    choices: isEnding ? [] : [
      { text: '조용히 기다린다', intent: 'cautious' },
      { text: '앞으로 나아간다', intent: 'bold' },
      { text: '뒤로 돌아간다', intent: 'flee' },
    ],
    isEnding,
    endingType: isEnding ? 'cryptic' : undefined,
    ambient: 'silence',
    turnNumber,
  };
}

export async function POST(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as TurnRequest | null;
  if (!body) {
    return NextResponse.json({ error: '잘못된 요청' }, { status: 400 });
  }

  const turn = clampTurn(Number(body.turnNumber ?? 0));
  const history = Array.isArray(body.history) ? body.history : [];
  const choiceText = body.choiceText ?? null;

  // 첫 시작 (turn === 0) 만 choiceText 없어도 OK
  if (turn > 0 && !choiceText) {
    return NextResponse.json({ error: 'choiceText 필수' }, { status: 400 });
  }

  // LLM 호출
  const userPrompt = turn === 0
    ? buildFirstUserPrompt()
    : buildUserPrompt({ turnNumber: turn, history, choiceText: choiceText! });

  let node: HauntedNode | null = null;

  try {
    const raw = await chat(
      [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      {
        temperature: 0.95,
        maxTokens: 4000,
        jsonMode: true,
      },
    );

    // JSON 파싱 (마크다운 펜스 등 제거)
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
    try {
      const parsed = JSON.parse(cleaned);
      node = normalizeNode(parsed, turn);
    } catch {
      // JSON 파싱 실패 → 원문에서 { ... } 추출 시도
      const m = cleaned.match(/\{[\s\S]*\}/);
      if (m) {
        try {
          node = normalizeNode(JSON.parse(m[0]), turn);
        } catch {}
      }
    }
  } catch (e) {
    console.error('[haunted-game] LLM call failed:', e);
  }

  if (!node) {
    console.warn('[haunted-game] using fallback for turn', turn);
    node = fallbackNode(turn, choiceText ?? undefined);
  }

  return NextResponse.json({ node });
}
