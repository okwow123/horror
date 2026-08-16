// 시드 스크립트: 크롤 소스를 DB 에 한 번 등록.
// 실행: npx tsx scripts/seed-sources.ts
//
// 필요 env: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//
// 사용:
//   npx tsx scripts/seed-sources.ts
//   npx tsx scripts/seed-sources.ts add   # 강제 추가
//   npx tsx scripts/seed-sources.ts remove # 모두 비활성화

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
config({ path: '.env.local' });
config({ path: '.env' });

const SEEDS = [
  {
    name: 'Creepypasta (영문 메인)',
    url: 'https://www.creepypasta.com/',
    type: 'creepypasta_list',
    meta: {},
  },
  {
    name: 'Naver Blog — 공포이야기 (검색 API)',
    url: 'naver://blog-search',
    type: 'naver_blog',
    meta: { query: '공포이야기 실화', display: 10 },
  },
  {
    name: 'Reddit r/nosleep (영문, 주간 top)',
    url: 'https://www.reddit.com/r/nosleep/top.json?t=week',
    type: 'reddit_subreddit',
    meta: { subreddit: 'nosleep', sort: 'top', time: 'week', limit: 10 },
  },
  {
    name: 'Reddit r/scarystories (영문, 주간 top)',
    url: 'https://www.reddit.com/r/scarystories/top.json?t=week',
    type: 'reddit_subreddit',
    meta: { subreddit: 'scarystories', sort: 'top', time: 'week', limit: 10 },
  },
];

async function main() {
  const cmd = process.argv[2] ?? 'seed';
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 가 필요해요');
    process.exit(1);
  }
  const supabase = createClient(url, key, { auth: { persistSession: false } });

  if (cmd === 'remove') {
    await supabase.from('crawl_sources').update({ active: false }).neq('id', '00000000-0000-0000-0000-000000000000');
    console.log('모든 소스 비활성화 완료');
    return;
  }

  for (const s of SEEDS) {
    const { data: existing } = await supabase
      .from('crawl_sources')
      .select('id')
      .eq('url', s.url)
      .maybeSingle();

    if (existing && cmd !== 'add') {
      console.log(`• skip: ${s.name} (이미 있음)`);
      continue;
    }
    if (existing && cmd === 'add') {
      await supabase.from('crawl_sources').update({ active: true, ...s }).eq('id', existing.id);
      console.log(`• update: ${s.name}`);
      continue;
    }
    const { error } = await supabase.from('crawl_sources').insert({ ...s, active: true });
    if (error) {
      console.error(`• fail: ${s.name}`, error.message);
    } else {
      console.log(`• add: ${s.name}`);
    }
  }
}

main().catch(e => { console.error(e); process.exit(1); });
