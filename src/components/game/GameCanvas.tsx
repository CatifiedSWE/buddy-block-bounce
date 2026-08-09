import { useEffect, useRef, useState } from "react";
import type * as Phaser from "phaser";

interface GameCanvasProps {
  initialLevel?: string;
}

/**
 * Mounts the Phaser game. Phaser is imported lazily so it never touches the
 * SSR bundle.
 */
export function GameCanvas({ initialLevel = "Level1" }: GameCanvasProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const [complete, setComplete] = useState(false);
  const [activeLevel, setActiveLevel] = useState(initialLevel);

  useEffect(() => {
    let disposed = false;

    void (async () => {
      const { createGame } = await import("@/game/createGame");
      if (disposed || !hostRef.current) return;
      const game = createGame(hostRef.current, initialLevel);
      gameRef.current = game;
      if (import.meta.env.DEV) {
        (window as unknown as { __game?: Phaser.Game }).__game = game;
      }
      game.events.on("level-change", (levelKey: string) => {
        setActiveLevel(levelKey);
        setComplete(false);
      });
      game.events.on("level-complete", () => setComplete(true));
    })();

    return () => {
      disposed = true;
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, [initialLevel]);

  return (
    <div className="relative flex w-full flex-col items-center justify-center">
      <div
        ref={hostRef}
        className="mx-auto aspect-[16/9] w-full max-w-[min(96vw,1440px)] max-h-[82vh] overflow-hidden rounded-xl border-2 border-border/80 bg-background shadow-[0_0_80px_-20px_var(--color-primary)] ring-1 ring-white/10"
        aria-label="Cooperative puzzle platformer game canvas"
      />
      <p className="mt-3 text-center font-mono text-xs sm:text-sm text-muted-foreground">
        {complete
          ? `${activeLevel} cleared — thanks for playing!`
          : "Blue: A / D / W  ·  Red: ← / → / ↑  ·  Click the canvas to focus"}
      </p>
    </div>
  );
}
