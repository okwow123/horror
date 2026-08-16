import Link from 'next/link';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function Card({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      className={cn(
        'group relative block p-6 rounded-2xl border border-midnight-700 bg-gradient-to-br from-midnight-800 to-midnight-900',
        'shadow-xl transition-all duration-200',
        'hover:border-blood-600 hover:shadow-[0_0_40px_rgba(127,29,29,0.35)] hover:-translate-y-0.5',
      )}
    >
      <div className="space-y-3">{children}</div>
      <div className="absolute top-4 right-4 text-[10px] uppercase tracking-widest text-midnight-500 group-hover:text-blood-400 transition">
        선택 →
      </div>
    </Link>
  );
}

export function CardLabel({ children }: { children: ReactNode }) {
  return (
    <div className="text-[10px] uppercase tracking-widest text-blood-400/80">
      {children}
    </div>
  );
}

export function CardTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="text-xl font-serif text-white flex items-center gap-2">
      {children}
    </h2>
  );
}

export function CardDescription({ children }: { children: ReactNode }) {
  return <p className="text-sm text-midnight-300 leading-relaxed">{children}</p>;
}
