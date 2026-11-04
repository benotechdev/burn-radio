import React, { useEffect, useRef } from 'react';

interface OrangeWaveformProps {
  isPlaying: boolean;
  height?: number;
}

export const OrangeWaveform: React.FC<OrangeWaveformProps> = ({
  isPlaying,
  height = 36,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let step = 0;

    const resize = () => {
      canvas.width = canvas.parentElement?.clientWidth || window.innerWidth;
      canvas.height = height;
    };

    resize();
    window.addEventListener('resize', resize);

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const width = canvas.width;
      const h = canvas.height;
      const speed = isPlaying ? 0.05 : 0.015;
      const ampMultiplier = isPlaying ? 1.0 : 0.4;
      step += speed;

      // Wave parameters: [color, amplitude, frequency, phaseOffset, yOffset]
      const waves = [
        {
          color: 'rgba(233, 104, 0, 0.35)', // Deep orange back wave
          amp: 9 * ampMultiplier,
          freq: 0.012,
          speedOffset: step * 0.8,
          yBase: h * 0.65,
        },
        {
          color: 'rgba(255, 121, 0, 0.6)', // Mid primary orange wave
          amp: 12 * ampMultiplier,
          freq: 0.018,
          speedOffset: step * 1.2,
          yBase: h * 0.55,
        },
        {
          color: '#FF7900', // Foreground sharp primary orange crest
          amp: 15 * ampMultiplier,
          freq: 0.024,
          speedOffset: step * 1.5,
          yBase: h * 0.5,
        },
      ];

      waves.forEach((w) => {
        ctx.beginPath();
        ctx.moveTo(0, h);

        for (let x = 0; x <= width; x += 3) {
          const y =
            w.yBase +
            Math.sin(x * w.freq + w.speedOffset) * w.amp +
            Math.cos(x * (w.freq * 0.5) + w.speedOffset * 0.7) * (w.amp * 0.5);
          if (x === 0) {
            ctx.lineTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }

        ctx.lineTo(width, h);
        ctx.closePath();
        ctx.fillStyle = w.color;
        ctx.fill();
      });

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, [isPlaying, height]);

  return (
    <div className="w-full overflow-hidden pointer-events-none select-none relative z-10 -mb-[1px]">
      <canvas ref={canvasRef} className="block w-full" style={{ height: `${height}px` }} />
    </div>
  );
};
