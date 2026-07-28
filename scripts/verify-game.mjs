// Temporary end-to-end verification for the 3D world (uses system Edge).
import { chromium } from 'playwright';

const BASE = 'http://localhost:5377';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitFor(page, fn, timeout = 15000, label = 'condition') {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const val = await page.evaluate(fn);
    if (val) return val;
    await sleep(250);
  }
  throw new Error(`Timeout waiting for ${label}`);
}

const dbg = (expr) => `window.__isoDebug ? window.__isoDebug.${expr} : null`;

async function main() {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });

  // ============ DESKTOP FLOW ============
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.on('pageerror', (e) => console.log('PAGE ERROR:', e.message));
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await waitFor(page, () => window.__isoDebug !== undefined && window.__isoDebug !== null, 10000, 'debug handle');
  await sleep(2000);

  const startTile = await page.evaluate(dbg('charTile()'));
  console.log('1. start tile:', JSON.stringify(startTile));
  if (!startTile || startTile.x !== 4 || startTile.y !== 3) throw new Error('unexpected start tile');

  await page.screenshot({ path: 'verify-1-world-day.png' });
  console.log('2. day world screenshot saved');

  // --- Toggle to Dark Mode (cyber) and screenshot ---
  await page.click('.theme-toggle');
  await sleep(900);
  await page.screenshot({ path: 'verify-2-world-cyber.png' });
  console.log('2b. cyber world screenshot saved (dark mode toggle works)');
  await page.click('.theme-toggle'); // back to day
  await sleep(900);

  // --- Hidden traps: query them from the game ---
  const traps = await page.evaluate(dbg('traps()'));
  console.log('2c. hidden trap tiles:', JSON.stringify(traps));
  if (!Array.isArray(traps) || traps.length === 0) throw new Error('no hidden traps generated');

  // --- Click the GOAL flag tile (8,8) → should walk then win ---
  const goalScreen = await page.evaluate(dbg('tileScreen(8, 8, 1)'));
  console.log('3. goal tile screen pos:', JSON.stringify(goalScreen));
  await page.mouse.click(goalScreen.x, goalScreen.y);
  await sleep(400);
  const modeAfterClick = await page.evaluate(dbg('mode()'));
  console.log('4. mode after clicking goal:', modeAfterClick);
  if (modeAfterClick !== 'walking') throw new Error('character did not start walking after click');
  await page.screenshot({ path: 'verify-3-walking.png' });

  await waitFor(page, () => window.__isoDebug.overlay() === 'win', 20000, 'win overlay');
  console.log('5. WIN toast appeared!');
  await sleep(600);
  await page.screenshot({ path: 'verify-4-win.png' });

  // --- Play again → back to start ---
  await page.click('text=Play Again');
  await waitFor(
    page,
    () => { const t = window.__isoDebug.charTile(); return t.x === 4 && t.y === 3; },
    5000,
    'reset to start'
  );
  console.log('6. after Play Again, character is back at start ✓');

  // --- Click a HIDDEN trap tile → tile shrinks, character falls, game over ---
  const trap = traps[0];
  const trapScreen = await page.evaluate(dbg(`tileScreen(${trap.x}, ${trap.y}, ${trap.z})`));
  console.log('7. hidden trap tile screen pos:', JSON.stringify(trapScreen), 'for trap', JSON.stringify(trap));
  await page.mouse.click(trapScreen.x, trapScreen.y);

  // Capture the moment the hidden tile shrinks and the boy tumbles in
  await waitFor(page, () => window.__isoDebug.mode() === 'falling', 25000, 'falling mode');
  await sleep(400);
  await page.screenshot({ path: 'verify-5-shrinking.png' });

  await waitFor(page, () => window.__isoDebug.overlay() === 'gameover', 25000, 'gameover toast');
  console.log('8. GAME OVER toast appeared (hidden trap: shrink + fall)!');
  await sleep(400);
  await page.screenshot({ path: 'verify-6-gameover.png' });

  await page.click('text=Try Again');
  await sleep(500);

  // --- Drag pan should NOT move the character ---
  await page.mouse.move(400, 400);
  await page.mouse.down();
  await page.mouse.move(550, 480, { steps: 12 });
  await page.mouse.up();
  await sleep(400);
  const afterPan = await page.evaluate(dbg('charTile()'));
  if (afterPan.x !== 4 || afterPan.y !== 3) throw new Error('drag-pan wrongly moved the character');
  console.log('9. drag-pan did not trigger movement ✓');
  await page.close();

  // ============ MOBILE TAP FLOW ============
  const mobile = await browser.newContext({
    viewport: { width: 390, height: 700 },
    hasTouch: true,
    isMobile: true,
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15'
  });
  const mpage = await mobile.newPage();
  mpage.on('pageerror', (e) => console.log('MOBILE PAGE ERROR:', e.message));
  await mpage.goto(BASE, { waitUntil: 'networkidle' });
  await waitFor(mpage, () => window.__isoDebug !== undefined && window.__isoDebug !== null, 10000, 'debug handle (mobile)');
  await sleep(2000);
  await mpage.screenshot({ path: 'verify-5-mobile.png' });

  const tapTarget = await mpage.evaluate(dbg('tileScreen(6, 3, 1)'));
  console.log('10. mobile tap target (6,3):', JSON.stringify(tapTarget));
  await mpage.touchscreen.tap(tapTarget.x, tapTarget.y);
  await waitFor(
    mpage,
    () => { const t = window.__isoDebug.charTile(); return t.x === 6 && t.y === 3; },
    15000,
    'character arrival after tap'
  );
  console.log('11. mobile tap moved the character to (6,3) ✓');
  await mpage.screenshot({ path: 'verify-6-mobile-moved.png' });

  await browser.close();
  console.log('ALL E2E CHECKS PASSED');
}

main().catch((e) => {
  console.error('E2E FAILED:', e.message);
  process.exit(1);
});
