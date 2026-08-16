import { HauntedGame } from '@/components/HauntedGame';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export default function HauntedPage() {
  return (
    <main className="max-w-2xl mx-auto px-4 py-8">
      <HauntedGame />
    </main>
  );
}
