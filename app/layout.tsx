import type { Metadata } from 'next';
import './globals.css';
import { TopNav } from '@/components/TopNav';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
  title: {
    default: '심야 (深夜) — 공포 이야기 피드',
    template: '%s | 심야',
  },
  description: '카드에 답하기만 하면 무서운 이야기가 완성되는 공포 SNS. AI가 매일 깊은 밤 이야기를 들려줍니다.',
  keywords: ['공포이야기', '공포 SNS', '심야', 'Creepypasta', '공포 단편', '야간 콘텐츠'],
  openGraph: {
    title: '심야 (深夜) — 공포 이야기 피드',
    description: '카드 한 장으로 시작되는 공포 이야기. 매일 밤 새로운 소름.',
    type: 'website',
    locale: 'ko_KR',
    siteName: '심야',
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // [2026-08-16] 로그인 제거. 항상 익명.
  return (
    <html lang="ko" className="dark">
      <body>
        <TopNav />
        <div className="pt-14">{children}</div>
      </body>
    </html>
  );
}
