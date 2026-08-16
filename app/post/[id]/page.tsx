import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { PostCard } from '@/components/PostCard';
import { timeAgo } from '@/lib/utils';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const supabase = createClient();
  const { data } = await supabase
    .from('posts')
    .select('title, content')
    .eq('id', params.id)
    .maybeSingle();
  if (!data) return { title: '이야기를 찾을 수 없음' };
  return {
    title: data.title || '공포 이야기',
    description: (data.content || '').slice(0, 140),
    openGraph: {
      title: data.title || '공포 이야기',
      description: (data.content || '').slice(0, 140),
      type: 'article',
    },
  };
}

export default async function PostDetailPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: post, error } = await supabase
    .from('posts')
    .select(`
      id, user_id, title, content, image_url, source_url, is_auto, is_anonymous,
      likes_count, comments_count, created_at,
      author:profiles!posts_user_id_fkey ( id, username, display_name, avatar_url, is_bot )
    `)
    .eq('id', params.id)
    .maybeSingle();

  if (error || !post) notFound();

  // JSON-LD
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title || '공포 이야기',
    articleBody: post.content,
    datePublished: post.created_at,
    author: post.author
      ? { '@type': 'Person', name: post.author.display_name || post.author.username }
      : { '@type': 'Organization', name: '심야' },
    publisher: { '@type': 'Organization', name: '심야 (深夜)' },
  };

  return (
    <main className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <PostCard post={post as any} viewerId={user?.id ?? null} />
      <p className="text-xs text-midnight-500 text-center">
        {timeAgo(post.created_at)}에 심야에 올라온 이야기
      </p>
    </main>
  );
}
