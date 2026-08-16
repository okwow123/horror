// PASSENGER: ROAD OF DEATH — 게임 상태 타입
//
// CHAPTER 1 (사고 → 캠핑카 → 모텔 진입) 의 플레이 루프.
// CHAPTER 2 (모텔 내부 탐험 → 손님 정체) 의 플레이 루프.
// CHAPTER 3 (최종 대결 → 진실 / 도주 엔딩) 의 플레이 루프.
//
// 게임 전체 상태는 GameState 한 객체에서 관리.
// 모든 변경은 dispatch(GameAction)을 통해.

export type Chapter = 1 | 2 | 3;
export type LocationId =
  | 'title'
  // CHAPTER 1
  | 'road'
  | 'accident'
  | 'camper'
  | 'motel'         // 모텔 외관/진입
  // CHAPTER 2
  | 'motel_lobby'   // 모텔 로비
  | 'motel_corridor'// 복도
  | 'room_201'      // 객실 201 (캠퍼가 묵던 방)
  | 'room_204'      // 객실 204 (문이 잠긴 방)
  | 'basement'      // 지하
  // CHAPTER 3
  | 'back_road'     // 모텔 뒷도로
  | 'final_road'    // 도로 끝 / 진실의 장소
  // 엔딩
  | 'ending';

export type ItemId =
  // CHAPTER 1
  | 'flashlight'
  | 'battery'
  | 'old_key'        // 모텔 출입문 열쇠
  | 'note_road'
  | 'license_memo'
  | 'carving_slate'
  | 'map_piece'
  | 'handkerchief'
  | 'matches'
  // CHAPTER 2
  | 'room_204_key'   // 204호 열쇠
  | 'photo'          // 오래된 사진
  | 'diary_page'     // 일기장 한 장
  | 'broken_lighter' // 깨진 라이터
  | 'bloodied_cloth' // 핏빛 천
  | 'ledger'         // 모텔 장부
  | 'silver_key'     // 은색 열쇠 (지하)
  | 'gasoline'       // 기름통
  // CHAPTER 3
  | 'final_letter'   // 마지막 편지
  | 'wedding_ring'   // 결혼반지
  | 'charm';         // 부적

export interface Item {
  id: ItemId;
  name: string;
  description: string;
  icon: string;       // emoji 또는 단어
  chapter: Chapter;
  usableOn?: string[]; // 사용 가능 대상 (location, puzzle id 등)
}

export interface ClueEntry {
  id: string;
  category: 'accident' | 'passenger' | 'motel' | 'misc' | 'truth' | 'escape';
  text: string;
  foundAt: number;     // timestamp
}

export type PuzzleId =
  | 'camper_battery'
  | 'note_decode'
  | 'motel_safe'
  | 'room_204_lock'
  | 'basement_code'
  | 'final_choice';

export interface Puzzle {
  id: PuzzleId;
  type: 'combination' | 'item_use' | 'observe' | 'choice';
  chapter: Chapter;
  prompt: string;
  answer: string;
  options?: string[];  // choice 타입
  clues: string[];    // 단서 ID 또는 객체 ID
  reward?: ItemId;
  onSolve?: {
    setFlag?: string;
    setEnding?: 'A' | 'B' | 'C';
    goto?: LocationId;
  };
}

export type DialogueId =
  // CHAPTER 1
  | 'intro'
  | 'accident_after'
  | 'first_man'
  | 'camper_search'
  | 'radio_on'
  | 'passenger_warning'
  | 'chase_begin'
  | 'ending_a'
  // CHAPTER 2
  | 'ch2_enter_lobby'
  | 'ch2_find_photo'
  | 'ch2_room_204_open'
  | 'ch2_basement_warning'
  | 'ch2_basement_reveal'
  | 'ch2_passenger_close'
  // CHAPTER 3
  | 'ch3_back_road'
  | 'ch3_final_choice_a'
  | 'ch3_final_choice_b'
  | 'ch3_truth_reveal'
  | 'ch3_escape_run'
  // 엔딩
  | 'ending_b'
  | 'ending_c';

export interface DialogueLine {
  speaker: '매디' | '타일러' | '라디오' | '???';
  text: string;
}

export interface Dialogue {
  id: DialogueId;
  lines: DialogueLine[];
  next?: LocationId;  // 끝나면 이동할 장소
  setFlag?: string;   // 끝나면 flag 설정
}

export interface ObjectDef {
  id: string;            // location 안에서의 고유 ID
  name: string;
  /** 화면 좌표 (퍼센트) */
  x: number;
  y: number;
  w: number;
  h: number;
  /** 조사했을 때 텍스트 */
  inspectText: string;
  /** 클릭 시 자동 획득되는 아이템 */
  givesItem?: ItemId;
  /** 클릭 시 자동으로 발견되는 단서 (clueId) */
  revealsClue?: string;
  /** 클릭 시 진행되는 퍼즐 */
  triggersPuzzle?: PuzzleId;
  /** 한 번만 트리거되는지 */
  oneShot?: boolean;
  /** 처음에는 클릭 불가능 (조건 필요) */
  requiresItem?: ItemId;
  /** 좌측 정렬 아이콘 (decoration) */
  decor?:
    | 'tree' | 'rock' | 'sign' | 'shadow' | 'door' | 'window' | 'mirror'
    | 'radio' | 'bed' | 'box' | 'fridge' | 'table' | 'flashlight' | 'phone'
    | 'key' | 'note' | 'van' | 'wreck' | 'man'
    | 'cabinet' | 'carpet' | 'painting' | 'stairs' | 'candle' | 'basin'
    | 'corpse' | 'altar' | 'pendant' | 'chair' | 'couch' | 'window_back'
    | 'lever' | 'final_car' | 'shadow_female';
}

export interface LocationDef {
  id: LocationId;
  chapter: Chapter;
  name: string;
  /** 배경 SVG 패턴 (그라디언트 ID) */
  background:
    | 'road-night' | 'accident-night' | 'camper-interior' | 'camper-exterior'
    | 'motel-interior' | 'motel-corridor' | 'motel-room' | 'motel-basement'
    | 'back-road' | 'final-road';
  /** 시작 시 자동으로 표시되는 다이얼로그 */
  openingDialogue?: DialogueId;
  /** 조사 가능한 오브젝트들 */
  objects: ObjectDef[];
  /** 인접한 장소 (이동 버튼) */
  exits: Array<{ to: LocationId; label: string; requiresFlag?: string }>;
  /** 패신저 위협도가 일정 이상이면 발생하는 이벤트 */
  passengerEvent?: 'silhouette' | 'mirror' | 'window' | 'chase' | 'whisper' | 'final';
  /** BGM/ambient 모드 */
  ambient: 'road' | 'forest' | 'camper' | 'motel' | 'silence' | 'tension' | 'basement' | 'final';
}

export interface GameState {
  chapter: Chapter;
  location: LocationId;
  inventory: ItemId[];
  clues: ClueEntry[];
  solvedPuzzles: PuzzleId[];
  triggeredObjects: string[];   // oneShot 트리거된 object id들
  flags: Record<string, boolean | number | string>;
  passengerThreat: number;      // 0~100
  currentTime: string;          // "23:47"
  gameStartedAt: number;
  gameOver: null | 'caught' | 'escaped' | 'truth';
  ending: null | 'A' | 'B' | 'C';
  soundEnabled: boolean;
}

export type GameAction =
  | { type: 'START_NEW_GAME' }
  | { type: 'LOAD_GAME'; state: GameState }
  | { type: 'MOVE'; to: LocationId }
  | { type: 'TRIGGER_OBJECT'; objectId: string }
  | { type: 'PICK_ITEM'; item: ItemId }
  | { type: 'USE_ITEM'; item: ItemId; on: string }
  | { type: 'COMBINE'; a: ItemId; b: ItemId }
  | { type: 'SOLVE_PUZZLE'; puzzleId: PuzzleId; answer: string }
  | { type: 'ADD_CLUE'; clue: ClueEntry }
  | { type: 'SET_FLAG'; key: string; value: boolean | number | string }
  | { type: 'TICK_TIME' }
  | { type: 'PASSENGER_TICK' }
  | { type: 'GAME_OVER'; reason: 'caught' | 'escaped' | 'truth' }
  | { type: 'SET_ENDING'; ending: 'A' | 'B' | 'C' }
  | { type: 'TOGGLE_SOUND' }
  | { type: 'RESET' };
