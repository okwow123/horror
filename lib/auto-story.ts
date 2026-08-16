// AI 자동 이야기: horror_contents 테이블의 subject/content 를 MiniMax 에게 던져서
// "더 무서운, A4 1장 분량의 짜임새 있는" 새 1인칭 공포 단편을 창작하게 한다.
//
// [2026-08-14] 내부 구현을 6차원 변수 시스템 (combo-story) 으로 교체.
// - 기존 few-shot (DB horror_contents 표본) + 자유 LLM 호출 → 49,000+ 조합 + 6차원 강제 변수.
// - DB few-shot 제거, 시스템 프롬프트의 "그날/지금도" 등 어휘 강제 제거 → 반복 패턴 제거.
// - 기존 AutoGenerateResult 시그니처는 호환 유지 (호출자 변경 불필요).

import { chat } from './minimax';
// (2026-08-15) pickRandomImage 제거 — 텍스트가 메인, 이미지는 생성 안 함
import { createServiceClient } from './supabase/server';
import { pickSeedByIndex } from './random-story';
import { rollCombo, generateStoryFromCombo } from './combo-story';

const SYSTEM_PROMPT = `너는 '심야(深夜)' 라는 한국어 공포 이야기 SNS 의 집필자다.

[임무]
- 한국어로 더 무서운, 짜임새 있는 공포 단편을 새로 창작해라. 분량은 A4 용지 1장 정도.
- 참고용 글은 절대 그대로 옮기지 마. 문장/구절/표현을 표절하지 마.
  오직 소재/이미지/분위기만 따와서 완전히 새로운 이야기로 다시 써라.

[필수 분량 / 구조]
- 본문 30문장 이상, 2000~2800자 한국어. (A4 1장 분량)
- 4박자 흐름을 자연스럽게 녹여라. 단, 각 박자를 "단락 제목" 처럼 자르지 말고 한 편의 산문으로 흐르게 써라.
  1) 도입 (8~11문장): 배경·시점·분위기를 천천히 깔아라. 평범한 일상의 한 장면처럼. 짧은 문장만 나열하지 말고 호흡 있는 문장과 묘사문 섞어라.
  2) 균열 (7~10문장): 작은 이상징후가 보이기 시작. 시점 캐릭터도 자기 느낌을 못 믿는 단계. 시점의 내면 독백과 관찰 묘사를 교차시켜라.
  3) 공포 상승 (8~12문장): 정체가 드러나며 공포가 가속. 독자가 숨을 멎을 정도의 한 장면. 감각 묘사 (소리/온도/냄새/시야) 를 적극 활용하라.
  4) 반전 / 여운 (3~5문장): 마지막 1~2줄에 머리에서 안 지워지는 한 줄. 설명 말고 암시.
- "끊어치기" 식 짧은 문장 나열 금지. 같은 길이의 문장만 반복하지 말고 호흡이 다른 문장이 교차하도록.
- 도입은 잔잔하고 호흡 길게, 마지막으로 갈수록 짧고 끊기는 한두 줄로 끝내라.

[톤 / 문체]
- 1인칭 체험담. "나", "그날", "지금도", "그 이후로" 같은 단어 자연스럽게 사용.
- 직접적 잔인 / 선정 묘사 금지. 암시와 여운으로 공포를 만들어라.
- 욕설 / 비속어 금지.
- 절대 출처 / 원문 / 참고 / 메타 언급 금지. 이야기 자체만 출력.

[출력 형식 — 매우 중요]
- 첫 줄: 제목 (한 줄, 30자 이내 권장)
- 둘째 줄: 빈 줄
- 셋째 줄부터: 본문 (30문장 이상, A4 1장 분량, 끝까지 완성)
- 본문 외 어떤 메타/주석/설명도 출력하지 마.`;

const SAMPLE_MAX_CHARS = 600; // 각 표본의 본문 발췌 길이 (한 행당, 토큰 폭발 방지)
const MIN_SENTENCES = 30;     // 결과 검증: 30문장 미만이면 fallback (A4 1장 보장)

interface SampledSource {
  title: string;
  excerpt: string;
}

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function excerpt(text: string, max: number): string {
  const t = (text || '').replace(/\s+/g, ' ').trim();
  if (t.length <= max) return t;
  return t.slice(0, max).replace(/[,.;:!?·…\s]+$/, '') + '…';
}

/** 한국어 문장 수 추정. '?', '!', '.' + 마침표 뒤 공백 기준으로 split. */
export function countSentences(text: string): number {
  if (!text) return 0;
  const t = text.trim();
  // "다." "요." "까?" "네!" 처럼 한국어 종결 + 종결부호 매칭.
  // 마침표/물음표/느낌표 뒤 공백/줄바꿈 으로 split 한 뒤 빈 토큰 제거.
  const parts = t
    .split(/(?<=[.!?。])\s+|\n+/)
    .map(s => s.trim())
    .filter(Boolean);
  // 너무 짧은 토큰(1~2글자) 은 단편/제목으로 보고 카운트에서 제외
  const real = parts.filter(p => p.length >= 3);
  return real.length || parts.length;
}

/**
 * horror_contents (1순위) → crawl_items (2순위) → posts (3순위) 순으로 랜덤 표본 추출.
 * 셋 다 비어 있으면 빈 sources 리턴 (AI 가 컨셉만으로 생성).
 */
async function sampleLearningSources(): Promise<{
  sources: SampledSource[];
  total_available: number;
}> {
  const supabase = createServiceClient();

  // horror_contents 테이블 전부 가져온다. created_at 같은 정렬 컬럼이 없으므로
  // order 없이 가져온 뒤 shuffle 로 섞어서 LLM 이 패턴을 학습하지 않게 한다.
  // 페이지네이션으로 한 번에 다 못 가져오는 경우를 대비해 1000개 단위로 반복.
  const allRows: Array<{ subject: string | null; content: string }> = [];
  const PAGE = 1000;
  let from = 0;
  // 안전장치: 무한 루프 방지. 한 번에 최대 5000 행까지만.
  for (let guard = 0; guard < 10; guard++) {
    const { data, error } = await supabase
      .from('horror_contents')
      .select('subject, content')
      .not('content', 'is', null)
      .range(from, from + PAGE - 1);

    if (error) {
      console.warn('[auto-story] horror_contents select failed:', error.message);
      break;
    }
    if (!data || data.length === 0) break;
    allRows.push(...(data as Array<{ subject: string | null; content: string }>));
    if (data.length < PAGE) break;
    from += PAGE;
  }

  const hcPool: SampledSource[] = allRows
    .filter(r => (r.content || '').length > 80)
    .map(r => ({
      title: r.subject || '(제목 없음)',
      excerpt: excerpt(r.content, SAMPLE_MAX_CHARS),
    }));

  // 전부 shuffle 해서 LLM 에게 그대로 전달. 행은 하나도 빠뜨리지 않는다.
  const sources = shuffle(hcPool);

  return { sources, total_available: hcPool.length };
}

export interface AutoGenerateResult {
  title: string;
  content: string;
  used_fallback: boolean;
  sources: {
    origin: 'horror_contents';
    sample_count: number;
    total_available: number;
    column: 'subject' | 'unknown';
    sentence_count: number;
  };
  concept: { place: string; setup: string; twist: string; tone: string };
}

/** AI 자동 이야기 한 편 생성. — 6차원 변수 시스템 (combo-story) 위임 */
export async function generateAutoStory(): Promise<AutoGenerateResult> {
  const combo = rollCombo();
  const concept: { place: string; setup: string; twist: string; tone: string } = {
    place: combo.setting.name,
    setup: `${combo.protagonist.name} / ${combo.fear.name} / ${combo.trigger.name}`,
    twist: combo.ending.name,
    tone: combo.level.name,
  };

  try {
    const story = await generateStoryFromCombo(combo, 'full');
    if (!story.title || !story.caption) {
      console.warn('[auto-story -> combo] empty result, fallback. combo=', combo.code);
      return {
        ...fallbackAutoStory(concept),
        used_fallback: true,
        sources: {
          origin: 'horror_contents',
          sample_count: 0,
          total_available: 0,
          column: 'unknown',
          sentence_count: 0,
        },
        concept,
      };
    }
    return {
      title: story.title,
      content: story.caption,
      used_fallback: false,
      sources: {
        origin: 'horror_contents',
        sample_count: 0,
        total_available: 0,
        column: 'unknown',
        sentence_count: 0,
      },
      concept,
    };
  } catch (e) {
    console.error('[auto-story -> combo] failed:', e);
    return {
      ...fallbackAutoStory(concept),
      used_fallback: true,
      sources: {
        origin: 'horror_contents',
        sample_count: 0,
        total_available: 0,
        column: 'unknown',
        sentence_count: 0,
      },
      concept,
    };
  }
}

function splitTitleAndBody(raw: string): { title: string; content: string } {
  const cleaned = raw.replace(/^```[a-z]*\n?/i, '').replace(/```\s*$/i, '').trim();
  const lines = cleaned.split('\n');
  let title = '';
  let body = cleaned;
  if (lines.length > 1) {
    title = lines[0].replace(/^#+\s*/, '').replace(/^["']|["']$/g, '').trim();
    body = lines.slice(1).join('\n').trim();
  }
  if (!title) title = body.split('\n')[0].slice(0, 40);
  if (!body) body = cleaned;
  return { title, content: body };
}

function fallbackAutoStory(
  concept: { place: string; setup: string; twist: string; tone: string },
  observedSentences = 0,
): {
  title: string;
  content: string;
} {
  // A4 1장 / 30문장+ 분량 보장. 4박자 모두 풍성하게 채운다.
  const title = `${concept.place}에서`;
  const content = [
    // 도입 (8~11문장)
    `그날, 나는 ${concept.place}에 있었다.`,
    `평범한 평일 저녁이었을 거다. 하늘은 흐렸고, 바람은 없었다.`,
    `주변 소리는 평소와 다를 게 없었고, 사람들도 평소처럼 움직이고 있었다.`,
    `나는 그저 그 장면을 눈에 담아두며 천천히 걸어 내려갔다.`,
    `손끝이 조금 차가웠다. 목 뒤에 얇은 땀이 한 줄 흘렀다.`,
    `그게 왜 기억나는지는 아직도 잘 모르겠다.`,
    `걸을수록 발소리가 유독 크게 들렸다. 마치 누가 내 발걸음을 세고 있는 것처럼.`,
    `나는 핸드폰을 꺼내 시간을 봤다. 시계는 멈춰 있었다.`,
    ``,
    // 균열 (7~10문장)
    `이상한 것은, 발걸음을 옮길수록 시작됐다.`,
    `먼저, 공기. 누가 누군가를 오래 쳐다본 뒤의 그 짙은 정적 같은 것이었다.`,
    `${concept.setup}.`,
    `나는 처음엔 그게 내 기분 탓이라고 생각했다.`,
    `하지만 같은 자리에서, 같은 방향을 보고 있는 사람이, 나 말고 또 있었다.`,
    `그 사람은, 나를 보고 있지 않았다.`,
    `내 뒤에 있는 무언가를 보고 있었다.`,
    `그의 표정에는 두려움이 아니었다. 오히려 익숙한 체념이 있었다.`,
    `그 표정을 보는 순간, 발이 멈췄다.`,
    ``,
    // 공포 상승 (8~12문장)
    `돌아보지 않았다. 아니, 돌아볼 수 없었다.`,
    `그 순간, 등줄기에서 소름이 올라왔다.`,
    `그 사람의 얼굴이, 이쪽을 천천히 돌리기 시작했다.`,
    `천천히, 너무 천천히. 마치 내가 무너지기를 기다리듯.`,
    `귓가에 낮은 속삭임 같은 것이 스쳤다. 내 이름이었다. 그런데 내 이름이 아니었다.`,
    `${concept.twist}.`,
    `나는 그제야 한 발짝을 내디뎠다. 두 발짝. 세 발짝.`,
    `심장이 갈비뼈를 두드렸다. 숨을 쉴 때마다 차가운 공기가 폐를 찔렀다.`,
    `공기가 무거웠다. 마치 물속을 걷는 것 같았다.`,
    `뒤에서 발소리가 하나 더 들렸다. 내 발소리보다 반 박자 빠르게.`,
    `그 발소리는 내가 멈추면 같이 멈췄다.`,
    `등 뒤의 무언가가 나를 따라오고 있다는 사실을, 그제야 확실히 알았다.`,
    ``,
    // 반전 / 여운 (3~5문장)
    `그 이후로 그 자리에 다시 가게 된 적은 없다.`,
    `다만, 가끔 새벽, 누군가 내 귀에 대고 아주 낮게 한 마디를 한다.`,
    `같은 자리에서, 같은 시간에, 다시 와.`,
    `내 대답은 항상 같다. 조용히, 문을 닫는다.`,
    `그런데 오늘도, 닫힌 문 너머에서 발소리가 들린다.`,
  ].join('\n');
  if (observedSentences > 0 && countSentences(content) < MIN_SENTENCES) {
    console.warn(`[auto-story] fallback template also short: ${countSentences(content)} sentences`);
  }
  return { title, content };
}
