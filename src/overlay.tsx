import { useEffect, useState, useRef } from 'react';
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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | undefined>(undefined);
  const timeRef = useRef<number>(0);

  useEffect(() => {
    // Escutar níveis de áudio do processo principal
    const cleanup = window.electronOverlayAPI.onUpdateAudioLevel((level: number) => {
      setAudioLevel(level);
    });

    return cleanup;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    const animate = () => {
      timeRef.current += 0.05;
      ctx.clearRect(0, 0, width, height);

      // Determinar estado e cor
      const hasAudio = audioLevel > 10;
      const color = hasAudio ? '#ef4444' : '#8b9dc3'; // Azul acinzentado mais visível

      // Amplitude baseada no nível de áudio (normalizado)
      const baseAmplitude = hasAudio ? Math.min(audioLevel / 100, 1) * 12 + 6 : 4;

      // Criar gradiente para efeito visual mais bonito
      const gradient = ctx.createLinearGradient(0, 0, width, 0);
      gradient.addColorStop(0, color + '40');
      gradient.addColorStop(0.5, color);
      gradient.addColorStop(1, color + '40');

      ctx.strokeStyle = gradient;
      ctx.lineWidth = 2.5;
      ctx.lineCap = 'round';

      // Desenhar 3 ondas com diferentes velocidades e fases para efeito mais fluido
      for (let wave = 0; wave < 3; wave++) {
        ctx.beginPath();
        const phaseOffset = wave * Math.PI * 0.6;
        const speedMultiplier = 1 + wave * 0.3;
        const amplitudeMultiplier = 1 - wave * 0.2;

        for (let x = 0; x < width; x++) {
          // Criar onda sinusoidal suave com múltiplas frequências para movimento orgânico
          const frequency1 = 0.15;
          const frequency2 = 0.08;

          const y1 = Math.sin((x * frequency1) + (timeRef.current * speedMultiplier) + phaseOffset) * baseAmplitude * amplitudeMultiplier;
          const y2 = Math.sin((x * frequency2) - (timeRef.current * speedMultiplier * 0.7) + phaseOffset) * baseAmplitude * 0.5 * amplitudeMultiplier;

          const y = height / 2 + y1 + y2;

          if (x === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }

        ctx.globalAlpha = 0.6 - wave * 0.15;
        ctx.stroke();
      }

      ctx.globalAlpha = 1;
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [audioLevel]);

  return (
    <div className="overlay-container">
      <canvas
        ref={canvasRef}
        width={60}
        height={60}
        style={{
          filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3))',
        }}
      />
    </div>
  );
}

export default Overlay;
