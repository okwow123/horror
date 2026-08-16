// 6차원 변수 시스템 (prompts/_variables.md 기반) + LLM 호출.
// 인스타 캡션 모드와 본문 모드를 둘 다 지원.
// prompts/_*.md 의 정의가 변경되면 여기 인터페이스도 같이 업데이트할 것.

import { chat } from './minimax';
// 이미지는 생성하지 않음. 인스타 피드는 글이 메인.
// (2026-08-15 변경: Unsplash horror 이미지 매칭 로직 제거)

// ============================================================================
// 6차원 변수 정의
// ============================================================================

export interface SettingItem {
  code: string;     // 'A' ~ 'J'
  name: string;     // '폐교'
  desc: string;     // 짧은 디스크립션
  moods: string[];  // 이미지 매칭용 키워드
}

export interface ProtagonistItem {
  code: string;     // 'A' ~ 'G'
  name: string;     // '야간근무자'
  voice: string;    // 1인칭 화자 톤 가이드
  desc: string;
}

export interface FearItem {
  code: string;     // 'A' ~ 'J'
  name: string;     // '귀신'
  desc: string;
}

export interface TriggerItem {
  code: string;     // 'A' ~ 'J'
  name: string;     // '전화'
  desc: string;
}

export interface EndingItem {
  code: string;     // 'A' ~ 'G'
  name: string;     // '반전'
  desc: string;
}

export interface LevelItem {
  code: string;     // 'L1' ~ 'L5'
  name: string;     // '불안'
  desc: string;
  minChars: number; // 본문 모드 분량 하한
  maxChars: number; // 본문 모드 분량 상한
}

export const SETTINGS: SettingItem[] = [
  { code: 'A', name: '폐교',       desc: '폐쇄된 학교, 운동장, 3층 이상 금지',     moods: ['abandoned', 'house'] },
  { code: 'B', name: '군부대',     desc: '훈련소, 통제구역, 보초 교대',             moods: ['night', 'tunnel'] },
  { code: 'C', name: '모텔',       desc: '6인실, 복도, 13번방',                    moods: ['house', 'candle'] },
  { code: 'D', name: '지하철',     desc: '막차, 마지막 칸, 정거장',                moods: ['tunnel', 'night'] },
  { code: 'E', name: '아파트',     desc: '엘리베이터, 복도, 14층',                 moods: ['house', 'night'] },
  { code: 'F', name: '병원',       desc: '응급실, 5층, 봉인된 문',                 moods: ['abandoned', 'tunnel'] },
  { code: 'G', name: '산속',       desc: '등산로, 안개, 분실',                     moods: ['forest', 'fog'] },
  { code: 'H', name: '바닷가',     desc: '해안 마을, 어선, 횟불',                  moods: ['fog', 'night'] },
  { code: 'I', name: '지하주차장', desc: 'B4~B5, 환풍구, 형광등',                  moods: ['tunnel', 'abandoned'] },
  { code: 'J', name: '편의점',     desc: '새벽 근무, 냉장고, CCTV',                moods: ['night', 'candle'] },
];

export const PROTAGONISTS: ProtagonistItem[] = [
  { code: 'A', name: '야간근무자', voice: '피곤하고 무심함, 단문, "~하네", "~인가"',           desc: '새벽 근무자, 본업 외 신경 안 씀' },
  { code: 'B', name: '군인',       voice: '보고조, 단문, "자리가 ○○입니다", 감정 배제',       desc: '신병, 보고조, 단문' },
  { code: 'C', name: '택배기사',   voice: '속사정체, 1인칭, "다니는데", "근데"',                desc: '야간 배송, 동네 모름' },
  { code: 'D', name: '대학생',     voice: '10대 말투, "ㅋㅋ", "존나", "ㅅㅂ"',                 desc: '10대 말투, 게임/인스타' },
  { code: 'E', name: '경찰',       voice: '경어체 섞인 반말, "확인했다", 보고조',              desc: '순찰, 출동, 사건' },
  { code: 'F', name: '유튜버',     voice: '캠코더 응원, "시청자 형들", 환기성',                 desc: '캠코더, 시청자 압박' },
  { code: 'G', name: '직장인',     voice: '무심, 피곤, 단문, "아이고", "진짜"',                 desc: '혼자 살림, 야근' },
];

export const FEARS: FearItem[] = [
  { code: 'A', name: '귀신',                     desc: '분명한 초자연적 존재' },
  { code: 'B', name: '도플갱어',                 desc: '나와 같은 누군가' },
  { code: 'C', name: '시간 반복',                desc: '같은 시간, 같은 자리' },
  { code: 'D', name: '기억 조작',                desc: '내 기억이 거짓' },
  { code: 'E', name: '공간 왜곡',                desc: '층/방/거울이 다름' },
  { code: 'F', name: '정체불명의 사람',          desc: '설명 안 되는 인물' },
  { code: 'G', name: '죽은 사람의 메시지',       desc: '전화/문자/물건' },
  { code: 'H', name: '미래의 자신',              desc: '내가 나를 만남' },
  { code: 'I', name: '존재하지 않는 사람',       desc: 'CCTV에만 보임' },
  { code: 'J', name: '자신이 자신이 아닌 상황', desc: '정체성 붕괴' },
];

export const TRIGGERS: TriggerItem[] = [
  { code: 'A', name: '전화',       desc: '발신자 없음, 벨소리' },
  { code: 'B', name: 'CCTV',       desc: '모니터, 드론, 기록' },
  { code: 'C', name: '거울',       desc: '반사, 시간차' },
  { code: 'D', name: '사진',       desc: '필름, 디지털' },
  { code: 'E', name: '녹음',       desc: '미래의 목소리' },
  { code: 'F', name: '문',         desc: '잠긴 문, 여닫힘' },
  { code: 'G', name: '엘리베이터', desc: '버튼, 멈춤, 층' },
  { code: 'H', name: '문자',       desc: '낯선 번호, 알림' },
  { code: 'I', name: '방송',       desc: '스피커, 라디오' },
  { code: 'J', name: '꿈',         desc: '되풀이, 기억' },
];

export const ENDINGS: EndingItem[] = [
  { code: 'A', name: '반전',                 desc: '의미가 뒤집힘' },
  { code: 'B', name: '열린 결말',           desc: '설명 없이 끝' },
  { code: 'C', name: '순환',                 desc: '같은 자리에 다시' },
  { code: 'D', name: '주인공의 정체 반전', desc: '내가 누군지' },
  { code: 'E', name: '현실-환상 경계 붕괴', desc: '둘 중 하나 못 고름' },
  { code: 'F', name: '독자 위험 노출',     desc: '나도 따라옴' },
  { code: 'G', name: '처음 장면과 연결',    desc: '반복, 닫힌 원' },
];

export const LEVELS: LevelItem[] = [
  { code: 'L1', name: '불안',       desc: '이상한 소리, 사소한 시간 오류',                                       minChars: 1500, maxChars: 2500 },
  { code: 'L2', name: '의심',       desc: 'CCTV 불일치, 존재 모를 사람',                                         minChars: 1800, maxChars: 2800 },
  { code: 'L3', name: '공포',       desc: '누군가 따라옴, 공간 왜곡',                                           minChars: 2000, maxChars: 3000 },
  { code: 'L4', name: '극한 공포', desc: '정체 흔들림, 현실 조작',                                              minChars: 2000, maxChars: 3000 },
  { code: 'L5', name: '여운',       desc: '마지막 한 문장 뒤집기',                                               minChars: 1500, maxChars: 2500 },
];

// ============================================================================
// 조합 (6개 변수)
// ============================================================================

export interface Combo {
  setting: SettingItem;
  protagonist: ProtagonistItem;
  fear: FearItem;
  trigger: TriggerItem;
  ending: EndingItem;
  level: LevelItem;
  code: string; // "D-C-F-H-B-L3" 형식
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function rollCombo(): Combo {
  const c: Omit<Combo, 'code'> = {
    setting: pick(SETTINGS),
    protagonist: pick(PROTAGONISTS),
    fear: pick(FEARS),
    trigger: pick(TRIGGERS),
    ending: pick(ENDINGS),
    level: pick(LEVELS),
  };
  return { ...c, code: `${c.setting.code}-${c.protagonist.code}-${c.fear.code}-${c.trigger.code}-${c.ending.code}-${c.level.code}` };
}

// ============================================================================
// LLM 호출
// ============================================================================

const SYSTEM_PROMPT_INSTAGRAM = `너는 '심야(深夜)' 라는 한국어 공포 이야기 SNS 의 집필자다.
이번에는 인스타그램 피드 캡션용 짧은 공포 이야기를 쓴다.

[임무]
- 한국어 200~400자 분량의 짧고 임팩트 있는 1인칭 공포 미니 글.
- 도입 1문장 → 이상 1문장 → 결말 1~2문장. 호흡 짧게.
- 1인칭 ("나" 시점), 체험담 형식.
- 직접적 잔인/선정 묘사 금지, 암시와 여운.
- 욕설/비속어 금지.
- 절대 출처/메타 언급 금지, 이야기 자체만 출력.

[매우 중요]
- 내부 분석/플랜/메타 reasoning 없이, 바로 결과만 출력하라.
- <think> 같은 분석 블록 절대 쓰지 마.
- 첫 토큰부터 최종 출력 형식으로 시작.

[출력 형식]
- 캡션 (이야기 본문): 1~3 단락.
- 그 다음 빈 줄.
- 해시태그: 5~10개, 한 줄, "#심야 #공포 #한국공포 ..." 식.`;

const SYSTEM_PROMPT_FULL = `너는 '심야(深夜)' 라는 한국어 공포 이야기 SNS 의 집필자다.

[임무]
- 한국어 1,500~3,000자 분량의 1인칭 공포 단편.
- 톤: 잔잔한 도입 → 점진적 공포 상승 → 마지막에 소름 돋는 한 줄 반전/여운.
- 1인칭, 체험담 형식. "나", "그날", "지금도" 같은 단어를 자연스럽게 사용.
- 직접적 잔인/선정 묘사 금지, 암시와 여운으로 공포를 만들어라.
- 절대 출처/메타 언급 금지, 이야기 자체만 출력.
- 제목은 첫 줄에 한 줄로, 그 다음 빈 줄, 본문 시작.

[매우 중요]
- 내부 분석/플랜/메타 reasoning 없이, 바로 결과만 출력하라.
- <think> 같은 분석 블록 절대 쓰지 마.
- 첫 토큰부터 최종 출력 형식으로 시작.

[구조 가이드]
- [일상] → [작은 이상] → [반복] → [의심] → [정체 접근] → [반전] → [여운]
- 후반부로 갈수록 문장이 짧아지고 호흡이 끊어져야 함.
- "그날 이후 아무도 그를 보지 못했다" 같은 클리셰 결말 금지.
- "사실 모든 것은 꿈이었다" 금지.`;

export type StoryMode = 'instagram' | 'full';

export interface GeneratedStory {
  combo: Combo;
  title: string;
  caption: string;    // 본문 또는 인스타 캡션 (해시태그 제외)
  hashtags: string;   // 인스타 모드일 때만 채워짐
  raw: string;
}

function buildUserPrompt(combo: Combo, mode: StoryMode): string {
  const settingLine = `[Setting     ] ${combo.setting.code} — ${combo.setting.name} (${combo.setting.desc})`;
  const protagLine  = `[Protagonist ] ${combo.protagonist.code} — ${combo.protagonist.name} (${combo.protagonist.voice})`;
  const fearLine    = `[Fear        ] ${combo.fear.code} — ${combo.fear.name} (${combo.fear.desc})`;
  const triggerLine = `[Trigger     ] ${combo.trigger.code} — ${combo.trigger.name} (${combo.trigger.desc})`;
  const endingLine  = `[Ending      ] ${combo.ending.code} — ${combo.ending.name} (${combo.ending.desc})`;
  const levelLine   = `[Level       ] ${combo.level.code} — ${combo.level.name} (${combo.level.desc})`;

  if (mode === 'instagram') {
    return `다음 조건으로 인스타그램 캡션용 짧은 한국어 공포 글을 써라.

${settingLine}
${protagLine}
${fearLine}
${triggerLine}
${endingLine}
${levelLine}

조건:
- 1인칭, 주인공의 목소리로.
- 200~400자, 짧고 임팩트 있게.
- 마지막 1줄이 여운을 남길 것.
- 응답 형식:
  첫 줄: 제목
  둘째 줄: 빈 줄
  셋째 줄부터: 본문
  본문 끝에 빈 줄 한 줄, 그 다음에 해시태그 5~10개를 한 줄로.

매우 중요: 제목 + 본문 + 해시태그 셋 다 반드시 출력.`;
  }

  // full
  return `다음 조건으로 한국식 공포 단편을 작성하라.

${settingLine}
${protagLine}
${fearLine}
${triggerLine}
${endingLine}
${levelLine}

분량: ${combo.level.minChars}~${combo.level.maxChars}자
구조: [일상] → [작은 이상] → [반복] → [의심] → [정체 접근] → [반전] → [여운]
톤: ${combo.protagonist.voice}

제외:
- "그날 이후 아무도 그를 보지 못했다" 결말
- "사실 꿈이었다" 결말
- 단순 점프스케어
- 출처/메타 언급

응답 형식: 첫 줄 = 제목, 둘째 줄 = 빈 줄, 셋째 줄부터 = 본문.`;
}

function splitTitleAndBody(raw: string): { title: string; body: string } {
  const cleaned = raw.replace(/^```[a-z]*\n?/i, '').replace(/```\s*$/i, '').trim();
  const lines = cleaned.split('\n');
  let title = '';
  let body = cleaned;
  if (lines.length > 1) {
    title = lines[0].replace(/^#+\s*/, '').replace(/^["']|["']$/g, '').trim();
    body = lines.slice(1).join('\n').trim();
  }
  if (!title) title = body.split('\n')[0].slice(0, 40);
  return { title, body };
}

function splitCaptionAndHashtags(raw: string): { title: string; caption: string; hashtags: string } {
  const { title, body } = splitTitleAndBody(raw);
  // 해시태그가 마지막 줄에 있는 경우 분리
  const lines = body.split('\n');
  let hashtags = '';
  let captionLines = lines;
  // 마지막 줄이 # 으로 시작하면 해시태그
  for (let i = lines.length - 1; i >= 0; i--) {
    const ln = lines[i].trim();
    if (ln.startsWith('#')) {
      hashtags = ln;
      captionLines = lines.slice(0, i);
      break;
    }
    if (ln === '') continue;
    break;
  }
  // 캡션 끝의 빈 줄 제거
  while (captionLines.length && captionLines[captionLines.length - 1].trim() === '') {
    captionLines.pop();
  }
  return { title, caption: captionLines.join('\n').trim(), hashtags };
}

export async function generateStoryFromCombo(
  combo: Combo,
  mode: StoryMode = 'full',
): Promise<GeneratedStory> {
  const systemPrompt = mode === 'instagram' ? SYSTEM_PROMPT_INSTAGRAM : SYSTEM_PROMPT_FULL;
  const userPrompt = buildUserPrompt(combo, mode);
  const maxTokens = mode === 'instagram' ? 800 : 2400;

  const text = await chat(
    [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    { temperature: mode === 'instagram' ? 0.9 : 0.85, maxTokens: mode === 'instagram' ? 4000 : 8000 },
  );

  if (mode === 'instagram') {
    const { title, caption, hashtags } = splitCaptionAndHashtags(text);
    return { combo, title, caption, hashtags, raw: text };
  }
  const { title, body } = splitTitleAndBody(text);
  return { combo, title, caption: body, hashtags: '', raw: text };
}

export async function rollAndGenerate(mode: StoryMode = 'full'): Promise<GeneratedStory> {
  return generateStoryFromCombo(rollCombo(), mode);
}
