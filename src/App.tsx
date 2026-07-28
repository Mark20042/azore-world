import { useState, useCallback, useEffect, useRef } from 'react';
import { ThreeWorld } from './components/ThreeWorld';
import { Sun, Moon, Trophy, Skull, RotateCcw, Smartphone, Volume2, VolumeX } from 'lucide-react';
import type { LightingMode, MapPreset, CharacterState } from './types/game';
import { MAP_PRESETS, generateRandomMap } from './utils/maps';
import { LIGHTING_PALETTES } from './utils/isometric';
import { playClickSound } from './utils/audio';
import { InstructionsModal } from './components/InstructionsModal';
import { AzoreIntro } from './components/AzoreIntro';
type BootPhase = 'intro' | 'instructions' | 'ready';
export function App() {
  const [wins, setWins] = useState(0);
  const [losses, setLosses] = useState(0);
  const [winstreak, setWinstreak] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [mapPreset, setMapPreset] = useState<MapPreset>(MAP_PRESETS[0]);
  const [lighting, setLighting] = useState<LightingMode>('day');
  const [characterState, setCharacterState] = useState<CharacterState>({
    ...MAP_PRESETS[0].startPos,
    facing: 'SE',
    isMoving: false,
    speechText: null,
    speechEmoji: null,
    speechId: Date.now()
  });
  const [phase, setPhase] = useState<BootPhase>(() =>
    typeof navigator !== 'undefined' && navigator.webdriver ? 'ready' : 'intro'
  );
  const [firstVisit, setFirstVisit] = useState(false);
  const firstVisitRef = useRef(false);
  useEffect(() => {
    const migrate = (newKey: string, oldKey: string) => {
      if (localStorage.getItem(newKey) === null) {
        const old = localStorage.getItem(oldKey);
        if (old !== null) localStorage.setItem(newKey, old);
      }
    };
    migrate('azore_world_visited', 'openworld3d_visited');
    migrate('azore_world_wins', 'openworld3d_wins');
    migrate('azore_world_losses', 'openworld3d_losses');
    const visited = localStorage.getItem('azore_world_visited') === 'true';
    setFirstVisit(!visited);
    const savedWins = parseInt(localStorage.getItem('azore_world_wins') || '0', 10);
    const savedLosses = parseInt(localStorage.getItem('azore_world_losses') || '0', 10);
    const savedStreak = parseInt(localStorage.getItem('azore_world_winstreak') || '0', 10);
    setWins(savedWins);
    setLosses(savedLosses);
    setWinstreak(savedStreak);
    setMapPreset(prev => generateRandomMap(prev.id, savedWins));
  }, []);
  useEffect(() => { firstVisitRef.current = firstVisit; }, [firstVisit]);
  const handleGameOver = useCallback((isWin: boolean) => {
    setWins(prevWins => {
      const newWins = isWin ? prevWins + 1 : prevWins;
      localStorage.setItem('azore_world_wins', newWins.toString());
      setLosses(prevLosses => {
        const newLosses = !isWin ? prevLosses + 1 : prevLosses;
        localStorage.setItem('azore_world_losses', newLosses.toString());
        setMapPreset(prev => generateRandomMap(prev.id, newWins));
        return newLosses;
      });
      setWinstreak(prevStreak => {
        const newStreak = isWin ? prevStreak + 1 : 0;
        localStorage.setItem('azore_world_winstreak', newStreak.toString());
        return newStreak;
      });
      return newWins;
    });
  }, []);
  const isDark = lighting === 'cyber';
  const skyBackground = LIGHTING_PALETTES[lighting].skyBg;
  const resetStats = () => {
    if (window.confirm('Are you sure you want to reset your wins and losses?')) {
      playClickSound(false);
      setWins(0);
      setLosses(0);
      setWinstreak(0);
      localStorage.setItem('azore_world_wins', '0');
      localStorage.setItem('azore_world_losses', '0');
      localStorage.setItem('azore_world_winstreak', '0');
      setMapPreset(prev => generateRandomMap(prev.id, 0));
    }
  };
  const toggleTheme = () => {
    playClickSound(false);
    setLighting(prev => (prev === 'day' ? 'cyber' : 'day'));
  };
  const closeInstructions = () => {
    playClickSound(false);
    localStorage.setItem('azore_world_visited', 'true');
    setPhase('ready');
  };
  const handleIntroComplete = useCallback(() => {
    setPhase(firstVisitRef.current ? 'instructions' : 'ready');
  }, []);
  return (
    <main
      className="relative w-screen h-screen overflow-hidden transition-all duration-700"
      style={{
        background: skyBackground,
        width: '100vw',
        height: '100vh',
        position: 'fixed',
        top: 0,
        left: 0,
        touchAction: 'none' 
      }}
    >
      {}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: isDark
            ? 'radial-gradient(circle at 50% 40%, rgba(192,132,252,0.14), transparent 70%)'
            : 'radial-gradient(circle at 50% 40%, rgba(255,255,255,0.18), transparent 70%)',
          width: '100%',
          height: '100%'
        }}
      />
      {/* Developer Name Watermark Removed from here */}
      {}
      <div className="stats-container">
        <div className="stat-pill wins">
          <Trophy size={18} />
          <span>{wins}</span>
        </div>
        <div className="stat-pill losses">
          <Skull size={18} />
          <span>{losses}</span>
        </div>
        <button 
          onClick={resetStats}
          className="stat-pill reset-btn"
          title="Reset Stats"
          style={{ pointerEvents: 'auto' }}
        >
          <RotateCcw size={16} />
          <span>Reset</span>
        </button>
        <a 
          href="https://markjoseph.is-a.dev" 
          target="_blank" 
          rel="noopener noreferrer" 
          className="stat-pill dev-pill" 
          style={{ pointerEvents: 'auto', textDecoration: 'none', color: 'rgba(255,255,255,0.85)' }}
        >
          Developed By: <span style={{ color: '#ffffff', fontWeight: 600 }}>Mark Joseph Potot</span>
        </a>
      </div>
      <div className="landscape-suggestion">
        <Smartphone size={18} className="landscape-icon" />
        <span>Rotate device for better experience</span>
      </div>
      {}
      <ThreeWorld
        mapPreset={mapPreset}
        lighting={lighting}
        characterState={characterState}
        setCharacterState={setCharacterState}
        onGameOver={handleGameOver}
        wins={wins}
        winstreak={winstreak}
        isMuted={isMuted}
      />
      <div className="top-right-controls" style={{ display: 'flex', gap: '12px', zIndex: 100, alignItems: 'center' }}>
        <button 
          onClick={() => setIsMuted(prev => !prev)}
          className="stat-pill"
          title={isMuted ? "Unmute Sound" : "Mute Sound"}
          style={{ pointerEvents: 'auto', padding: '0 12px', height: '32px' }}
        >
          {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
        </button>
        <button
          className={`theme-toggle ${isDark ? 'dark' : 'light'}`}
          onClick={toggleTheme}
          title={isDark ? 'Switch to Light Mode (Day)' : 'Switch to Dark Mode (Cyber)'}
          aria-label="Toggle dark and light mode"
          style={{ position: 'relative', top: '0', right: '0' }}
        >
          <span className="theme-toggle-track">
            <Sun className="theme-toggle-sun" />
            <Moon className="theme-toggle-moon" />
            <span className="theme-toggle-thumb" />
          </span>
        </button>
      </div>
      {/* Azore World boot: intro → instructions (first visit) → world */}
      {phase === 'intro' && <AzoreIntro onComplete={handleIntroComplete} />}
      {phase === 'instructions' && <InstructionsModal onClose={closeInstructions} />}
    </main>
  );
}
export default App;
