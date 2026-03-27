import { useEffect, useRef } from "react";

const CHARS = "アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789ABCDEF";
const FONT_SIZE = 14;
const FPS = 30;
const FRAME_INTERVAL = 1000 / FPS;

export function MatrixRain() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    let animationFrameId: number;
    let lastFrameTime = 0;
    let columns: number[] = [];

    function resize() {
      if (!canvas) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      const columnCount = Math.floor(canvas.width / FONT_SIZE);
      columns = Array.from({ length: columnCount }, () =>
        Math.floor(Math.random() * canvas.height / FONT_SIZE),
      );
    }

    resize();
    window.addEventListener("resize", resize);

    function getAccentColor(): string {
      const accent = getComputedStyle(document.documentElement)
        .getPropertyValue("--accent")
        .trim();
      return accent || "#00ff41";
    }

    function draw(timestamp: number) {
      if (!context || !canvas) return;

      if (timestamp - lastFrameTime < FRAME_INTERVAL) {
        animationFrameId = requestAnimationFrame(draw);
        return;
      }
      lastFrameTime = timestamp;

      context.fillStyle = "rgba(10, 10, 10, 0.05)";
      context.fillRect(0, 0, canvas.width, canvas.height);

      const accentColor = getAccentColor();
      context.fillStyle = accentColor;
      context.font = `${FONT_SIZE}px monospace`;

      for (let columnIndex = 0; columnIndex < columns.length; columnIndex++) {
        const charIndex = Math.floor(Math.random() * CHARS.length);
        const char = CHARS[charIndex] ?? "0";
        const row = columns[columnIndex]!;
        const x = columnIndex * FONT_SIZE;
        const y = row * FONT_SIZE;

        context.globalAlpha = 0.3 + Math.random() * 0.3;
        context.fillText(char, x, y);

        if (y > canvas.height && Math.random() > 0.975) {
          columns[columnIndex] = 0;
        } else {
          columns[columnIndex] = row + 1;
        }
      }

      context.globalAlpha = 1;
      animationFrameId = requestAnimationFrame(draw);
    }

    animationFrameId = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none fixed inset-0 z-0"
      aria-hidden="true"
    />
  );
}
