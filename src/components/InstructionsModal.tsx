import { useState } from 'react';
import type { ReactNode } from 'react';
import { ChevronRight, Play } from 'lucide-react';
import { playClickSound } from '../utils/audio';

interface InstructionsModalProps {
  onClose: () => void;
}

interface Step {
  title: string;
  text: string;
  tint: string;
  art: ReactNode;
}

const STEPS: Step[] = [
  {
    title: 'Reach the Flag',
    text: 'Tap an adjacent tile to move there. Make your way to the glowing flag tile to win the round.',
    tint: 'rgba(34, 197, 94, 0.13)',
    art: (
      <svg viewBox="0 0 160 90" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="56" y="54" width="48" height="14" rx="4" fill="#86efac" />
        <rect x="56" y="68" width="48" height="9" rx="4" fill="#4d7c0f" />
        <rect x="61" y="56" width="18" height="3" rx="1.5" fill="#bbf7d0" />
        <path d="M80 54V20" stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M80 22 L107 29 L80 36 Z" fill="#f43f5e" />
        <circle cx="80" cy="18" r="2.6" fill="#fbbf24" />
      </svg>
    )
  },
  {
    title: 'Hidden Traps',
    text: 'The map is full of hidden holes. Step on one and you fall straight through — game over.',
    tint: 'rgba(244, 63, 94, 0.12)',
    art: (
      <svg viewBox="0 0 160 90" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="28" y="54" width="40" height="14" rx="4" fill="#86efac" />
        <rect x="28" y="68" width="40" height="9" rx="4" fill="#4d7c0f" />
        <rect x="92" y="54" width="40" height="14" rx="4" fill="#86efac" />
        <rect x="92" y="68" width="40" height="9" rx="4" fill="#4d7c0f" />
        <ellipse cx="112" cy="61" rx="11" ry="6.5" fill="#0f172a" />
        <ellipse cx="112" cy="59.5" rx="9.5" ry="5" fill="#1e293b" />
        <path d="M112 39 L119 51 H105 Z" fill="#f59e0b" />
        <rect x="110.5" y="44" width="3" height="5" rx="1.5" fill="#0f172a" />
      </svg>
    )
  },
  {
    title: 'One Step at a Time',
    text: 'You can only move to a directly adjacent tile. Think ahead and plan a safe route.',
    tint: 'rgba(37, 99, 235, 0.10)',
    art: (
      <svg viewBox="0 0 160 90" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="24" y="54" width="40" height="14" rx="4" fill="#86efac" />
        <rect x="24" y="68" width="40" height="9" rx="4" fill="#4d7c0f" />
        <circle cx="44" cy="44" r="6.5" fill="#fbbf24" />
        <rect x="39.5" y="49" width="9" height="7" rx="2.5" fill="#3b82f6" />
        <path d="M70 58 H86" stroke="#6366f1" strokeWidth="3" strokeLinecap="round" />
        <path d="M80 53 L88 58 L80 63" stroke="#6366f1" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        <rect x="96" y="54" width="40" height="14" rx="4" fill="#bbf7d0" stroke="#22c55e" strokeWidth="2" strokeDasharray="3 3" />
        <rect x="96" y="68" width="40" height="9" rx="4" fill="#4d7c0f" />
      </svg>
    )
  },
  {
    title: 'Trembling Ground',
    text: 'The ground shakes when a trap is nearby. Use these tremors to deduce the safe path.',
    tint: 'rgba(217, 119, 6, 0.13)',
    art: (
      <svg viewBox="0 0 160 90" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="54" y="50" width="52" height="16" rx="4" fill="#fde68a" />
        <rect x="54" y="66" width="52" height="9" rx="4" fill="#a16207" />
        <path d="M36 58 q-7 0 -7 -7" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M124 58 q7 0 7 -7" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M36 66 q-7 0 -7 7" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M124 66 q7 0 7 7" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M66 38 q6 -5 12 0 t12 0" stroke="#22d3ee" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M66 30 q6 -5 12 0 t12 0" stroke="#22d3ee" strokeWidth="2.5" strokeLinecap="round" opacity="0.6" />
      </svg>
    )
  },
  {
    title: 'Rising Difficulty',
    text: 'Every win adds more traps and shrinks the warning radius. How far can you climb?',
    tint: 'rgba(124, 58, 237, 0.12)',
    art: (
      <svg viewBox="0 0 160 90" fill="none" xmlns="http://www.w3.org/2000/svg">
        <line x1="30" y1="78" x2="132" y2="78" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round" />
        <rect x="40" y="60" width="18" height="18" rx="3" fill="#a3e635" />
        <rect x="64" y="50" width="18" height="28" rx="3" fill="#facc15" />
        <rect x="88" y="40" width="18" height="38" rx="3" fill="#fb923c" />
        <rect x="112" y="28" width="18" height="50" rx="3" fill="#f43f5e" />
        <path d="M40 56 L130 24" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="4 4" />
        <path d="M126 20 L132 24 L126 28" stroke="#6366f1" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    )
  },
];

export function InstructionsModal({ onClose }: InstructionsModalProps) {
  const [step, setStep] = useState(0);
  const isLast = step === STEPS.length - 1;
  const current = STEPS[step];

  const next = () => {
    playClickSound(false);
    if (isLast) {
      onClose();
      return;
    }
    setStep(s => s + 1);
  };

  const back = () => {
    playClickSound(false);
    if (step > 0) setStep(s => s - 1);
  };

  return (
    <div className="azore-instructions">
      <div className="azore-instructions-card" key={step}>
        <div className="az-step-head">
          <span className="az-step-kicker">How to Play</span>
          <span className="az-step-counter"> {step + 1} / {STEPS.length}</span>
        </div>
        <div className="az-step-art" style={{ background: current.tint }}>
          {current.art}
        </div>
        <h2 className="azore-step-title">{current.title}</h2>
        <p className="azore-step-text">{current.text}</p>
        <div className="azore-step-dots">
          {STEPS.map((_, i) => (
            <span key={i} className={`azore-dot ${i === step ? 'active' : ''}`} />
          ))}
        </div>
        <div className="azore-step-actions">
          {step > 0 && (
            <button className="azore-step-btn ghost" onClick={back}>
              Back
            </button>
          )}
          <button className="azore-step-btn" onClick={next}>
            {isLast ? (
              <>
                <Play size={16} /> Let&apos;s Play!
              </>
            ) : (
              <>
                Next <ChevronRight size={16} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
