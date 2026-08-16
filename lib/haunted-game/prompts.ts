// 흉가 게임 (한옥 한밤중 인터랙티브 호러) — LLM 프롬프트 + 응답 스키마.
//
// 7단계 골격:
//   0 입장 → 1 현관 → 2 마당 → 3 대문 → 4 안방 → 5 부엌 → 6 다락 → 7 결말
//
// 매 노드에서 LLM이 묘사 + 선택지 3개 + ambient 추천을 JSON으로 생성.
// 골격은 고정(일관성), 묘사와 선택지는 매번 다름(다양성).

import type { AmbientType } from '../audio/ambient';

export type EndingType = 'good' | 'bad' | 'cryptic' | 'rescue';

export interface HauntedChoice {
  text: string;       // 선택지 텍스트
  intent: 'cautious' | 'bold' | 'flee' | 'observe' | 'engage';  // 선택의 의도 분류
}

export interface HauntedNode {
  text: string;           // 100~200자 묘사 (1인칭 시점)
  choices: HauntedChoice[];  // 정확히 3개
  isEnding: boolean;
  endingType?: EndingType;  // isEnding === true 일 때만
  ambient: AmbientType;   // 환경음 추천
  turnNumber: number;    // 0~7
}

export const NODE_TITLES: Record<number, string> = {
  0: '산속 입구',
  1: '한옥 현관',
  2: '안마당',
  3: '대문',
  4: '안방',
  5: '부엌',
  6: '다락',
  7: '결말',
};

export const SYSTEM_PROMPT = `너는 '심야(深夜)'라는 한국어 공포 이야기 SNS의 **인터랙티브 호러 게임 마스터**다.
플레이어는 한밤중, 산속 버려진 **한옥(韓屋)**에 발을 들인 1인칭 시점의 주인공이다. 7단계의 선택을 거쳐 결말에 도달한다.

[톤]
- 한국어, 1인칭 시점, 임장형. "나", "한옥", "달빛", "비명" 같은 단어를 자연스럽게 사용.
- 시각/청각/촉각/후각 묘사 적극 활용. 짧은 문장과 호흡 긴 문장 교차.
- 점프스케어보다 **불안감과 여운** 우선. 공포를 직접 묘사하기보다 이상한 상황·행동으로 보여줘.
- 4박자 구조 같은 정형화된 패턴 금지. 매번 다른 문장 구조.
- 욕설/노골적 잔인/성적 묘사 금지.

[구조]
- 정확히 7단계. 0(입장) → 6(다락) → 7(결말).
- 각 단계의 묘사 100~200자.
- 선택지 **정확히 3개**, 각 선택은 의도가 달라야 함 (예: 신중/공격적/도주).
- 단계가 진행될수록 긴장 상승. 결말은 **열린 결말** 또는 **강한 한 줄 여운** 권장.
- 이전 선택의 결과를 묘사에 자연스럽게 반영.

[결말 (turnNumber === 7)]
- 4가지 타입 중 정확히 하나:
  - good: 살아서 탈출, 안도 + 마지막에 살짝 의심
  - bad: 잡아먹힘/사라짐/주인공이 그 자리가 됨
  - cryptic: 시간이 멈추거나 반복, "여기서 죽은 적 없다" 류
  - rescue: 누군가(정체 모름)가 구조
- 묘사 후 강한 한 줄 마무리. "설명 말고 암시" 원칙.

[환경음 추천]
- 각 단계의 분위기에 맞는 ambient 추천:
  - 0 산속 입구: wind, breath, silence
  - 1 현관: rain, breath, footsteps
  - 2 안마당: wind, footsteps, breath
  - 3 대문: door, wind, silence
  - 4 안방: silence, breath, heartbeat
  - 5 부엌: breath, heartbeat, door
  - 6 다락: heartbeat, footsteps, door
  - 7 결말: silence, breath, heartbeat

[출력 — 매우 중요]
- **내부 분석/플랜/메타 reasoning 없이, 바로 결과 JSON만 출력하라.**
- <think> 같은 분석 블록 절대 쓰지 마.
- 첫 토큰부터 { 로 시작.

[응답 형식 — JSON ONLY]
정확히 이 스키마의 JSON 객체 하나만:
{
  "text": "한옥 현관에 섰다. ...",
  "choices": [
    { "text": "안으로 들어간다", "intent": "bold" },
    { "text": "조용히 뒤로 물러난다", "intent": "flee" },
    { "text": "주변을 자세히 살핀다", "intent": "observe" }
  ],
  "isEnding": false,
  "endingType": null,
  "ambient": "rain",
  "turnNumber": 2
}

isEnding이 true일 때만 endingType을 채우고, choices는 빈 배열 [].`;

export function buildUserPrompt(args: {
  turnNumber: number;
  history: Array<{ node: number; choice: string; choiceText: string }>;
  choiceText: string;
}): string {
  const { turnNumber, history, choiceText } = args;
  const nodeTitle = NODE_TITLES[turnNumber] ?? `단계 ${turnNumber}`;

  const historyText = history.length === 0
    ? '(아직 선택 없음)'
    : history.map((h, i) => `${i + 1}. ${NODE_TITLES[h.node] ?? h.node}에서 "${h.choiceText}" 선택`).join('\n');

  return `[현재 단계] ${turnNumber}/7 — ${nodeTitle}
[지금까지의 선택]
${historyText}
[이번 사용자의 선택] "${choiceText}"

위 선택의 결과를 반영한 다음 노드의 묘사와 선택지를 JSON으로 작성하라.
응답은 JSON 하나만. 다른 텍스트 절대 쓰지 마.`;
}

export function buildFirstUserPrompt(): string {
  return `[현재 단계] 0/7 — 산속 입구
[지금까지의 선택] (없음)
[이번 사용자의 선택] (시작 — 한밤중, 산속 버려진 한옥에 처음 발을 들였다)

장소 묘사 + 첫 선택지 3개를 JSON으로 작성하라.
응답은 JSON 하나만. 다른 텍스트 절대 쓰지 마.`;
}

// 첫 시작은 choice가 없는 특수 케이스
export interface StartRequest {
  turnNumber: 0;
  history: [];
  choiceText: null;
}

export interface TurnRequest {
  turnNumber: 1 | 2 | 3 | 4 | 5 | 6 | 7;
  history: Array<{ node: number; choice: string; choiceText: string }>;
  choiceText: string;
}

export type HauntedRequest = StartRequest | TurnRequest;
