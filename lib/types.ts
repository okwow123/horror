// Supabase 가 생성한 타입을 직접 export 하는 대신 도메인 단위로 좁혀서 사용한다.
// 추후 `supabase gen types typescript` 로 자동 생성된 타입으로 교체 가능.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Profile {
  id: string;
  username: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  is_bot: boolean;
  created_at: string;
  updated_at: string;
}

export interface Post {
  id: string;
  user_id: string | null;
  title: string | null;
  content: string;
  image_url: string | null;
  source_url: string | null;
  is_auto: boolean;
  is_anonymous: boolean;
  likes_count: number;
  comments_count: number;
  created_at: string;
}

export interface PostWithAuthor extends Post {
  author: Pick<Profile, 'id' | 'username' | 'display_name' | 'avatar_url' | 'is_bot'> | null;
  viewer_has_liked?: boolean;
}

export interface Comment {
  id: string;
  user_id: string;
  post_id: string;
  content: string;
  created_at: string;
  author?: Pick<Profile, 'id' | 'username' | 'display_name' | 'avatar_url' | 'is_bot'>;
}

export interface FollowRow {
  follower_id: string;
  following_id: string;
  created_at: string;
}

export interface CardAnswer {
  id: string;
  user_id: string;
  answers: Record<string, string>;
  post_id: string | null;
  created_at: string;
}

export interface CrawlSource {
  id: string;
  name: string;
  url: string;
  type: string;
  active: boolean;
  last_crawled_at: string | null;
  meta: Json;
  created_at: string;
}

export interface CrawlItem {
  id: string;
  source_id: string;
  raw_title: string | null;
  raw_content: string;
  raw_url: string | null;
  language: string;
  processed: boolean;
  used_at: string | null;
  created_at: string;
}

// 카드 질문 정의 — 클라이언트/서버/프롬프트가 공유
export interface CardQuestion {
  id: string;
  emoji: string;
  question: string;
  type: 'yesno' | 'choice' | 'text';
  options?: { value: string; label: string }[];
  followUp?: {
    when: string; // 직전 답변 값
    question: string;
    options?: { value: string; label: string }[];
  };
}

export const STORY_CARDS: CardQuestion[] = [
  {
    id: 'q1',
    emoji: '👻',
    question: '귀신을 본 적 있어?',
    type: 'yesno',
  },
  {
    id: 'q2_where',
    emoji: '📍',
    question: '어디서 봤어?',
    type: 'choice',
    options: [
      { value: 'water', label: '물가 (강/바다/호수)' },
      { value: 'school', label: '학교' },
      { value: 'office', label: '회사/직장' },
      { value: 'home', label: '집/집 근처' },
      { value: 'hospital', label: '병원' },
      { value: 'road', label: '도로/골목' },
      { value: 'other', label: '기타 (직접 입력)' },
    ],
  },
  {
    id: 'q2_other',
    emoji: '✍️',
    question: '어떤 곳이었는지 알려줘',
    type: 'text',
  },
  {
    id: 'q3_alone',
    emoji: '👤',
    question: '그때 혼자였어?',
    type: 'yesno',
  },
  {
    id: 'q4_time',
    emoji: '🌙',
    question: '시간대는?',
    type: 'choice',
    options: [
      { value: 'dawn', label: '새벽 (0~5시)' },
      { value: 'night', label: '밤 (저녁~자정)' },
      { value: 'evening', label: '저녁 (18~21시)' },
      { value: 'day', label: '낮' },
    ],
  },
  {
    id: 'q5_feel',
    emoji: '🥶',
    question: '그때 기분이 어땠어?',
    type: 'choice',
    options: [
      { value: 'fear', label: '그냥 무서웠다' },
      { value: 'chills', label: '등줄기에 소름' },
      { value: 'void', label: '허무했다' },
      { value: 'anger', label: '화가 났다' },
      { value: 'paralysis', label: '몸이 안 움직였다' },
    ],
  },
  {
    id: 'q6_tell_free',
    emoji: '✒️',
    question: '썰 좀 풀어볼래? (선택사항)',
    type: 'text',
  },
];
