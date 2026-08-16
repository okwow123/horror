// 봇 유저 1회 생성 스크립트.
// 사용: npx tsx scripts/create-bot.ts
//
// 동작:
//   1) Supabase admin API 로 simya-bot@simya.app 계정 생성 (없으면)
//   2) profiles 의 username/display_name/is_bot 세팅
//   3) .env.local 에 SIMYA_BOT_USER_ID 자동 추가 (없으면)
//
// 결과: 콘솔에 UUID 출력 + .env.local 갱신 + 다음 단계 안내.

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
config({ path: '.env.local' });
config({ path: '.env' });

const BOT_EMAIL = 'simya-bot@simya.app';
const BOT_PASSWORD = 'simya-bot-no-login-' + Math.random().toString(36).slice(2, 12);
const BOT_USERNAME = '__simya_bot';
const BOT_DISPLAY = '심야의 그림자';

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 필요 (.env.local)');
    process.exit(1);
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } });

  // 1) 기존 봇 프로필이 있는지 먼저 확인
  const { data: existing } = await supabase
    .from('profiles')
    .select('id')
    .eq('is_bot', true)
    .maybeSingle();

  let botId: string;

  if (existing) {
    botId = existing.id;
    console.log(`[bot] 기존 봇 발견: ${botId}`);
  } else {
    // 2) auth.users 에 admin create
    const { data: created, error: createErr } = await supabase.auth.admin.createUser({
      email: BOT_EMAIL,
      password: BOT_PASSWORD,
      email_confirm: true,
      user_metadata: {
        username: BOT_USERNAME,
        display_name: BOT_DISPLAY,
        is_bot: true,
      },
    });

    if (createErr || !created.user) {
      console.error('[bot] auth user 생성 실패:', createErr?.message);
      process.exit(1);
    }
    botId = created.user.id;
    console.log(`[bot] auth user 생성됨: ${botId}`);

    // 3) 트리거가 profiles 만들었을 텐데, 그래도 한 번 더 안전하게 갱신
    await supabase
      .from('profiles')
      .update({
        username: BOT_USERNAME,
        display_name: BOT_DISPLAY,
        is_bot: true,
      })
      .eq('id', botId);
    console.log(`[bot] profiles 갱신됨`);
  }

  // 4) .env.local 에 SIMYA_BOT_USER_ID 추가/갱신
  const envPath = resolve(process.cwd(), '.env.local');
  let envContent = existsSync(envPath) ? readFileSync(envPath, 'utf-8') : '';
  const lines = envContent.split('\n');
  const idx = lines.findIndex(l => l.startsWith('SIMYA_BOT_USER_ID='));
  if (idx >= 0) {
    lines[idx] = `SIMYA_BOT_USER_ID=${botId}`;
  } else {
    lines.push(`SIMYA_BOT_USER_ID=${botId}`);
  }
  envContent = lines.join('\n');
  writeFileSync(envPath, envContent, 'utf-8');
  console.log(`[bot] .env.local 갱신됨: SIMYA_BOT_USER_ID=${botId}`);

  console.log('\n========================================');
  console.log('봇 유저 준비 완료!');
  console.log('========================================');
  console.log(`UUID: ${botId}`);
  console.log(`이메일: ${BOT_EMAIL}`);
  console.log(`Username: ${BOT_USERNAME}`);
  console.log(`Display name: ${BOT_DISPLAY}`);
  console.log('');
  console.log('다음 단계:');
  console.log('  1) dev 서버 재시작 (env 변경 반영)');
  console.log('  2) /admin 접속 → "풀 사이클" 클릭');
  console.log('  3) Reddit 긁어와서 심야의 그림자 가 자동으로 글을 올림');
}

main().catch(e => { console.error(e); process.exit(1); });
