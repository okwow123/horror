import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { fetchFeed } from '@/lib/posts';
import { PostCard } from '@/components/PostCard';
import { User as UserIcon } from 'lucide-react';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function MyPostsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=/me/posts');

  const { data: profile } = await supabase
    .from('profiles')
    .select('username, display_name, avatar_url')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile?.username) {
    return (
      <main className="max-w-2xl mx-auto px-4 py-8 text-center">
        <p className="text-blood-500">프로필이 아직 없어요.</p>
      </main>
    );
  }

  const { posts, nextCursor } = await fetchFeed({ authorId: user.id, viewerId: user.id });

  return (
    <main className="max-w-2xl mx-auto px-4 py-6">
      <header className="mb-6 flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-midnight-700 flex items-center justify-center overflow-hidden flex-shrink-0">
          {profile.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <UserIcon size={24} className="text-midnight-300" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-serif text-white">내 이야기</h1>
          <p className="text-sm text-midnight-400">
            @{profile.username} · {posts.length}편의 이야기
          </p>
        </div>
        <Link
          href="/post/create"
          className="px-4 py-2 bg-blood-700 hover:bg-blood-600 text-white text-sm rounded-lg"
        >
          + 새 이야기
        </Link>
      </header>

      {posts.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <p className="text-4xl">🕯️</p>
          <p className="text-midnight-300">아직 이야기가 없어요.</p>
          <Link href="/post/create" className="inline-block text-sm text-blood-400 underline">
            첫 이야기 쓰러 가기
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {posts.map(post => (
            <PostCard key={post.id} post={post} viewerId={user.id} />
          ))}
        </div>
      )}

      <p className="mt-8 text-center text-xs text-midnight-500">
        피드 전체 보기 → <Link href="/" className="text-blood-400 underline">홈</Link>
      </p>
    </main>
  );
}
