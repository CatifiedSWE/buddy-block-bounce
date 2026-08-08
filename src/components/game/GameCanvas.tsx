import { useEffect, useRef, useState } from "react";
import type * as Phaser from "phaser";

interface GameCanvasProps {
  initialLevel?: string;
}

/**
 * Mounts the Phaser game. Phaser is imported lazily so it never touches the
 * SSR bundle.
 */
export function GameCanvas({ initialLevel = "DemoLevel" }: GameCanvasProps) {
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

  const switchLevel = (levelKey: string) => {
    if (!gameRef.current) return;
    const sceneManager = gameRef.current.scene;
    sceneManager.getScenes(true).forEach((s) => s.scene.stop());
    sceneManager.start(levelKey);
    setActiveLevel(levelKey);
    setComplete(false);
  };

  return (
    <div className="relative w-full">
      {/* Temporary Level Select Bar for Testing */}
      <div className="mb-3 flex items-center justify-between gap-2 rounded-md border border-border bg-card/80 px-3 py-2">
        <span className="font-pixel text-[10px] text-muted-foreground tracking-wider">
          ⚙ TEST LEVEL SELECT:
        </span>
        <div className="flex gap-2">
          <button
            onClick={() => switchLevel("DemoLevel")}
            className={`px-3 py-1 font-pixel text-xs rounded border transition-colors ${
              activeLevel === "DemoLevel"
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background text-muted-foreground border-border hover:bg-accent"
            }`}
          >
            Demo Level
          </button>
          <button
            onClick={() => switchLevel("Level1")}
            className={`px-3 py-1 font-pixel text-xs rounded border transition-colors ${
              activeLevel === "Level1"
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background text-muted-foreground border-border hover:bg-accent"
            }`}
          >
            Level 1
          </button>
          <button
            onClick={() => switchLevel("Level2")}
            className={`px-3 py-1 font-pixel text-xs rounded border transition-colors ${
              activeLevel === "Level2"
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background text-muted-foreground border-border hover:bg-accent"
            }`}
          >
            Level 2
          </button>
          <button
            onClick={() => switchLevel("Level3")}
            className={`px-3 py-1 font-pixel text-xs rounded border transition-colors ${
              activeLevel === "Level3"
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-background text-muted-foreground border-border hover:bg-accent"
            }`}
          >
            Level 3
          </button>
        </div>
      </div>

      <div
        ref={hostRef}
        className="mx-auto aspect-[16/9] w-full overflow-hidden rounded-lg border border-border bg-background shadow-[0_0_60px_-20px_var(--color-primary)]"
        aria-label="Cooperative puzzle platformer game canvas"
      />
      <p className="mt-3 text-center font-mono text-xs text-muted-foreground">
        {complete
          ? `${activeLevel === "DemoLevel" ? "Demo level" : "Level 1"} cleared — thanks for playing!`
          : "Blue: A / D / W  ·  Red: ← / → / ↑  ·  Click the canvas to focus"}
      </p>
    </div>
  );
}
