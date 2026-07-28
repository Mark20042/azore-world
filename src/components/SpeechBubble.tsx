import React, { useEffect, useRef } from 'react';
import anime from '../utils/anime';
interface SpeechBubbleProps {
  text: string;
  emoji?: string | null;
  screenX: number;
  screenY: number;
  speechId: number;
}
export const SpeechBubble: React.FC<SpeechBubbleProps> = ({
  text,
  emoji = '😳',
  screenX,
  screenY,
  speechId
}) => {
  const bubbleRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!bubbleRef.current) return;
    anime({
      targets: bubbleRef.current,
      scale: [0.2, 1],
      opacity: [0, 1],
      translateY: [15, 0],
      duration: 450,
      easing: 'easeOutElastic(1, .6)'
    });
  }, [speechId]);
  return (
    <div
      ref={bubbleRef}
      className="speech-bubble-wrapper"
      style={{
        left: `${screenX}px`,
        top: `${screenY}px`,
      }}
    >
      <div className="speech-bubble-card">
        <span className="speech-bubble-text">{text}</span>
        {emoji && <span className="speech-bubble-emoji">{emoji}</span>}
        {}
        <div className="speech-arrow-outer" />
        <div className="speech-arrow-inner" />
      </div>
    </div>
  );
};
