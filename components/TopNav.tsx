'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { clsx } from 'clsx';
import { Home, Plus, Gamepad2 } from 'lucide-react';

export function TopNav() {
  const pathname = usePathname();

  return (
    <header className="fixed top-0 inset-x-0 z-50 bg-midnight-900/80 backdrop-blur-md border-b border-midnight-700">
      <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <span className="text-2xl font-serif text-blood-500 tracking-widest">심야</span>
          <span className="text-[10px] text-midnight-400 hidden sm:inline">深夜</span>
        </Link>

        <nav className="flex items-center gap-1">
          <NavLink href="/" active={pathname === '/'} icon={<Home size={20} />} />
          <NavLink href="/post/create" active={pathname === '/post/create'} icon={<Plus size={20} />} />
          <NavLink href="/haunted" active={pathname === '/haunted'} icon={<Gamepad2 size={20} />} />
        </nav>
      </div>
    </header>
  );
}

function NavLink({ href, active, icon }: { href: string; active: boolean; icon: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={clsx(
        'w-9 h-9 flex items-center justify-center rounded-lg transition',
        active ? 'text-blood-500 bg-midnight-800' : 'text-midnight-300 hover:text-white hover:bg-midnight-800',
      )}
    >
      {icon}
    </Link>
  );
}
