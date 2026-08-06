interface ControlsScreenProps {
  onStart: (levelKey?: string) => void;
}

const KEY = "inline-flex h-9 min-w-9 items-center justify-center rounded-md border-2 px-2 font-pixel text-[10px]";

export function ControlsScreen({ onStart }: ControlsScreenProps) {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-10 rounded-lg border border-border bg-card/60 px-6 py-12 text-center backdrop-blur">
      <div className="space-y-4">
        <p className="font-pixel text-[10px] tracking-widest text-muted-foreground">
          CO-OP PUZZLE PROTOTYPE
        </p>
        <h1 className="font-pixel text-2xl leading-relaxed text-foreground sm:text-3xl">
          TWO BUTTONS,
          <br />
          ONE WAY OUT
        </h1>
        <p className="mx-auto max-w-md font-mono text-sm text-muted-foreground">
          Select a level to play. Two players, one keyboard, about a minute underground.
        </p>
      </div>

      <div className="grid w-full gap-6 sm:grid-cols-2">
        <div className="rounded-lg border-2 border-player-blue/50 bg-player-blue/10 p-5">
          <p className="font-pixel text-xs text-player-blue">PLAYER 1 — BLUE</p>
          <div className="mt-5 flex flex-col items-center gap-2">
            <span className={`${KEY} border-player-blue/60 text-player-blue`}>W</span>
            <div className="flex gap-2">
              <span className={`${KEY} border-player-blue/60 text-player-blue`}>A</span>
              <span className={`${KEY} border-player-blue/60 text-player-blue`}>D</span>
            </div>
          </div>
          <p className="mt-4 font-mono text-xs text-muted-foreground">move · jump</p>
        </div>

        <div className="rounded-lg border-2 border-player-red/50 bg-player-red/10 p-5">
          <p className="font-pixel text-xs text-player-red">PLAYER 2 — RED</p>
          <div className="mt-5 flex flex-col items-center gap-2">
            <span className={`${KEY} border-player-red/60 text-player-red`}>↑</span>
            <div className="flex gap-2">
              <span className={`${KEY} border-player-red/60 text-player-red`}>←</span>
              <span className={`${KEY} border-player-red/60 text-player-red`}>→</span>
            </div>
          </div>
          <p className="mt-4 font-mono text-xs text-muted-foreground">move · jump</p>
        </div>
      </div>

      <div className="flex flex-wrap justify-center gap-4">
        <button
          onClick={() => onStart("DemoLevel")}
          className="group relative inline-flex items-center gap-3 rounded-md bg-primary px-6 py-4 font-pixel text-xs text-primary-foreground transition-transform hover:-translate-y-0.5 active:translate-y-0"
        >
          START DEMO LEVEL
          <span className="transition-transform group-hover:translate-x-1">▶</span>
        </button>

        <button
          onClick={() => onStart("Level1")}
          className="group relative inline-flex items-center gap-3 rounded-md border-2 border-primary bg-background px-6 py-4 font-pixel text-xs text-primary transition-transform hover:-translate-y-0.5 hover:bg-accent active:translate-y-0"
        >
          START LEVEL 1
          <span className="transition-transform group-hover:translate-x-1">▶</span>
        </button>

        <button
          onClick={() => onStart("Level2")}
          className="group relative inline-flex items-center gap-3 rounded-md border-2 border-primary bg-background px-6 py-4 font-pixel text-xs text-primary transition-transform hover:-translate-y-0.5 hover:bg-accent active:translate-y-0"
        >
          START LEVEL 2
          <span className="transition-transform group-hover:translate-x-1">▶</span>
        </button>

        <button
          onClick={() => onStart("Level3")}
          className="group relative inline-flex items-center gap-3 rounded-md border-2 border-primary bg-background px-6 py-4 font-pixel text-xs text-primary transition-transform hover:-translate-y-0.5 hover:bg-accent active:translate-y-0"
        >
          START LEVEL 3
          <span className="transition-transform group-hover:translate-x-1">▶</span>
        </button>
      </div>
    </div>
  );
}
