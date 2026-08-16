// PASSENGER: ROAD OF DEATH — 게임 데이터
// CHAPTER 1: 사고 → 캠핑카 → 모텔 진입
// CHAPTER 2: 모텔 내부 탐험 (로비/복도/객실/지하)
// CHAPTER 3: 진실의 길 (뒷도로 / 최종장소) → 엔딩 A/B/C
//
// locations, objects, items, puzzles, dialogues 모두 한 곳에 정의.
// 게임 로직은 types.ts 의 GameState 만 변경.

import type { Item, LocationDef, Dialogue, Puzzle } from './types';

// =================
// ITEMS
// =================
export const ITEMS: Record<string, Item> = {
  // ----- CHAPTER 1 -----
  flashlight: {
    id: 'flashlight', name: '손전등', chapter: 1,
    description: '낡은 손전등. 배터리가 필요하다.',
    icon: '🔦', usableOn: ['dark_area'],
  },
  battery: {
    id: 'battery', name: '건전지', chapter: 1,
    description: '9V 건전지 한 개. 멀쩡하다.',
    icon: '🔋',
  },
  old_key: {
    id: 'old_key', name: '녹슨 열쇠', chapter: 1,
    description: '오래되어 녹이 슬었다. 모텔 출입문용.',
    icon: '🗝️', usableOn: ['motel_door'],
  },
  note_road: {
    id: 'note_road', name: '찢어진 메모', chapter: 1,
    description: '"12시"라는 숫자. 그 외는 읽을 수 없다.',
    icon: '📝',
  },
  license_memo: {
    id: 'license_memo', name: '번호판 메모', chapter: 1,
    description: '"17-04-29". 사고 차량의 번호판.',
    icon: '🔢',
  },
  carving_slate: {
    id: 'carving_slate', name: '이상한 표식', chapter: 1,
    description: '도로에 새겨진 기하학적 표식.',
    icon: '◈',
  },
  map_piece: {
    id: 'map_piece', name: '지도 조각', chapter: 1,
    description: '근처 지도의 일부. 모텔 표시.',
    icon: '🗺️',
  },
  handkerchief: {
    id: 'handkerchief', name: '핸드케르치', chapter: 1,
    description: '검은 얼룩. 끔찍한 냄새.',
    icon: '🧣',
  },
  matches: {
    id: 'matches', name: '성냥', chapter: 1,
    description: '잘 마른 성냥 한 갑.',
    icon: '🔥',
  },

  // ----- CHAPTER 2 -----
  room_204_key: {
    id: 'room_204_key', name: '204호 열쇠', chapter: 2,
    description: '"204"라고 적힌 작은 열쇠.',
    icon: '🗝️', usableOn: ['room_204_door'],
  },
  photo: {
    id: 'photo', name: '낡은 사진', chapter: 2,
    description: '한 여자가 찍혀 있다. 눈이 사라져 있다.',
    icon: '🖼️',
  },
  diary_page: {
    id: 'diary_page', name: '일기장 한 장', chapter: 2,
    description: '"나는 매디가 아니다. 매디는 죽었다. 난 그냥…" —여기서 끊긴다.',
    icon: '📓',
  },
  broken_lighter: {
    id: 'broken_lighter', name: '깨진 라이터', chapter: 2,
    description: '"M.H" 라는 이니셜.',
    icon: '🔥',
  },
  bloodied_cloth: {
    id: 'bloodied_cloth', name: '핏빛 천', chapter: 2,
    description: '지하에서 발견한 천. 손수건처럼 생겼다.',
    icon: '🩸',
  },
  ledger: {
    id: 'ledger', name: '모텔 장부', chapter: 2,
    description: '투숙객 명단. "204 — 영구" 라는 메모가 있다.',
    icon: '📒',
  },
  silver_key: {
    id: 'silver_key', name: '은색 열쇠', chapter: 2,
    description: '204호 옷장에서 발견. 차 문을 여는 것 같다.',
    icon: '🗝️', usableOn: ['basement_car'],
  },
  gasoline: {
    id: 'gasoline', name: '기름통', chapter: 3,
    description: '반쯤 차 있는 기름통. 도주용.',
    icon: '⛽',
  },

  // ----- CHAPTER 3 -----
  final_letter: {
    id: 'final_letter', name: '마지막 편지', chapter: 3,
    description: '"사랑하는 매디에게. 이 편지를 읽는다면, 나는 이미 갔다."',
    icon: '✉️',
  },
  wedding_ring: {
    id: 'wedding_ring', name: '결혼반지', chapter: 3,
    description: '여자용 작은 반지. 안쪽에 "T+M" 라는 각인.',
    icon: '💍',
  },
  charm: {
    id: 'charm', name: '부적', chapter: 3,
    description: '낡은 천에 싸인 뼈 조각. 가까이만 해도 손이 떨린다.',
    icon: '🪬',
  },
};

// =================
// DIALOGUES
// =================
export const DIALOGUES: Record<string, Dialogue> = {
  // ----- CHAPTER 1 -----
  intro: {
    id: 'intro',
    lines: [
      { speaker: '타일러', text: '여보, 거의 다 왔어. 다음 휴게소에서 쉴까?' },
      { speaker: '매디',   text: '응. 라디오에서 이상한 소리만 나서. 채널 돌려봐.' },
      { speaker: '라디오', text: '………(잡음)……… 미……시…… 12:00 AM………' },
      { speaker: '타일러', text: '뭐야 그 방송은? 채널이 왜 저래.' },
    ],
    next: 'road',
  },
  accident_after: {
    id: 'accident_after',
    lines: [
      { speaker: '타일러', text: '앞에 사고가 있어! 뭐야, 사람이 쓰러져 있어!' },
      { speaker: '매디',   text: '가까이 가보자. 신고부터 해야…' },
      { speaker: '타일러', text: '…잠깐, 차에서 내려. 혼자 가지 마.' },
    ],
  },
  first_man: {
    id: 'first_man',
    lines: [
      { speaker: '매디',   text: '…저기. 저 사람…' },
      { speaker: '타일러', text: '어디? 난 아무도 안 보이는데.' },
      { speaker: '매디',   text: '아, 사라졌어. 아니, 진짜 누가 있었어?' },
    ],
  },
  camper_search: {
    id: 'camper_search',
    lines: [
      { speaker: '타일러', text: '차가 시동이 안 걸려. 뭔가 이상이 있어.' },
      { speaker: '매디',   text: '안에 뭐 보이는 거 없어? 배터리 같은 거.' },
      { speaker: '타일러', text: '라디오가 왜 저렇게 잡음만 나는 거야. 끄자.' },
    ],
  },
  radio_on: {
    id: 'radio_on',
    lines: [
      { speaker: '라디오', text: '………12:00 AM……… 패신저는……… 가까이 왔다………' },
      { speaker: '매디',   text: '패신저? 무슨 소리지…' },
      { speaker: '타일러', text: '이상해. 일단 여기서 나가자.' },
    ],
  },
  passenger_warning: {
    id: 'passenger_warning',
    lines: [
      { speaker: '매디',   text: '…거울 속에 누가 있어.' },
      { speaker: '타일러', text: '뭐?' },
      { speaker: '매디',   text: '아, 없어졌어. 또 그거야…' },
    ],
  },
  chase_begin: {
    id: 'chase_begin',
    lines: [
      { speaker: '타일러', text: '빨리 타! 차가 시동 걸렸어!' },
      { speaker: '매디',   text: '저건 뭐야, 왜 따라와!' },
      { speaker: '타일러', text: '지금 뒤는 돌아보지 마!' },
    ],
    next: 'motel',
  },
  ending_a: {
    id: 'ending_a',
    lines: [
      { speaker: '타일러', text: '여기 모텔이다. 안에 들어가자.' },
      { speaker: '매디',   text: '차에 남긴 물건 챙겨.' },
      { speaker: '???',    text: '엔딩 A: ESCAPE — 모텔로 진입했다.' },
    ],
  },

  // ----- CHAPTER 2 -----
  ch2_enter_lobby: {
    id: 'ch2_enter_lobby',
    lines: [
      { speaker: '타일러', text: '…여기 모텔이야. 불이 꺼져 있어.' },
      { speaker: '매디',   text: '안에 사람 있는 것 같아. 발소리가…' },
      { speaker: '타일러', text: '로비부터 보자. 빨리.' },
    ],
  },
  ch2_find_photo: {
    id: 'ch2_find_photo',
    lines: [
      { speaker: '매디',   text: '…이 사진 속 여자, 나한테 왜 이러고 있어.' },
      { speaker: '타일러', text: '뭐?' },
      { speaker: '매디',   text: '…아, 아무것도 아니야.' },
    ],
  },
  ch2_room_204_open: {
    id: 'ch2_room_204_open',
    lines: [
      { speaker: '타일러', text: '204. 문이 열렸어.' },
      { speaker: '매디',   text: '안에 누가 있었던 것 같은데. 냄새가…' },
      { speaker: '???',    text: '………………………….' },
    ],
  },
  ch2_basement_warning: {
    id: 'ch2_basement_warning',
    lines: [
      { speaker: '타일러', text: '지하로 내려가는 계단. 어둡다.' },
      { speaker: '매디',   text: '여기서부터 내가 무서운 게 아니야. 느껴져?' },
      { speaker: '???',    text: '…도망쳐……….' },
    ],
  },
  ch2_basement_reveal: {
    id: 'ch2_basement_reveal',
    lines: [
      { speaker: '타일러', text: '이건… 차다. 사고 차량이야.' },
      { speaker: '매디',   text: '시체도. 1챕에서 봤던 그 사람.' },
      { speaker: '타일러', text: '…어떻게 여기까지? 누가 옮긴 거야.' },
    ],
  },
  ch2_passenger_close: {
    id: 'ch2_passenger_close',
    lines: [
      { speaker: '매디',   text: '…타일러, 너한테 할 말이 있어.' },
      { speaker: '타일러', text: '?' },
      { speaker: '매디',   text: '…아니야. 먼저 가자.' },
    ],
  },

  // ----- CHAPTER 3 -----
  ch3_back_road: {
    id: 'ch3_back_road',
    lines: [
      { speaker: '타일러', text: '뒷문으로 나왔어. 차는 멀쩡한 것 같아.' },
      { speaker: '매디',   text: '…빨리 가자. 더 이상 돌아보지 말고.' },
    ],
  },
  ch3_final_choice_a: {
    id: 'ch3_final_choice_a',
    lines: [
      { speaker: '타일러', text: '시동 걸었다. 타!' },
      { speaker: '매디',   text: '…이게 맞아?' },
      { speaker: '???',    text: '…네 옆에, 내가 타고 있어.' },
    ],
  },
  ch3_final_choice_b: {
    id: 'ch3_final_choice_b',
    lines: [
      { speaker: '매디',   text: '…멈춰.' },
      { speaker: '타일러', text: '뭐?' },
      { speaker: '매디',   text: '…나를 봐. 진짜로.' },
    ],
  },
  ch3_truth_reveal: {
    id: 'ch3_truth_reveal',
    lines: [
      { speaker: '매디',   text: '…나, 매디가 아니야. 매디는 사고 현장에서 죽었어.' },
      { speaker: '매디',   text: '난 패신저였어. 미운 일이 있어, 매디의 몸을 빌렸어.' },
      { speaker: '타일러', text: '…아.' },
      { speaker: '매디',   text: '부적만 있으면, 보낼 수 있어. 하지만 너도…' },
    ],
  },
  ch3_escape_run: {
    id: 'ch3_escape_run',
    lines: [
      { speaker: '타일러', text: '기름 넣었어. 시동 건다!' },
      { speaker: '매디',   text: '…' },
      { speaker: '???',    text: '…다음엔, 더 가까이서 볼게.' },
    ],
  },

  // ----- 엔딩 -----
  ending_b: {
    id: 'ending_b',
    lines: [
      { speaker: '타일러', text: '…결국 도착했어. 집.' },
      { speaker: '타일러', text: '하지만 내 옆자리는 비어있지 않았어. 그건, 영원히.' },
    ],
  },
  ending_c: {
    id: 'ending_c',
    lines: [
      { speaker: '타일러', text: '부적이 빛났다. 그리고 매디의 눈에서, 뭔가 흘러나왔다.' },
      { speaker: '타일러', text: '"…고마워. 이제 보내줘."' },
      { speaker: '타일러', text: '그녀의 손이, 내 손을 잡았다. 마지막으로.' },
    ],
  },
};

// =================
// PUZZLES
// =================
export const PUZZLES: Record<string, Puzzle> = {
  camper_battery: {
    id: 'camper_battery', type: 'item_use', chapter: 1,
    prompt: '캠핑카의 라디오가 작동하지 않는다.\n인벤토리에서 적절한 아이템을 사용해 보자.',
    answer: 'battery', clues: ['radio'],
  },
  note_decode: {
    id: 'note_decode', type: 'combination', chapter: 1,
    prompt: '"12시"라는 메모와 번호판 "17-04-29"가 있다.\n이 둘을 합치면?',
    answer: '12:00', clues: ['note_road', 'license_memo'],
  },
  motel_safe: {
    id: 'motel_safe', type: 'combination', chapter: 1,
    prompt: '모텔 관리실 금고의 비밀번호는? (힌트: 6자리)',
    answer: '170429', clues: ['license_memo', 'carving_slate'],
    reward: 'old_key',
  },
  room_204_lock: {
    id: 'room_204_lock', type: 'item_use', chapter: 2,
    prompt: '204호의 문이 잠겨 있다.',
    answer: 'room_204_key', clues: ['room_204_door'],
  },
  basement_code: {
    id: 'basement_code', type: 'combination', chapter: 2,
    prompt: '지하로 내려가는 계단 옆, 자물쇠가 달린 작은 문.\n비밀번호는? (힌트: 204호 장부의 메모)',
    answer: '영구', clues: ['ledger'],
    options: ['1200', '영구', '204', 'MADI'],
  },
  final_choice: {
    id: 'final_choice', type: 'choice', chapter: 3,
    prompt: '도로 끝. 매디는 문을 향해 손을 뻗는다.\n당신의 선택은?',
    answer: 'truth', // 또는 'escape'
    options: ['진실을 마주한다 (truth)', '도망친다 (escape)'],
    clues: ['final_letter', 'wedding_ring', 'charm'],
    onSolve: undefined, // setEnding은 컴포넌트에서 처리
  },
};

// =================
// LOCATIONS
// =================
export const LOCATIONS: Record<string, LocationDef> = {
  // ============== TITLE ==============
  title: {
    id: 'title', chapter: 1, name: 'PASSENGER : ROAD OF DEATH',
    background: 'road-night', ambient: 'silence',
    objects: [], exits: [],
  },

  // ============== CHAPTER 1 ==============
  road: {
    id: 'road', chapter: 1, name: '어두운 도로',
    background: 'road-night', openingDialogue: 'intro', ambient: 'road',
    objects: [
      { id: 'van_seat', name: '캠핑카 시트', x: 30, y: 60, w: 40, h: 20, decor: 'van',
        inspectText: '캠핑카의 운전석. 라디오에서 잡음이 계속 난다.', revealsClue: 'radio_static' },
      { id: 'road_sign', name: '도로 표지판', x: 70, y: 30, w: 20, h: 15, decor: 'sign',
        inspectText: '"MOTEL 3km". 불이 깜빡인다.' },
      { id: 'forest_dark', name: '어두운 숲', x: 0, y: 30, w: 25, h: 60, decor: 'tree',
        inspectText: '나무 사이로 어둠이 깊다. 무언가 움직인 것 같기도…' },
    ],
    exits: [{ to: 'accident', label: '사고 현장으로' }],
    passengerEvent: 'silhouette',
  },
  accident: {
    id: 'accident', chapter: 1, name: '사고 현장',
    background: 'accident-night', openingDialogue: 'accident_after', ambient: 'forest',
    objects: [
      { id: 'wreck_car', name: '사고 차량', x: 50, y: 35, w: 35, h: 25, decor: 'wreck',
        inspectText: '차체가 심하게 찌그러져 있다. 번호판이 보인다 — 17-04-29.',
        givesItem: 'license_memo', oneShot: true },
      { id: 'dead_driver', name: '쓰러진 사람', x: 25, y: 55, w: 15, h: 25, decor: 'corpse',
        inspectText: '운전자로 보인다. 이미 숨이 끊어졌다. 이상한 표식이 입가에 새겨져 있다.',
        revealsClue: 'dead_driver', oneShot: true },
      { id: 'carving', name: '도로의 표식', x: 75, y: 70, w: 15, h: 12, decor: 'rock',
        inspectText: '도로에 새겨진 기하학적 표식. 의도적인 흔적이다.',
        givesItem: 'carving_slate', oneShot: true },
      { id: 'strange_man', name: '정체불명의 남자', x: 88, y: 35, w: 8, h: 30, decor: 'man',
        inspectText: '멀리 서 있다. 매디에게만 보인다. (가까이 가면 사라진다)',
        revealsClue: 'passenger_first_seen', oneShot: true },
      { id: 'forest_left', name: '옆 숲', x: 0, y: 35, w: 20, h: 60, decor: 'tree',
        inspectText: '어둠 속에서 발자국 소리가 들리는 것 같다.' },
    ],
    exits: [{ to: 'camper', label: '캠핑카로 돌아가기' }],
  },
  camper: {
    id: 'camper', chapter: 1, name: '캠핑카 내부',
    background: 'camper-interior', openingDialogue: 'camper_search', ambient: 'camper',
    objects: [
      { id: 'radio', name: '라디오', x: 70, y: 20, w: 18, h: 15, decor: 'radio',
        inspectText: '전원이 들어오지 않는다. 배터리가 필요하다.',
        requiresItem: 'battery', triggersPuzzle: 'camper_battery' },
      { id: 'toolbox', name: '공구상자', x: 8, y: 65, w: 18, h: 20, decor: 'box',
        inspectText: '공구상자 안에서 건전지를 발견했다.',
        givesItem: 'battery', oneShot: true },
      { id: 'mirror', name: '거울', x: 45, y: 25, w: 12, h: 18, decor: 'mirror',
        inspectText: '거울에 누군가 비친 것 같았는데, 다시 보면 아무도 없다.',
        revealsClue: 'passenger_mirror' },
      { id: 'bed', name: '침대', x: 10, y: 15, w: 30, h: 25, decor: 'bed',
        inspectText: '좁은 침대. 매디가 여기서 잠을 자곤 했다.' },
      { id: 'fridge', name: '냉장고', x: 78, y: 70, w: 15, h: 20, decor: 'fridge',
        inspectText: '차가운 물과 약간의 음식.' },
      { id: 'phone', name: '휴대전화', x: 50, y: 70, w: 12, h: 12, decor: 'phone',
        inspectText: '신호가 잡히지 않는다. "SOS 12:00" 라는 메모만 적혀 있다.',
        givesItem: 'note_road', oneShot: true },
    ],
    exits: [
      { to: 'road', label: '도로로 나가기' },
      { to: 'motel', label: '모텔로' },
    ],
    passengerEvent: 'mirror',
  },
  motel: {
    id: 'motel', chapter: 1, name: '오래된 모텔',
    background: 'motel-interior', ambient: 'motel',
    objects: [
      { id: 'motel_door', name: '모텔 출입문', x: 8, y: 40, w: 18, h: 30, decor: 'door',
        inspectText: '문이 잠겨 있다. 열쇠가 필요하다.',
        requiresItem: 'old_key',
        // 열쇠 사용 시: 로비로 이동
        givesItem: undefined, // 따로 처리됨
      },
      { id: 'front_desk', name: '관리실 데스크', x: 75, y: 25, w: 18, h: 18, decor: 'table',
        inspectText: '서랍이 잠겨 있다. 금고 비밀번호가 필요하다.',
        triggersPuzzle: 'motel_safe' },
      { id: 'motel_window', name: '모텔 창문', x: 50, y: 15, w: 20, h: 20, decor: 'window',
        inspectText: '안쪽에 희미한 불빛이 보인다.' },
    ],
    exits: [
      { to: 'camper', label: '캠핑카로' },
      { to: 'motel_lobby', label: '안으로 들어가기', requiresFlag: 'enter_motel' },
    ],
  },

  // ============== CHAPTER 2 ==============
  motel_lobby: {
    id: 'motel_lobby', chapter: 2, name: '모텔 로비',
    background: 'motel-interior', openingDialogue: 'ch2_enter_lobby', ambient: 'motel',
    objects: [
      { id: 'lobby_desk', name: '관리실 데스크', x: 75, y: 25, w: 18, h: 18, decor: 'table',
        inspectText: '서랍 안에 "204"라고 적힌 열쇠가 있다.',
        givesItem: 'room_204_key', oneShot: true },
      { id: 'lobby_cabinet', name: '캐비닛', x: 8, y: 30, w: 16, h: 30, decor: 'cabinet',
        inspectText: '안에는 깨진 라이터가 있다. "M.H" 이니셜.',
        givesItem: 'broken_lighter', oneShot: true },
      { id: 'lobby_carpet', name: '피 묻은 카펫', x: 40, y: 70, w: 25, h: 18, decor: 'carpet',
        inspectText: '카펫에 검붉은 얼룩. 사람 모양처럼 번져 있다.',
        revealsClue: 'lobby_blood', oneShot: true },
      { id: 'lobby_painting', name: '벽의 그림', x: 30, y: 10, w: 22, h: 20, decor: 'painting',
        inspectText: '여자의 초상화. 눈이 사라져 있다. 누군가 일부러 긁어냈다.' },
      { id: 'lobby_clock', name: '벽시계', x: 60, y: 8, w: 14, h: 14, decor: 'pendant',
        inspectText: '시계는 12:00에서 멈춰 있다.' },
      { id: 'lobby_shadow', name: '그림자', x: 88, y: 50, w: 8, h: 35, decor: 'shadow_female',
        inspectText: '구석에 누가 서 있다. 움직이지 않는다.',
        revealsClue: 'lobby_shadow' },
    ],
    exits: [
      { to: 'motel_corridor', label: '복도로' },
    ],
    passengerEvent: 'whisper',
  },
  motel_corridor: {
    id: 'motel_corridor', chapter: 2, name: '모텔 복도',
    background: 'motel-corridor', ambient: 'motel',
    objects: [
      { id: 'corridor_201', name: '201호 문', x: 8, y: 30, w: 16, h: 25, decor: 'door',
        inspectText: '"201". 열려 있다.' },
      { id: 'room_204_door', name: '204호 문', x: 70, y: 30, w: 18, h: 28, decor: 'door',
        inspectText: '"204". 잠겨 있다. 열쇠가 필요하다.',
        requiresItem: 'room_204_key', triggersPuzzle: 'room_204_lock' },
      { id: 'corridor_window', name: '복도 창문', x: 50, y: 10, w: 22, h: 18, decor: 'window',
        inspectText: '밖은 어둡다. 안개가 자욱하다.' },
      { id: 'corridor_candle', name: '촛대', x: 35, y: 65, w: 8, h: 18, decor: 'candle',
        inspectText: '꺼져있다. 그을음이 많다.' },
      { id: 'corridor_stairs', name: '지하 계단', x: 88, y: 60, w: 10, h: 28, decor: 'stairs',
        inspectText: '지하로 내려가는 계단. 작은 문에 자물쇠가 달려 있다.',
        requiresItem: undefined, // ledger 단서로 푸는 퍼즐
        triggersPuzzle: 'basement_code' },
      { id: 'corridor_shadow', name: '벽의 그림자', x: 20, y: 60, w: 12, h: 25, decor: 'shadow',
        inspectText: '벽에 희미한 그림자. 마치 누가 지나간 것처럼…',
        revealsClue: 'corridor_shadow' },
    ],
    exits: [
      { to: 'motel_lobby', label: '로비로' },
      { to: 'room_201', label: '201호로', requiresFlag: 'room_201_open' },
    ],
  },
  room_201: {
    id: 'room_201', chapter: 2, name: '201호 — 캠퍼의 방',
    background: 'motel-room', ambient: 'motel',
    objects: [
      { id: 'room201_bed', name: '침대', x: 10, y: 50, w: 30, h: 22, decor: 'bed',
        inspectText: '정리되어 있다. 머리카락 한 올이 베개에.',
        revealsClue: 'room_201_bed' },
      { id: 'room201_cabinet', name: '옷장', x: 70, y: 25, w: 18, h: 30, decor: 'cabinet',
        inspectText: '안에 낡은 사진이 있다. 매디같이 생긴 여자.',
        givesItem: 'photo', oneShot: true },
      { id: 'room201_mirror', name: '거울', x: 45, y: 15, w: 14, h: 20, decor: 'mirror',
        inspectText: '거울 속에 매디가 아닌 누군가가 보인다. 당신을 향해 웃는다.',
        revealsClue: 'room_201_mirror' },
      { id: 'room201_phone', name: '탁자 위의 핸드폰', x: 40, y: 70, w: 12, h: 12, decor: 'phone',
        inspectText: '일기장 한 장이 떨어져 있다.',
        givesItem: 'diary_page', oneShot: true },
      { id: 'room201_window', name: '창문', x: 80, y: 60, w: 12, h: 18, decor: 'window',
        inspectText: '커튼 뒤로 검은 그림자가 스친다.' },
    ],
    exits: [{ to: 'motel_corridor', label: '복도로' }],
  },
  room_204: {
    id: 'room_204', chapter: 2, name: '204호 — 영구 숙박',
    background: 'motel-room', openingDialogue: 'ch2_room_204_open', ambient: 'motel',
    objects: [
      { id: 'room204_desk', name: '책상', x: 70, y: 25, w: 20, h: 22, decor: 'table',
        inspectText: '서랍 안에 모텔 장부가 있다.',
        givesItem: 'ledger', oneShot: true },
      { id: 'room204_bed', name: '피 묻은 침대', x: 10, y: 50, w: 30, h: 22, decor: 'bed',
        inspectText: '시트에 검붉은 얼룩. 사람 모양.',
        revealsClue: 'room_204_bed' },
      { id: 'room204_painting', name: '벽의 사진', x: 40, y: 10, w: 18, h: 22, decor: 'painting',
        inspectText: '한 여자가 찍혀 있다. 사진 속 여자가, 살짝 미소 짓는다.',
        revealsClue: 'room_204_photo' },
      { id: 'room204_wardrobe', name: '옷장', x: 80, y: 50, w: 15, h: 30, decor: 'cabinet',
        inspectText: '옷장 안, 바닥에 은색 열쇠가 떨어져 있다.',
        givesItem: 'silver_key', oneShot: true },
      { id: 'room204_basin', name: '세면대', x: 50, y: 70, w: 14, h: 14, decor: 'basin',
        inspectText: '하수구에서 끔찍한 냄새. 핏빛이 마른 흔적.' },
    ],
    exits: [
      { to: 'motel_corridor', label: '복도로' },
      { to: 'basement', label: '지하로', requiresFlag: 'basement_open' },
    ],
  },
  basement: {
    id: 'basement', chapter: 2, name: '지하',
    background: 'motel-basement', openingDialogue: 'ch2_basement_warning', ambient: 'basement',
    objects: [
      { id: 'basement_altar', name: '제단', x: 35, y: 25, w: 22, h: 25, decor: 'altar',
        inspectText: '뼈와 양초로 구성된 제단. 이상한 문자가 새겨져 있다.',
        revealsClue: 'basement_altar' },
      { id: 'basement_corpse', name: '시체', x: 65, y: 50, w: 18, h: 28, decor: 'corpse',
        inspectText: '1챕 사고 현장의 시체와 같다. 어떻게 여기에?',
        givesItem: 'bloodied_cloth', oneShot: true },
      { id: 'basement_car', name: '사고 차량', x: 10, y: 55, w: 22, h: 25, decor: 'wreck',
        inspectText: '1챕의 그 차다. 차 문이 열려 있다.',
        givesItem: 'gasoline', oneShot: true },
      { id: 'basement_exit', name: '뒷문', x: 88, y: 50, w: 10, h: 30, decor: 'door',
        inspectText: '밖으로 나갈 수 있다.' },
      { id: 'basement_candles', name: '촛대들', x: 50, y: 70, w: 18, h: 15, decor: 'candle',
        inspectText: '꺼져 있다. 누군가 일부러 끈 것 같다.' },
    ],
    exits: [
      { to: 'back_road', label: '뒷문으로' },
    ],
    passengerEvent: 'whisper',
  },

  // ============== CHAPTER 3 ==============
  back_road: {
    id: 'back_road', chapter: 3, name: '모텔 뒷도로',
    background: 'back-road', openingDialogue: 'ch3_back_road', ambient: 'road',
    objects: [
      { id: 'back_trash', name: '쓰레기통', x: 8, y: 50, w: 14, h: 22, decor: 'box',
        inspectText: '안에서 접힌 편지가 보인다. 매디의 것 같은 필체.',
        givesItem: 'final_letter', oneShot: true },
      { id: 'back_chair', name: '낡은 벤치', x: 35, y: 65, w: 22, h: 18, decor: 'chair',
        inspectText: '아무것도 없다. 그런데 따뜻하다, 마치 누가 앉았던 것처럼.' },
      { id: 'back_window', name: '모텔 뒷창', x: 60, y: 15, w: 22, h: 22, decor: 'window_back',
        inspectText: '안에서 누군가 당신을 본다.' },
      { id: 'back_car', name: '차', x: 80, y: 55, w: 18, h: 28, decor: 'final_car',
        inspectText: '캠핑카. 시동은 걸 수 있다. 기름이 필요해.',
        requiresItem: 'gasoline' },
    ],
    exits: [
      { to: 'final_road', label: '도로 끝으로' },
    ],
    passengerEvent: 'silhouette',
  },
  final_road: {
    id: 'final_road', chapter: 3, name: '도로 끝',
    background: 'final-road', ambient: 'final',
    objects: [
      { id: 'final_sign', name: '도로 표지판', x: 5, y: 25, w: 18, h: 20, decor: 'sign',
        inspectText: '"DEAD END". 이제 갈 곳이 없다.' },
      { id: 'final_charm', name: '부적', x: 40, y: 60, w: 14, h: 14, decor: 'pendant',
        inspectText: '땅에 떨어져 있다. 가까이만 해도 손이 떨린다.',
        givesItem: 'charm', oneShot: true },
      { id: 'final_ring', name: '결혼반지', x: 60, y: 50, w: 10, h: 12, decor: 'pendant',
        inspectText: '도로 한가운데. 매디의 반지.',
        givesItem: 'wedding_ring', oneShot: true },
      { id: 'final_passenger', name: '패신저', x: 78, y: 30, w: 18, h: 50, decor: 'shadow_female',
        inspectText: '매디의 형상. 당신을 본다. 미소 짓는다. 손을 뻗는다.',
        revealsClue: 'final_passenger', triggersPuzzle: 'final_choice' },
    ],
    exits: [],
    passengerEvent: 'final',
  },
  ending: {
    id: 'ending', chapter: 3, name: '엔딩',
    background: 'road-night', ambient: 'silence',
    objects: [], exits: [],
  },
};
