'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { UserPlus, UserCheck, Loader2 } from 'lucide-react';

export function FollowButton({ targetId, initialFollowing }: { targetId: string; initialFollowing: boolean }) {
  const [following, setFollowing] = useState(initialFollowing);
  const [loading, setLoading] = useState(false);

  const toggle = async () => {
    setLoading(true);
    const prev = following;
    setFollowing(!prev);
    try {
      const res = await fetch('/api/follow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetId }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setFollowing(data.following);
    } catch {
      setFollowing(prev);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={cn(
        'flex items-center gap-1.5 px-4 py-1.5 text-sm rounded-lg border transition',
        following
          ? 'bg-midnight-800 border-midnight-600 text-midnight-200 hover:border-blood-700'
          : 'bg-blood-700 border-blood-600 text-white hover:bg-blood-600',
        loading && 'opacity-60',
      )}
    >
      {loading ? <Loader2 size={14} className="animate-spin" /> : following ? <UserCheck size={14} /> : <UserPlus size={14} />}
      {following ? '팔로잉' : '팔로우'}
    </button>
  );
}
