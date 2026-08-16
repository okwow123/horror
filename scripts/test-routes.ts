// 라우트 내부 함수가 새 combo 시스템으로 정상 동작하는지 확인.
// DB 가 필요 없는 generateRandomHorrorStory 만 테스트 (DB insert 안 함).

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

function loadEnvFile(path: string) {
  if (!existsSync(path)) return;
  const content = readFileSync(path, 'utf-8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq < 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = val;
  }
}

loadEnvFile(resolve(process.cwd(), '.env.local'));

if (!process.env.MINIMAX_API_KEY) {
  console.error('❌ MINIMAX_API_KEY not loaded');
  process.exit(1);
}

async function main() {
  console.log('');
  console.log('=== generateRandomHorrorStory × 2 ===');
  console.log('');

  for (let i = 0; i < 2; i++) {
    process.stdout.write(`  생성 ${i + 1}... `);
    const { generateRandomHorrorStory } = await import('../lib/random-story');
    const result = await generateRandomHorrorStory();
    console.log('✓');
    console.log(`    제목:   ${result.title}`);
    console.log(`    concept: place=${result.concept.place} / ${result.concept.tone}`);
    console.log(`    분량:   ${result.content.length}자`);
    console.log(`    fallback: ${result.usedFallback}`);
    console.log(`    본문 미리보기: ${result.content.slice(0, 80)}...`);
    console.log('');
  }

  console.log('=== generateAutoStory × 2 (DB 호출 없음, 시그니처만 확인) ===');
  console.log('');
  // generateAutoStory 는 DB 조회 안 하므로 직접 호출 가능
  for (let i = 0; i < 2; i++) {
    process.stdout.write(`  생성 ${i + 1}... `);
    const { generateAutoStory } = await import('../lib/auto-story');
    const result = await generateAutoStory();
    console.log('✓');
    console.log(`    제목:   ${result.title}`);
    console.log(`    concept: ${JSON.stringify(result.concept)}`);
    console.log(`    분량:   ${result.content.length}자`);
    console.log(`    sources.origin: ${result.sources.origin}`);
    console.log('');
  }
}

main().catch(e => {
  console.error('FATAL:', e);
  process.exit(1);
});
