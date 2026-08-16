// PASSENGER: ROAD OF DEATH — 게임 페이지
// CHAPTER 1 플레이 가능. 로컬스토리지에 자동 저장.

import { PassengerGame } from '@/components/PassengerGame';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'PASSENGER: ROAD OF DEATH — 공포게임',
  description: '브라우저에서 즐기는 2D 호러 미스터리. CHAPTER 1~3 풀 게임. 엔딩 A/B/C.',
};

export default function PassengerGamePage() {
  return <PassengerGame />;
}
