// 6차원 변수 시스템 실제 LLM 호출 테스트.
// 인스타 캡션 모드 3개 (L1, L3, L5) + 본문 모드 1개 (L4) 생성.
//
// 실행: npx tsx scripts/test-instagram.ts
//
// 주의: ES module import hoist 때문에 .env 로드 후 dynamic import 사용.

import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

// .env.local 직접 파싱 (dotenv 가 cwd 인식 못 하는 케이스 대비)
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
    if (!(key in process.env)) {
      process.env[key] = val;
    }
  }
}

loadEnvFile(resolve(process.cwd(), '.env.local'));
loadEnvFile(resolve(process.cwd(), '.env'));

if (!process.env.MINIMAX_API_KEY) {
  console.error('❌ MINIMAX_API_KEY not loaded. .env.local 확인 필요.');
  process.exit(1);
}
console.log('✓ .env.local loaded (MINIMAX_API_KEY:', process.env.MINIMAX_API_KEY.slice(0, 6) + '...)');

// --- dynamic import: lib 가 process.env 읽기 전에 .env 가 로드되도록 ---
import type { Combo, LevelItem, GeneratedStory } from '../lib/combo-story';

async function main() {
  const { rollCombo, generateStoryFromCombo, LEVELS } = await import('../lib/combo-story');

  function pickLeveledCombo(targetCode: string): Combo {
    for (let i = 0; i < 10; i++) {
      const c = rollCombo();
      if (c.level.code === targetCode) return c;
    }
    const c = rollCombo();
    const target = LEVELS.find((l: LevelItem) => l.code === targetCode);
    if (target) {
      c.level = target;
      c.code = `${c.setting.code}-${c.protagonist.code}-${c.fear.code}-${c.trigger.code}-${c.ending.code}-${c.level.code}`;
    }
    return c;
  }

  function hr(char = '─', len = 70) {
    return char.repeat(len);
  }

  function printCombo(c: Combo) {
    console.log(`  [${c.code}]`);
    console.log(`    Setting     ${c.setting.code} · ${c.setting.name}`);
    console.log(`    Protagonist ${c.protagonist.code} · ${c.protagonist.name}`);
    console.log(`    Fear        ${c.fear.code} · ${c.fear.name}`);
    console.log(`    Trigger     ${c.trigger.code} · ${c.trigger.name}`);
    console.log(`    Ending      ${c.ending.code} · ${c.ending.name}`);
    console.log(`    Level       ${c.level.code} · ${c.level.name}`);
  }

  function printInstagramStory(idx: number, story: GeneratedStory) {
    console.log(hr('═'));
    console.log(`📸 INSTAGRAM #${idx}  ·  [${story.combo.code}]`);
    console.log(hr('═'));
    printCombo(story.combo);
    console.log('');
    console.log(`  ▸ 제목:    ${story.title}`);
    console.log(`  ▸ 캡션 (${story.caption.length}자):`);
    console.log('');
    story.caption.split('\n').forEach((line: string) => console.log(`    ${line}`));
    console.log('');
    console.log(`  ▸ 해시태그: ${story.hashtags}`);
    if (process.env.DEBUG_RAW) {
      console.log('');
      console.log(`  ── raw (${story.raw.length}자) ──`);
      console.log(story.raw.slice(0, 500));
      console.log('');
    }
    console.log('');
  }

  function printFullStory(story: GeneratedStory) {
    console.log(hr('═'));
    console.log(`📖 FULL STORY  ·  [${story.combo.code}]`);
    console.log(hr('═'));
    printCombo(story.combo);
    console.log('');
    console.log(`  ▸ 제목: ${story.title}`);
    console.log(`  ▸ 분량: ${story.caption.length}자`);
    console.log('');
    console.log(hr('·'));
    console.log('');
    console.log(story.caption);
    console.log('');
    console.log(hr('·'));
    console.log('');
    if (process.env.DEBUG_RAW) {
      console.log(`── raw (${story.raw.length}자) ──`);
      console.log(story.raw.slice(0, 800));
    }
  }

  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║  HORROR COMBO · 실제 LLM 호출 테스트                                ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝');
  console.log('');

  // --- 인스타 캡션 3개 (L1, L3, L5) ---
  const levelTargets = ['L1', 'L3', 'L5'];
  for (let i = 0; i < levelTargets.length; i++) {
    const target = levelTargets[i];
    const combo = pickLeveledCombo(target);
    process.stdout.write(`  ⏳ Instagram ${target} 생성 중...`);
    try {
      const story = await generateStoryFromCombo(combo, 'instagram');
      process.stdout.write(' ✓\n');
      printInstagramStory(i + 1, story);
    } catch (e: any) {
      process.stdout.write(` ✗\n  Error: ${e.message}\n\n`);
    }
  }

  // --- 본문 1개 (L4) ---
  const fullCombo = pickLeveledCombo('L4');
  process.stdout.write(`  ⏳ Full L4 생성 중...`);
  try {
    const story = await generateStoryFromCombo(fullCombo, 'full');
    process.stdout.write(' ✓\n');
    printFullStory(story);
  } catch (e: any) {
    process.stdout.write(` ✗\n  Error: ${e.message}\n`);
  }

  // --- 진단 ---
  console.log(hr('═'));
  console.log('📊 진단 체크리스트');
  console.log(hr('═'));
  console.log('');
  console.log('  - 4개 생성에서 Level 별 강도 차이가 보이는가');
  console.log('  - Setting × Protagonist 가 자연스러운가');
  console.log('  - 인스타 캡션 분량이 200~400자 안에 있는가');
  console.log('  - 해시태그가 5~10개로 생성되는가');
  console.log('  - 본문 마지막 1줄이 여운을 남기는가');
  console.log('');
}

main().catch(e => {
  console.error('FATAL:', e);
  process.exit(1);
});
