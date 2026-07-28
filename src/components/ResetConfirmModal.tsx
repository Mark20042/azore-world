import { AlertTriangle } from 'lucide-react';
import { playClickSound } from '../utils/audio';

interface ResetConfirmModalProps {
  onConfirm: () => void;
  onCancel: () => void;
}

export function ResetConfirmModal({ onConfirm, onCancel }: ResetConfirmModalProps) {
  return (
    <div className="azore-instructions" style={{ zIndex: 9999 }}>
      <div className="azore-instructions-card" style={{ maxWidth: '400px', textAlign: 'center' }}>
        <div className="az-step-art" style={{ background: 'rgba(239, 68, 68, 0.12)', margin: '0 auto 24px', width: '80px', height: '80px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <AlertTriangle size={40} color="#ef4444" />
        </div>
        <h2 className="azore-step-title" style={{ background: 'linear-gradient(180deg, #fee2e2 0%, #f87171 40%, #ef4444 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', WebkitTextStroke: '1.5px #dc2626', filter: 'drop-shadow(0px 4px 0px #b91c1c) drop-shadow(0px 8px 16px rgba(239, 68, 68, 0.4))', fontSize: '28px' }}>
          Reset Stats?
        </h2>
        <p className="azore-step-text" style={{ marginTop: '12px', marginBottom: '32px' }}>
          Are you sure you want to permanently reset all your wins, losses, and best streak? This cannot be undone.
        </p>
        <div className="azore-step-actions" style={{ justifyContent: 'center', gap: '16px' }}>
          <button className="azore-step-btn ghost" onClick={() => { playClickSound(false); onCancel(); }}>
            Cancel
          </button>
          <button 
            className="azore-step-btn" 
            style={{ 
              background: 'linear-gradient(to bottom, #f87171, #dc2626)', 
              boxShadow: '0 4px 0 #991b1b, 0 8px 16px rgba(220, 38, 38, 0.3)', 
              borderColor: '#b91c1c' 
            }} 
            onClick={() => { playClickSound(false); onConfirm(); }}
          >
            Yes, Reset
          </button>
        </div>
      </div>
    </div>
  );
}
