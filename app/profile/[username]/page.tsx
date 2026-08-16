import { notFound, redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { fetchFeed } from '@/lib/posts';
import { FollowButton } from '@/components/FollowButton';
import { Feed } from '@/components/Feed';
import { User as UserIcon } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function ProfilePage({ params }: { params: { username: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, username, display_name, bio, avatar_url, is_bot, created_at')
    .eq('username', params.username)
    .maybeSingle();

  if (error || !profile) notFound();

  // 팔로워/팔로잉 카운트
  const { count: followersCount } = await supabase
    .from('follows')
    .select('*', { count: 'exact', head: true })
    .eq('following_id', profile.id);

  const { count: followingCount } = await supabase
    .from('follows')
    .select('*', { count: 'exact', head: true })
    .eq('follower_id', profile.id);

  // 내가 이 사람을 팔로우 중인지
  let viewerFollowing = false;
  if (user && user.id !== profile.id) {
    const { data } = await supabase
      .from('follows')
      .select('follower_id')
      .eq('follower_id', user.id)
      .eq('following_id', profile.id)
      .maybeSingle();
    viewerFollowing = !!data;
  }

  // 그 사람의 글들
  const { posts, nextCursor } = await fetchFeed({ authorId: profile.id, viewerId: user?.id ?? null });

  return (
    <main className="max-w-2xl mx-auto px-4 py-8">
      <header className="flex items-start gap-5 mb-8">
        <div className="w-20 h-20 rounded-full bg-midnight-700 flex items-center justify-center overflow-hidden flex-shrink-0">
          {profile.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <UserIcon size={32} className="text-midnight-300" />
          )}
        </div>
        <div className="flex-1 min-w-0 space-y-2">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-serif text-white truncate">
              {profile.display_name || profile.username}
            </h1>
            {profile.is_bot && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-blood-900/50 text-blood-300 border border-blood-800/50">
                BOT
              </span>
            )}
          </div>
          <p className="text-sm text-midnight-400">@{profile.username}</p>
          {profile.bio && <p className="text-sm text-midnight-200 whitespace-pre-line">{profile.bio}</p>}
          <div className="flex items-center gap-4 text-xs text-midnight-400 pt-1">
            <span><b className="text-white">{posts.length}+</b> 이야기</span>
            <span><b className="text-white">{followersCount ?? 0}</b> 팔로워</span>
            <span><b className="text-white">{followingCount ?? 0}</b> 팔로잉</span>
          </div>
          {user && user.id !== profile.id && (
            <div className="pt-2">
              <FollowButton targetId={profile.id} initialFollowing={viewerFollowing} />
            </div>
          )}
        </div>
      </header>

      <Feed initialPosts={posts} initialCursor={nextCursor} viewerId={user?.id ?? null} />
    </main>
  );
}
