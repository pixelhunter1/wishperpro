import { useEffect, useState } from 'react';
import './overlay.css';

interface ElectronOverlayAPI {
  onUpdateAudioLevel: (callback: (level: number) => void) => () => void;
}

declare global {
  interface Window {
    electronOverlayAPI: ElectronOverlayAPI;
  }
}

function Overlay() {
  const [audioLevel, setAudioLevel] = useState(0);

  useEffect(() => {
    // Escutar níveis de áudio do processo principal
    const cleanup = window.electronOverlayAPI.onUpdateAudioLevel((level: number) => {
      setAudioLevel(level);
    });

    return cleanup;
  }, []);

  // Determinar cor baseada no estado de gravação e nível de áudio
  const hasAudio = audioLevel > 10; // Threshold para considerar que há áudio
  const iconColor = hasAudio ? '#ef4444' : '#6b7280'; // Vermelho quando gravar, cinza quando parado

  return (
    <div className="overlay-container">
      {/* Apenas o ícone, sem fundo/overlay */}
      <svg
        width="32"
        height="32"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="mic-icon"
        style={{
          filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3))',
          transition: 'all 0.2s ease'
        }}
      >
        <path
          d="M12 1C10.34 1 9 2.34 9 4V12C9 13.66 10.34 15 12 15C13.66 15 15 13.66 15 12V4C15 2.34 13.66 1 12 1Z"
          fill={iconColor}
        />
        <path
          d="M17 11C17 13.76 14.76 16 12 16C9.24 16 7 13.76 7 11H5C5 14.53 7.61 17.43 11 17.92V21H13V17.92C16.39 17.43 19 14.53 19 11H17Z"
          fill={iconColor}
        />
      </svg>
    </div>
  );
}

export default Overlay;
