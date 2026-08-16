// 즉시 테스트용 사전 시드 스토리 3건 (crawl_items + posts 동시).
// 사용: npx tsx scripts/seed-stories.ts
//   (필요: .env.local 의 SUPABASE_URL / SERVICE_ROLE_KEY, 봇 유저 또는 본인 유저)

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
config({ path: '.env.local' });
config({ path: '.env' });

const STORIES = [
  {
    title: '새벽 3시, 엘리베이터',
    content: `회사에서 야근하고 집에 가는 길. 지하철을 타고 아파트 근처 역에 도착한 건 새벽 3시가 조금 넘은 시각이었다.

엘리베이터 앞에 섰을 때, 이상한 냄새가 코끝을 찔렀다. 금속성 냄새. 아니, 그게 아니라, 젖은 천 냄새. 아니, 이도 아닌 것 같은.

엘리베이터 문이 열렸다. 누가 타고 있었다. 모자를 깊이 눌러쓴, 키 큰 남자. 표정이 보이지 않았다. 나를 보지 않았다. 다만, 손에 무언가를 들고 있었다. 작고, 흰, 네모난 것.

15층을 눌렀다. 내 집은 12층. 남자는 버튼을 누르지 않았다. 15층은 우리 집 윗층이고, 그 윗층은 아무도 살지 않는 폐쇄된 세대다.

12층에서 내렸다. 내릴 때, 무의식적으로 엘리베이터 쪽을 봤다. 남자는 여전히 같은 자세. 같은 모자. 같은 손에 든, 같은 하얀 네모.

문을 닫고, 계단을 통해 15층까지 올라갔다. 폐쇄 세대. 열리지 않는 문. 문 앞에 하얀 네모가 하나 놓여 있었다. 사진이었다. 사진 속에는 내가, 방금, 엘리베이터에 타고 있는 내가 찍혀 있었다.

지금도 그 사진은 내 책상 서랍에 있다. 매일 밤, 그 위층에서 발자국 소리가 난다.`,
    source_url: 'seed://simya/story-1',
  },
  {
    title: '낮에는 아무도 없는 카페',
    content: `집 앞 작은 카페. 낮에는 항상 문이 닫혀 있다. 점장이 혼자 운영하는데, 밤에만 영업을 한다고 들었다.

한번은 친구와 약속이 늦어져서 새벽 1시쯤 그 카페에 들어간 적이 있다. 따뜻한 조명, 어두운 원목 인테리어, 잔잔한 재즈.

카운터에 사람이 없었다. 종을 누르자, 주방 쪽에서 점장이 나왔다. 중년 여성. 표정이 거의 없었다. 눈이 초점을 잃은 것 같았다.

"뭐 드릴까요."
"아메리카노요."

커피를 받고, 자리에 앉았다. 친구는 10분 뒤에 온다고 했다. 10분 동안, 카페 안에는 나 혼자. 그리고 점장.

5분쯤 지났을 때, 주방에서 작은 소리가 났다. 찻잔 부딪히는 소리. 아니, 그것보다 작고, 날카로운 소리. 손톱으로 컵 모서리를 두드리는 것 같은.

불을 끄지 않았는데, 카페 안이 조금 어두워진 것 같았다. 시선이 올라갔다. 점장이 카운터에 기대서서, 나를 보고 있었다.

"또 오셨네요."

나는 처음 왔다.

친구가 도착해서 밖으로 나왔을 때, 한 번 더 돌아봤다. 카페의 조명은 켜져 있었지만, 쇼윈도 너머로 보이는 카운터에는 아무도 없었다.`,
    source_url: 'seed://simya/story-2',
  },
  {
    title: '거울 속의 나',
    content: `이사한 지 한 달. 새집은 괜찮았는데, 화장실 거울만 이상했다. 항상, 내가 들어간 다음, 뭔가 다른 게 느껴졌다.

처음엔 그게 뭔지 몰랐다. 그냥 시선이 어색한 정도. 하지만, 어느 날 아침, 이를 닦다가 깨달았다.

거울 속의 내가, 약간 늦게 움직인다는 것을.

이를 닦는다. 거울 속의 나도 닦는다. 하지만 0.5초 정도 늦게.

고개를 갸웃한다. 거울 속의 나도 갸웃한다. 0.5초 늦게.

나는 아무 말도 하지 않았다. 거울 속의 나도 아무 말도 하지 않았다. 하지만, 눈이 마주치는 순간, 거울 속의 나는, 살짝, 정말 살짝, 입꼬리를 올렸다.

나는 그날 밤부터, 화장실 문을 닫고 들어가지 않았다.

며칠 뒤, 친구가 우리 집에 놀러 왔다. 그 친구는 잘 때, 화장실에 다녀오는 버릇이 있다. 새벽 2시쯤, 친구가 화장실에 들어갔고, 한참이 지나도 나오지 않았다.

찾아갔을 때, 친구는 거울 앞에 서서, 거울 속의 자신을 바라보고 있었다. 친구의 눈이 정상은 아니었다. 마치, 무언가를 보고, 무언가를 듣고, 무언가를 이해한 사람처럼.

"야, 거울 좀 봐. 너 늦게 움직이는 거 봤어?"

친구가 고개를 돌려 나를 봤다. 그 표정에는 공포가 아니라, 이해할 수 없는, 아주 차분한 미소가 걸려 있었다.

"다 늦는 게 아니야. 몇 명은, 더 빨라."

그날 이후, 그 친구는 우리 집에 다시 오지 않았다. 거울도 내가 직접 천으로 덮었다. 지금도 덮여 있다.`,
    source_url: 'seed://simya/story-3',
  },
];

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 필요');
    process.exit(1);
  }
  const supabase = createClient(url, key, { auth: { persistSession: false } });

  // 봇 유저 찾기
  let botId = process.env.SIMYA_BOT_USER_ID;
  if (!botId) {
    const { data: bot } = await supabase
      .from('profiles')
      .select('id')
      .eq('is_bot', true)
      .limit(1)
      .maybeSingle();
    if (bot) {
      botId = bot.id;
      console.log(`[seed] 봇 유저 발견: ${botId}`);
    }
  }

  // 봇 유저가 없으면 시스템 유저로 fallback (anon key 없이 service role 로 insert)
  // service_role 로 직접 auth.users 에 insert 는 정책상 막혀있음 → 안내만
  if (!botId) {
    console.warn('[seed] 봇 유저 없음 (SIMYA_BOT_USER_ID / is_bot profile 둘 다 없음).');
    console.warn('[seed] 먼저 README 의 "봇 유저 만들기" 단계 수행 후 다시 실행하세요.');
    console.warn('[seed] 그래도 crawl_items 큐에만 3건 적재합니다.');
  }

  // 1) crawl_items 에 3건 적재
  let sourceId: string | null = null;
  const { data: src } = await supabase
    .from('crawl_sources')
    .select('id')
    .limit(1)
    .maybeSingle();
  if (src) sourceId = src.id;
  if (!sourceId) {
    // 시드 소스 생성
    const { data: newSrc, error: srcErr } = await supabase
      .from('crawl_sources')
      .insert({
        name: 'Simya Seed (테스트용)',
        url: 'seed://simya',
        type: 'rss',
        active: false,  // 자동 크롤 안 되게 OFF
        meta: { seed: true },
      })
      .select('id')
      .single();
    if (srcErr || !newSrc) {
      console.error('[seed] 시드 소스 생성 실패:', srcErr?.message);
      process.exit(1);
    }
    sourceId = newSrc.id;
  }

  for (const story of STORIES) {
    const { error } = await supabase.from('crawl_items').insert({
      source_id: sourceId,
      raw_title: story.title,
      raw_content: story.content,
      raw_url: story.source_url,
      language: 'ko',
      processed: false,
    });
    if (error) console.error(`[seed] crawl_items 실패: ${story.title}`, error.message);
    else console.log(`[seed] queued: ${story.title}`);
  }

  // 2) 바로 posts 에도 3건 게시 (봇 유저가 있을 때만)
  if (botId) {
    const { pickRandomImage } = await import('../lib/images');
    for (const story of STORIES) {
      const image = pickRandomImage(story.title);
      const { error } = await supabase.from('posts').insert({
        user_id: botId,
        title: story.title,
        content: story.content,
        image_url: image.url,
        source_url: story.source_url,
        is_auto: true,
      });
      if (error) console.error(`[seed] post 실패: ${story.title}`, error.message);
      else console.log(`[seed] posted: ${story.title}`);
    }
  }

  console.log('\n[seed] 완료. /admin 에서 상태 확인하거나 / 로 가서 피드 보세요.');
}

main().catch(e => { console.error(e); process.exit(1); });
