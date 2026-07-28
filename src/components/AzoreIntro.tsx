import { useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';

interface AzoreIntroProps {
  onComplete: () => void;
}

const WORDS = ['Welcome', 'to', 'Azore', 'World'];

// Group bubbles into words so flex-wrap doesn't break them mid-word
const WORDS_DATA: { word: string; key: string; letters: { ch: string; idx: number; key: string }[] }[] = [];
let totalBubbles = 0;
(() => {
  let bi = 0;
  WORDS.forEach((w, wi) => {
    const letters = w.split('').map((ch) => {
      const item = { ch, idx: bi, key: `b${bi}` };
      bi += 1;
      return item;
    });
    WORDS_DATA.push({ word: w, key: `w${wi}`, letters });
  });
  totalBubbles = bi;
})();
const NB = totalBubbles;

export function AzoreIntro({ onComplete }: AzoreIntroProps) {
  const [leaving, setLeaving] = useState(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const doneRef = useRef(false);

  const finish = () => {
    if (doneRef.current) return;
    doneRef.current = true;
    onCompleteRef.current();
  };

  useEffect(() => {
    const lastIn = 0.15 + (NB - 1) * 0.07 + 0.55;
    const hold = Math.max(2300, lastIn * 1000 + 450);
    const t1 = window.setTimeout(() => setLeaving(true), hold);
    const t2 = window.setTimeout(finish, hold + 750);
    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, []);

  const skip = () => {
    if (leaving) return;
    setLeaving(true);
    window.setTimeout(finish, 700);
  };

  const denom = Math.max(1, NB - 1);
  const half = (NB - 1) / 2;

  return (
    <div
      className={`azore-intro ${leaving ? 'leaving' : ''}`}
      onClick={skip}
      role="button"
      aria-label="Skip intro"
    >
      <div className="azore-intro-glow" />
      <h1 className="azore-intro-title">
        {WORDS_DATA.map((w, wi) => (
          <span key={w.key} className="azore-intro-word" style={{ display: 'inline-flex', whiteSpace: 'nowrap' }}>
            {w.letters.map((it) => {
              // Rainbow arc: lift the middle letters, tilt along the curve.
              const lift = 0.75 * Math.sin((Math.PI * it.idx) / denom);
              const ty = -lift;
              const rot = (it.idx - half) / Math.max(1, half) * 9;
              
              const style: CSSProperties = {
                animationDelay: `${0.15 + it.idx * 0.07}s`,
                // Note: The actual glossy gradient is applied via index.css !important overrides now,
                // so we don't strictly need to inline background here, but we'll leave the filter glow.
              };
              
              return (
                <span
                  className="az-bubble-slot"
                  key={it.key}
                  style={{ transform: `translateY(${ty}em) rotate(${rot}deg)` }}
                >
                  <span className="az-bubble" style={style}>
                    {it.ch}
                  </span>
                </span>
              );
            })}
            {wi < WORDS_DATA.length - 1 && <span className="az-bubble-gap" />}
          </span>
        ))}
      </h1>
      <span className="azore-intro-tag">tap anywhere to skip</span>
    </div>
  );
}
