// AI 가 컨셉 풀에서 무작위로 시드 뽑아서 1인칭 공포 단편을 새로 지음.
// 크롤링 없이 매번 다른 이야기 생성. 저작권 리스크 없음.
//
// [2026-08-14] 내부 구현을 6차원 변수 시스템 (combo-story) 으로 교체.
// - 기존 27개 시드 + 자유 LLM 호출 → 49,000+ 조합 + 6차원 강제 변수.
// - few-shot 없음, 시스템 프롬프트에 어휘/구조 강제 없음 → 반복 패턴 제거.

import { chat } from './minimax';
// (2026-08-15) pickRandomImage 제거 — 텍스트가 메인, 이미지는 생성 안 함
import { rollCombo, generateStoryFromCombo } from './combo-story';

const SYSTEM_PROMPT = `너는 '심야(深夜)'라는 공포 이야기 SNS 의 집필자다.
- 너의 임무는 한국어로 짧고 임팩트 있는 공포 단편을 쓰는 것.
- 분량: 700~1100자 한국어.
- 톤: 잔잔한 도입 → 점진적 공포 상승 → 마지막에 소름 돋는 한 줄 반전/여운.
- 1인칭, 체험담 형식. "나", "그날", "지금도" 같은 단어를 자연스럽게 사용.
- 직접적 잔인/선정 묘사 금지, 암시와 여운으로 공포를 만들어라.
- 절대 출처/메타 언급 금지, 이야기 자체만 출력.
- 제목은 첫 줄에 한 줄로, 그 다음 빈 줄, 본문 시작.`;

// ----- 컨셉 풀 (확장 가능) -----
interface ConceptSeed {
  place: string;        // 배경
  setup: string;        // 도입 상황
  twist: string;        // 결말/반전 힌트
  tone: string;         // 분위기 키워드
}

const SEEDS: ConceptSeed[] = [
  // 심야 / 도시
  { place: '심야 편의점', setup: '알바 중, 새벽 3시에 들어온 손님 한 명이 한 가지 물건만 계속 집어 든다', twist: '그 물건이, 내가 어제 잃어버린 열쇠였다', tone: '느와르 긴장' },
  { place: '지하철 마지막 칸', setup: '퇴근길, 평소엔 없는 역에서 혼자 내렸다', twist: '그 역은 내가 다니는 회사 이름이었다', tone: '도시적 불안' },
  { place: '고층 아파트 엘리베이터', setup: '15층을 눌렀는데, 어째서인지 13층에 멈췄다', twist: '엘리베이터 거울에, 내가 탄 자리가 없었다', tone: '밀폐 공포' },
  { place: '심야 택시', setup: '기사 아저씨가 내리는 곳을 알면 안 된다고 한다', twist: '집에 도착했을 때, 거울 속의 내가 다른 사람이었다', tone: '운명적 무력' },
  { place: '새벽 약국', setup: '감기약을 사러 갔는데, 점원이 "어제도 오셨잖아요" 라고 한다', twist: '나는 처음 왔는데, 영수증엔 내 이름이 적혀 있다', tone: '시간 루프' },
  // 고립 / 지방
  { place: '시골 버스 정류장', setup: '마지막 버스를 놓쳐, 한 시간째 기다리고 있다', twist: '지나가는 차들이 모두 내 차였다', tone: '고립 공포' },
  { place: '폐병원', setup: '유튜버가 된 친구의 촬영에 끌려갔다', twist: '건물에서 나왔을 때, 친구는 없었다', tone: '탐험 공포' },
  { place: '산장 2층', setup: '친구 셋과 함께 갔는데, 새벽에 계단 소리가 난다', twist: '아래층에서 누가 우리 이름을 부른다 — 한 명씩', tone: '짝 홀 공포' },
  { place: '민박집', setup: '여행 중, 주인이 "절대 2층에 가지 마세요" 라고 했다', twist: '2층 침대 위 내 옆에, 아무도 없었다', tone: '금기 어김' },
  { place: '폐쇄 등산로', setup: '입구 표지판에 "산은 기억한다" 라고 적혀 있다', twist: '내려왔는데, 내가 올라간 적 없는 사진이 핸드폰에 있다', tone: '자연 회귀' },
  // 일상 균열
  { place: '내 집 화장실', setup: '샤워 중, 거울이 뿌옇다 — 닦아도 닦아도 뿌옇다', twist: '거울 너머에서 누가 같은 동작으로 닦고 있다', tone: '거울 균열' },
  { place: '회사 회의실', setup: '야근 중, 혼자 남았는데 전등이 깜빡인다', twist: '이 자리에 있던 적 없는 사람이, 모니터 뒤에서 웃고 있다', tone: '직장 괴기' },
  { place: '새벽 4시', setup: '잠결에 방문을 두드리는 소리가 났다', twist: '현관 밖 복도에는, 우리 집이 없었다', tone: '공간 붕괴' },
  { place: '잠들기 직전', setup: '눈을 감았다 떴을 때, 천장 위치가 달라져 있다', twist: '세 번 째 깰 때쯤, 내가 아님을 안다', tone: '정체성 붕괴' },
  { place: '동네 사진관', setup: '어릴 적 사진이 필요해서 찾았다', twist: '사진 속 배경에, 지금 서 있는 내 모습이 찍혀 있다', tone: '시간 역류' },
  // 가족 / 관계
  { place: '어머니 산소', setup: '명절에 무덤을 찾았는데, 비석 이름이 내 이름이었다', twist: '나란히 비석이 하나 더 있었다 — "어머니"', tone: '정체성 교체' },
  { place: '오래된 고모댁', setup: '오랜만에 갔는데, 집 안의 가족들이 나를 안다', twist: '내 이름이 아니라 다른 사람의 이름으로 부른다 — 아무도 이상하게 안 여긴다', tone: '가면' },
  { place: '동창 결혼식', setup: '오랜만에 만난 동기들이 모두 나를 피한다', twist: '신랑 신부 한 명도, 이 결혼식에 초대된 적이 없다', tone: '기이한 관찰' },
  // 사물 / 현상
  { place: '심야 PC방', setup: '새벽 5시, 매장이 텅 비었다 — 아니, 한 명은 자고 있다', twist: '그 자는 사람은, 어제 이 매장에서 자살한 사람이었다', tone: '유령 동거' },
  { place: '편의점 CCTV', setup: '점장이 모니터를 가리키며 "이 사람이 매일 와요" 라고 한다', twist: 'CCTV 속 사람은 나인데, 시점은 내가 없는 곳을 비춘다', tone: '관측자' },
  { place: '택배 보관함', setup: '도착 알림이 떴는데, 내 집엔 보관함이 없다', twist: '아래층에 새로 생긴 보관함에서, 어제 내가 산 물건이 도착해 있다', tone: '소름' },
  { place: '엘리베이터 거울', setup: '거울에 비친 내가 0.5초 늦게 움직인다', twist: '친구가 그걸 보고 나한테 "너는 몇 번째냐"고 묻는다', tone: '복제' },
  // 자연 / 의식
  { place: '한밤중 비', setup: '비를 맞으며 택시를 기다리는데, 비가 내 머리 위로만 안 온다', twist: '택시가 왔을 때, 기사석은 비어 있고 핸들만 움직인다', tone: '초자연' },
  { place: '달빛', setup: '창밖 달이 너무 커 보인다', twist: '다음 날, 달이 그대로 떠 있고, 사진에는 내 방 거울이 찍혀 있다', tone: '꿈' },
  { place: '교회', setup: '새벽 미사에 갔는데, 옆자리 사람이 계속 미소 짓는다', twist: '그 사람은 3년 전에 죽었다고 모두가 말한다', tone: '기이 동거' },
  { place: '잠 못 드는 밤', setup: '계속 뒤척이다, 시계가 새벽 3시 33분을 가리킨다', twist: '시침이 거꾸로 돌기 시작한다', tone: '시간 붕괴' },
  { place: '비밀 연인', setup: '반년 만난 사람이 매일 새벽 3시에만 전화를 받는다', twist: '그 사람도, 나도, 둘 다 잠들어 있는 시간이 없다', tone: '존재 의문' },
];

// ----- 컨셉 풀에서 랜덤 선택 -----
function pickSeed(): ConceptSeed {
  return SEEDS[Math.floor(Math.random() * SEEDS.length)];
}

// ----- 결정적 시드 (인덱스로) — 다양한 분포를 위해 -----
export function pickSeedByIndex(i: number): ConceptSeed {
  return SEEDS[i % SEEDS.length];
}

// ----- AI 로 1인칭 공포 단편 생성 -----
// 6차원 변수 시스템 (combo-story) 위임. 기존 시그니처/필드 호환 유지.
export async function generateRandomHorrorStory(): Promise<{
  title: string;
  content: string;
  usedFallback: boolean;
  concept: ConceptSeed;
}> {
  const combo = rollCombo();
  const seed: ConceptSeed = comboToConcept(combo);

  try {
    const story = await generateStoryFromCombo(combo, 'full');
    if (!story.title || !story.caption) {
      console.warn('[random-story] empty result, fallback. combo=', combo.code);
      return { ...fallbackStory(seed), usedFallback: true, concept: seed };
    }
    return {
      title: story.title,
      content: story.caption,
      usedFallback: false,
      concept: seed,
    };
  } catch (e) {
    console.error('[random-story -> combo] failed:', e);
    return { ...fallbackStory(seed), usedFallback: true, concept: seed };
  }
}

// combo → 기존 ConceptSeed 형식 매핑 (호환성 유지)
function comboToConcept(combo: ReturnType<typeof rollCombo>): ConceptSeed {
  return {
    place: combo.setting.name,
    setup: `${combo.protagonist.name} / ${combo.fear.name} / ${combo.trigger.name}`,
    twist: combo.ending.name,
    tone: combo.level.name,
  };
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

// ----- Fallback: AI 죽었을 때 템플릿으로 짧은 이야기 -----
function fallbackStory(seed: ConceptSeed): { title: string; content: string } {
  const title = `${seed.place}에서`;
  const content = [
    `그날, 나는 ${seed.place}에 있었다.`,
    `${seed.setup}.`,
    `처음엔 별일 아닌 줄 알았다.`,
    `하지만 공기가 달라져 있었다.`,
    ``,
    `오래된 공기. 짙은 정적. 아무도 없는 것 같은데, 누군가의 시선이 느껴졌다.`,
    `${seed.twist}.`,
    ``,
    `그 이후로, ${seed.place}에 가면 심장이 조여온다.`,
    `아무도 모른다.`,
    `이 이야기만, 내 머릿속에 남아 있다.`,
  ].join('\n');
  return { title, content };
}
