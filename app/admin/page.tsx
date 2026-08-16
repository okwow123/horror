import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/server';
import { AdminDashboard } from '@/components/AdminDashboard';
import Link from 'next/link';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function AdminPage() {
  // 로그인 체크 (anon)
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=/admin');

  // 상태 데이터 (service_role)
  const admin = createServiceClient();

  const [sourcesRes, queueRes, postsRes, botRes] = await Promise.all([
    admin.from('crawl_sources').select('id, name, type, active, last_crawled_at, url').order('created_at', { ascending: false }),
    admin.from('crawl_items').select('id', { count: 'exact', head: true }).eq('processed', false),
    admin.from('posts').select('id, title, is_auto, created_at, image_url, source_url').order('created_at', { ascending: false }).limit(10),
    admin.from('profiles').select('id, username, display_name, is_bot').eq('is_bot', true).limit(1).maybeSingle(),
  ]);

  const initial = {
    sources: sourcesRes.data ?? [],
    sources_error: sourcesRes.error?.message,
    queue_pending: queueRes.count ?? 0,
    bot: botRes.data,
    bot_configured: !!process.env.SIMYA_BOT_USER_ID,
    recent_posts: postsRes.data ?? [],
  };

  return (
    <main className="max-w-3xl mx-auto px-4 py-6 space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-3xl font-serif text-blood-500">관리자</h1>
        <Link href="/" className="text-sm text-midnight-400 hover:text-white">피드로</Link>
      </header>

      <AdminDashboard initial={initial} />
    </main>
  );
}
