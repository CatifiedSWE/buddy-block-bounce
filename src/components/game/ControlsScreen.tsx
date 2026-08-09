interface ControlsScreenProps {
  onStart: () => void;
}

export function ControlsScreen({ onStart }: ControlsScreenProps) {
  return (
    <div className="flex items-center justify-center translate-y-23">
      <button
        onClick={onStart}
        className="group relative inline-flex items-center gap-3 rounded-md bg-primary px-8 py-4 font-pixel text-sm sm:text-base text-primary-foreground shadow-[0_0_35px_-5px_var(--color-primary)] transition-all hover:scale-105 hover:shadow-[0_0_50px_var(--color-primary)] active:scale-95 cursor-pointer"
      >
        START GAME
        <span className="transition-transform group-hover:translate-x-1.5">▶</span>
      </button>
    </div>
  );
}
