let audioCtx: AudioContext | null = null;
function getAudioContext(): AudioContext {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}
export function playStepSound(muted: boolean = false) {
  if (muted) return;
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(140 + Math.random() * 40, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.08);
  } catch (e) {
    console.warn('Audio play error:', e);
  }
}
export function playClickSound(muted: boolean = false) {
  if (muted) return;
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(440, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.06);
    gain.gain.setValueAtTime(0.1, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.06);
  } catch (e) {
    console.warn('Audio play error:', e);
  }
}
const loseSounds = ['/lose.mp3', '/lose1.mp3', '/lose2.mp3', '/lose3.mp3', '/lose4.mp3', '/lose5.mp3'];
let loseIndex = 0;

export function playFallSound(muted: boolean = false) {
  if (muted) return;
  try {
    const src = loseSounds[loseIndex];
    loseIndex = (loseIndex + 1) % loseSounds.length;
    const audio = new Audio(src);
    audio.play().catch(e => console.warn('Audio play error:', e));
  } catch (e) {
    console.warn('Audio play error:', e);
  }
}
const winSounds = ['/won.mp3', '/won1.mp3', '/won2.mp3', '/won3.mp3'];
let winIndex = 0;

export function playWinSound(muted: boolean = false) {
  if (muted) return;
  try {
    const src = winSounds[winIndex];
    winIndex = (winIndex + 1) % winSounds.length;
    const audio = new Audio(src);
    audio.play().catch(e => console.warn('Audio play error:', e));
  } catch (e) {
    console.warn('Audio play error:', e);
  }
}

const winstreakSounds = ['/winstreak.mp3', '/winstreak1.mp3', '/winstreak2.mp3', '/winstreak3.mp3'];
let winstreakIndex = 0;

export function playWinstreakSound(muted: boolean = false) {
  if (muted) return;
  try {
    const src = winstreakSounds[winstreakIndex];
    winstreakIndex = (winstreakIndex + 1) % winstreakSounds.length;
    const audio = new Audio(src);
    audio.play().catch(e => console.warn('Audio play error:', e));
  } catch (e) {
    console.warn('Audio play error:', e);
  }
}
export function playPopSound(muted: boolean = false) {
  if (muted) return;
  try {
    const ctx = getAudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(700, ctx.currentTime + 0.12);
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.12);
  } catch (e) {
    console.warn('Audio play error:', e);
  }
}
