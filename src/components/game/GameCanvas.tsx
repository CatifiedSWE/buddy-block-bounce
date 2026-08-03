import { useEffect, useRef, useState } from "react";
import type Phaser from "phaser";

/**
 * Mounts the Phaser game. Phaser is imported lazily so it never touches the
 * SSR bundle.
 */
export function GameCanvas() {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const [complete, setComplete] = useState(false);

  useEffect(() => {
    let disposed = false;

    void (async () => {
      const { createGame } = await import("@/game/createGame");
      if (disposed || !hostRef.current) return;
      const game = createGame(hostRef.current);
      gameRef.current = game;
      if (import.meta.env.DEV) {
        (window as unknown as { __game?: Phaser.Game }).__game = game;
      }
      game.events.on("level-complete", () => setComplete(true));
    })();

    return () => {
      disposed = true;
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, []);

  return (
    <div className="relative w-full">
      <div
        ref={hostRef}
        className="mx-auto aspect-[16/9] w-full overflow-hidden rounded-lg border border-border bg-background shadow-[0_0_60px_-20px_var(--color-primary)]"
        aria-label="Cooperative puzzle platformer game canvas"
      />
      <p className="mt-3 text-center font-mono text-xs text-muted-foreground">
        {complete
          ? "Level 1 cleared — thanks for playing the prototype."
          : "Blue: A / D / W  ·  Red: ← / → / ↑  ·  Click the canvas to focus"}
      </p>
    </div>
  );
}
