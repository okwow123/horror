import { chat } from './minimax';

const SYSTEM_PROMPT = `너는 '심야(深夜)'라는 공포 이야기 SNS 의 집필자다.
- 너의 임무는 한국어로 짧고 임팩트 있는 공포 단편을 쓰는 것.
- 분량: 600~1200자 한국어.
- 톤: 잔잔한 도입 → 점진적 공포 상승 → 마지막에 소름 돋는 한 줄 반전/여운.
- 1인칭, 체험담 형식. "나", "그날", "지금도" 같은 단어 자연스럽게 사용.
- 직접적 잔인/선정 묘사 금지, 암시와 여운으로 공포를 만들어라.
- 절대 출처/메타 언급 금지, 이야기 자체만 출력.
- 제목은 첫 줄에 한 줄로, 그 다음 빈 줄, 본문 시작.`;

export interface CardAnswers {
  seen_ghost?: string;
  where?: string;
  where_text?: string;
  alone?: string;
  time?: string;
  feel?: string;
  /** 마지막 자유 텍스트 — 비어 있어도 OK. 있으면 AI 가 그 디테일을 살려서 풍성하게 써줌. */
  tell_free?: string;
}

const WHERE_LABEL: Record<string, string> = {
  water: '물가(강/바다/호수)',
  school: '학교',
  office: '회사/직장',
  home: '집/집 근처',
  hospital: '병원',
  road: '도로/골목',
  other: '기타',
};

const TIME_LABEL: Record<string, string> = {
  dawn: '새벽',
  night: '밤',
  evening: '저녁',
  day: '낮',
};

const FEEL_LABEL: Record<string, string> = {
  fear: '그냥 무서웠다',
  chills: '등줄기에 소름이 돋았다',
  void: '허무했다',
  anger: '화가 났다',
  paralysis: '몸이 안 움직였다',
};

function whereText(a: CardAnswers): string {
  if (a.where === 'other') return a.where_text || '어딘가';
  return WHERE_LABEL[a.where || ''] || '어딘가';
}

export class StoryGenError extends Error {
  cause?: string;
  constructor(message: string, cause?: string) {
    super(message);
    this.cause = cause;
  }
}

export async function generateStoryFromCards(answers: CardAnswers): Promise<{
  title: string;
  content: string;
  usedFallback: boolean;
}> {
  const where = whereText(answers);
  const freeTell = (answers.tell_free || '').trim();

  const userPrompt = `다음 답변을 바탕으로 공포 단편을 써줘.

- 귀신/정체모를 존재를 본 적 있나: ${answers.seen_ghost === 'yes' ? '예' : '아니오 (본 적 없지만 묘사)'}
- 장소: ${where}
- 혼자였나: ${answers.alone === 'yes' ? '예' : '아니오'}
- 시간대: ${TIME_LABEL[answers.time || ''] || '밤'}
- 기분: ${FEEL_LABEL[answers.feel || ''] || '무서웠다'}
- 사용자가 풀어준 썰 (선택, 비어있으면 무시): ${freeTell ? `\n"""\n${freeTell}\n"""` : '(없음)'}

조건:
- '예/아니오' 답변은 답변자의 실제 경험처럼 1인칭으로 쓰되, 사실이 아닌 창작임을 잊지 마.
- 사용자가 풀어준 썰이 있으면 그 디테일/감정/이미지를 자연스럽게 살려서 풍성하게 써줘.
  (그대로 옮기지 말고, 이야기의 일부로 녹여서.)
- 마지막 한두 줄이 머리에 남는 결말.
- 욕설/노골적 잔인/성적 묘사 금지.
- 응답은 정확히 다음 형식:
  - 첫 줄: 제목 (한 줄)
  - 둘째 줄: 빈 줄
  - 셋째 줄부터: 본문

매우 중요: 반드시 제목 + 본문 둘 다 출력해. 빈 응답 금지.`;

  let text = '';
  try {
    text = await chat(
      [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      { temperature: 0.95, maxTokens: 1400 },
    );
  } catch (e) {
    console.error('[story] AI chat failed:', e);
    // 폴백으로 계속 — UI 에 used_fallback 노출
    const fallback = generateFallbackStory(answers);
    return { ...fallback, usedFallback: true };
  }

  if (!text || text.trim().length < 20) {
    console.warn('[story] AI returned empty/short text, fallback. length=', text?.length);
    const fallback = generateFallbackStory(answers);
    return { ...fallback, usedFallback: true };
  }

  const parsed = splitTitleAndBody(text);
  if (!parsed.title || !parsed.content) {
    console.warn('[story] split failed, fallback. raw head=', text.slice(0, 100));
    const fallback = generateFallbackStory(answers);
    return { ...fallback, usedFallback: true };
  }
  return { ...parsed, usedFallback: false };
}

export async function rewriteCrawledStory(opts: {
  rawTitle: string;
  rawContent: string;
  language: 'ko' | 'en';
}): Promise<{ title: string; content: string; usedFallback: boolean }> {
  const sys = `${SYSTEM_PROMPT}
- 입력은 영문/혼합 가능성이 높다. 무조건 자연스러운 한국어로 다시 쓴다.
- 원문의 핵심 소재/반전은 유지하되, 표현은 완전히 새로 만들어라.
- 표절처럼 보이지 않게 어구/문장 구조를 바꿔라.`;

  const user = `다음 소재를 한국어 공포 단편으로 다시 써줘.

[원문 제목]
${opts.rawTitle || '(제목 없음)'}

[원문 본문]
${opts.rawContent.slice(0, 4000)}

조건:
- 600~1200자 한국어
- 1인칭, 체험담 톤
- 출처/원문 언급 금지
- 첫 줄 = 제목, 빈 줄, 본문`;

  let text = '';
  try {
    text = await chat(
      [
        { role: 'system', content: sys },
        { role: 'user', content: user },
      ],
      { temperature: 0.95, maxTokens: 1400 },
    );
  } catch (e) {
    console.error('[story/rewrite] AI chat failed:', e);
    return { ...buildFallbackFromRaw(opts), usedFallback: true };
  }

  if (!text || text.trim().length < 20) {
    console.warn('[story/rewrite] AI returned empty/short text, fallback. length=', text?.length);
    return { ...buildFallbackFromRaw(opts), usedFallback: true };
  }

  const parsed = splitTitleAndBody(text);
  if (!parsed.title || !parsed.content) {
    console.warn('[story/rewrite] split failed, fallback. raw head=', text.slice(0, 100));
    return { ...buildFallbackFromRaw(opts), usedFallback: true };
  }
  return { ...parsed, usedFallback: false };
}

// AI 죽었을 때 — 원문을 한국어로 살짝 다듬어서라도 일단 게시되게.
// 절대 빈 포스트가 feed 에 안 뜨도록.
function buildFallbackFromRaw(opts: {
  rawTitle: string;
  rawContent: string;
  language: 'ko' | 'en';
}): { title: string; content: string } {
  const rawTitle = (opts.rawTitle || '(이름 모를 이야기)').trim();
  const rawBody = (opts.rawContent || '').trim();

  // 원문이 이미 한국어면 그대로 제목 + 본문 발췌
  // 영문이면 (영문) 표시 + 첫 ~700자 발췌 (저작권 보호 + 일단 무언가 보임)
  const isKorean = /[가-힣]/.test(rawBody);
  const snippet = rawBody.slice(0, 800).replace(/\s{3,}/g, '\n\n').trim();

  const title = rawTitle.length > 60 ? rawTitle.slice(0, 60) + '…' : rawTitle;

  let content: string;
  if (isKorean) {
    content = snippet + (rawBody.length > 800 ? '\n\n…' : '');
  } else {
    // 영문 원문은 그대로 노출 (AI 리라이팅 실패 명시)
    content = `(AI 리라이팅 일시 중단 — 영문 원문 발췌)\n\n${snippet}${rawBody.length > 800 ? '\n\n…' : ''}`;
  }
  return { title, content };
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

// ----- Fallback: AI 가 죽었을 때 카드 답변만으로 최소한의 이야기 생성 -----
function generateFallbackStory(answers: CardAnswers): { title: string; content: string } {
  const where = whereText(answers);
  const time = TIME_LABEL[answers.time || ''] || '밤';
  const feel = FEEL_LABEL[answers.feel || ''] || '무서웠다';
  const alone = answers.alone === 'yes' ? '혼자였다' : '누군가와 함께였다';
  const seen = answers.seen_ghost === 'yes' ? '분명히 봤다' : '본 건지 아닌 건지 아직도 모르겠다';

  const title = `${where}에서 ${time}의 기억`;
  const content = [
    `그날, 나는 ${where}에서 ${alone}.`,
    `시간은 ${time}. 그때 ${feel}.`,
    `무언가가 ${seen}.`,
    ``,
    `말해도 믿지 않겠지.`,
    `지금도 가끔 그 자리에 가면, 공기가 달라진 게 느껴진다.`,
    `이번에도, 그때처럼, ${where}에서 본 것은…`,
    `아무도 보지 못한 모양이다.`,
    `아니, 아무도 보지 못한 게 아니라,`,
    `모두가 본 걸 모른 척 하는 것인지도.`,
    ``,
    `나는 그 이후로 그 시간대에는 ${where}에 가지 않는다.`,
    `그리고, 누가 그 이야기를 꺼내면,`,
    `나는 그냥 웃는다.`,
    `${feel}는, 그때만으로 충분하니까.`,
  ].join('\n');
  return { title, content };
}
