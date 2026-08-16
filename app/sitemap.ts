import { createClient } from '@/lib/supabase/server';
import type { MetadataRoute } from 'next';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  const supabase = createClient();
  let posts: { id: string; created_at: string }[] = [];
  try {
    const { data } = await supabase
      .from('posts')
      .select('id, created_at')
      .order('created_at', { ascending: false })
      .limit(500);
    posts = data ?? [];
  } catch {
    posts = [];
  }

  const postUrls = posts.map(p => ({
    url: `${base}/post/${p.id}`,
    lastModified: new Date(p.created_at),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));

  return [
    { url: base, lastModified: new Date(), changeFrequency: 'hourly', priority: 1.0 },
    { url: `${base}/login`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.3 },
    { url: `${base}/post/create`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    ...postUrls,
  ];
}
