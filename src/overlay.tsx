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
  const backgroundColor = hasAudio
    ? `rgba(239, 68, 68, ${0.3 + (audioLevel / 255) * 0.4})` // Vermelho reativo
    : 'rgba(156, 163, 175, 0.3)'; // Cinzento quando sem áudio

  const innerColor = hasAudio
    ? `linear-gradient(135deg, rgba(239, 68, 68, 0.8), rgba(220, 38, 38, 0.9))`
    : `linear-gradient(135deg, rgba(156, 163, 175, 0.8), rgba(107, 114, 128, 0.9))`;

  const borderColor = hasAudio
    ? 'rgba(239, 68, 68, 0.6)'
    : 'rgba(156, 163, 175, 0.6)';

  return (
    <div className="overlay-container">
      <div className="bubble-wrapper">
        {/* Círculo externo com drag habilitado */}
        <div
          className="bubble-outer"
          style={{
            background: backgroundColor,
            borderColor: borderColor
          }}
        >
          {/* Círculo interior fixo (sem pulse) */}
          <div
            className="bubble-inner"
            style={{
              background: innerColor
            }}
          >
            {/* Ícone de microfone pequeno */}
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              className="mic-icon"
            >
              <path
                d="M12 1C10.34 1 9 2.34 9 4V12C9 13.66 10.34 15 12 15C13.66 15 15 13.66 15 12V4C15 2.34 13.66 1 12 1Z"
                fill="white"
              />
              <path
                d="M17 11C17 13.76 14.76 16 12 16C9.24 16 7 13.76 7 11H5C5 14.53 7.61 17.43 11 17.92V21H13V17.92C16.39 17.43 19 14.53 19 11H17Z"
                fill="white"
              />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Overlay;
