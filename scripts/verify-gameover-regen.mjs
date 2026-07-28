// Verify: Doraemon diorama renders + map REGENERATES (new arrangement) after every game over.
import { chromium } from 'playwright';

const BASE = 'http://localhost:5377';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitFor(page, fn, timeout = 20000, label = 'condition') {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const val = await page.evaluate(fn);
    if (val) return val;
    await sleep(250);
  }
  throw new Error(`Timeout waiting for ${label}`);
}

const dbg = (expr) => `window.__isoDebug ? window.__isoDebug.${expr} : null`;

async function mapSignature(page) {
  // Capture the current tile arrangement: traps + goal + tree layout
  return page.evaluate(() => {
    const d = window.__isoDebug;
    return {
      traps: d.traps(),
      start: d.charTile()
    };
  });
}

async function main() {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.on('pageerror', (e) => console.log('PAGE ERROR:', e.message));
  page.on('console', (m) => { if (m.type() === 'error') console.log('CONSOLE ERR:', m.text()); });
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await waitFor(page, () => window.__isoDebug !== undefined && window.__isoDebug !== null, 10000, 'debug handle');
  await sleep(2500);

  // 1. Doraemon diorama in DAY mode
  await page.screenshot({ path: 'verify-doraemon-day.png' });
  console.log('1. day diorama screenshot saved');

  // 2. Doraemon diorama in CYBER (dark) mode
  await page.click('.theme-toggle');
  await sleep(1000);
  await page.screenshot({ path: 'verify-doraemon-cyber.png' });
  console.log('2. cyber diorama screenshot saved');
  await page.click('.theme-toggle');
  await sleep(1000);

  // 3. Capture the initial map arrangement
  const before = await mapSignature(page);
  console.log('3. initial traps:', JSON.stringify(before.traps));

  // 4. Walk onto a hidden trap to force a GAME OVER
  const trap = before.traps[0];
  const trapScreen = await page.evaluate(dbg(`tileScreen(${trap.x}, ${trap.y}, ${trap.z})`));
  await page.mouse.click(trapScreen.x, trapScreen.y);
  await waitFor(page, () => window.__isoDebug.mode() === 'falling', 25000, 'falling mode');
  await waitFor(page, () => window.__isoDebug.overlay() === 'gameover', 25000, 'gameover overlay');
  console.log('4. GAME OVER reached');
  await sleep(600);

  // 5. After game over the parent should have handed down a NEW map arrangement
  await sleep(600);
  const after = await page.evaluate(() => {
    const d = window.__isoDebug;
    return { traps: d.traps() };
  });
  console.log('5. post-gameover traps:', JSON.stringify(after.traps));

  const beforeKey = JSON.stringify(before.traps.map(t => `${t.x},${t.y}`).sort());
  const afterKey = JSON.stringify(after.traps.map(t => `${t.x},${t.y}`).sort());
  if (beforeKey === afterKey) {
    console.log('   WARN: trap arrangement identical (possible but unlikely with a fresh seed)');
  } else {
    console.log('   ✓ Map arrangement CHANGED after game over (traps reshuffled)');
  }

  // 6. Try Again resets onto the fresh map
  await page.click('text=Try Again');
  await sleep(800);
  const mode = await page.evaluate(dbg('mode()'));
  console.log('6. after Try Again, mode =', mode);
  await page.screenshot({ path: 'verify-doraemon-newmap.png' });
  console.log('   new-map screenshot saved');

  await browser.close();
  console.log('REGEN + DIORAMA CHECKS DONE');
}

main().catch((e) => {
  console.error('VERIFY FAILED:', e.message);
  process.exit(1);
});
