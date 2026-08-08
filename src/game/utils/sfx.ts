/**
 * Tiny procedural sound engine (WebAudio) so the prototype ships with no
 * binary audio assets. All cues are short, retro-flavoured blips.
 */
let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

type ToneOptions = {
  freq: number;
  duration?: number;
  type?: OscillatorType;
  volume?: number;
  slideTo?: number;
  delay?: number;
};

export function tone({
  freq,
  duration = 0.12,
  type = "square",
  volume = 0.16,
  slideTo,
  delay = 0,
}: ToneOptions) {
  const ac = audio();
  if (!ac) return;
  const t0 = ac.currentTime + delay;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + duration);
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(volume, t0 + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(gain).connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.02);
}

export const sfx = {
  unlockAudio: () => audio(),
  jump: () => tone({ freq: 320, slideTo: 620, duration: 0.1, volume: 0.09, type: "square" }),
  land: () => tone({ freq: 150, slideTo: 90, duration: 0.07, volume: 0.06, type: "triangle" }),
  buttonOn: () => {
    tone({ freq: 520, duration: 0.08, volume: 0.14 });
    tone({ freq: 780, duration: 0.14, volume: 0.12, delay: 0.06 });
  },
  buttonOff: () => tone({ freq: 300, slideTo: 200, duration: 0.09, volume: 0.08 }),
  bridge: () => {
    tone({ freq: 220, duration: 0.1, volume: 0.1, type: "triangle" });
    tone({ freq: 330, duration: 0.12, volume: 0.1, type: "triangle", delay: 0.08 });
    tone({ freq: 440, duration: 0.16, volume: 0.1, type: "triangle", delay: 0.16 });
  },
  door: () => {
    tone({ freq: 180, slideTo: 460, duration: 0.5, volume: 0.1, type: "sawtooth" });
  },
  trap: () => tone({ freq: 400, slideTo: 60, duration: 0.45, volume: 0.14, type: "sawtooth" }),
  save: () => tone({ freq: 660, slideTo: 990, duration: 0.18, volume: 0.1, type: "triangle" }),
  respawn: () => tone({ freq: 500, slideTo: 200, duration: 0.22, volume: 0.09 }),
  /** Mode 1: Inverted Horizontal (descending glitch) */
  mode1Invert: () => {
    tone({ freq: 880, slideTo: 440, duration: 0.15, volume: 0.15, type: "sawtooth" });
    tone({ freq: 660, slideTo: 330, duration: 0.15, volume: 0.14, type: "square", delay: 0.12 });
  },
  /** Mode 2: Split / Cross Jump (dual-tone cross trill) */
  mode2Split: () => {
    tone({ freq: 440, slideTo: 880, duration: 0.1, volume: 0.14, type: "square" });
    tone({ freq: 880, slideTo: 440, duration: 0.1, volume: 0.14, type: "triangle", delay: 0.09 });
    tone({ freq: 550, slideTo: 1100, duration: 0.12, volume: 0.14, type: "sawtooth", delay: 0.18 });
  },
  /** Mode 3: Player Role Swap (ascending multi-octave warp chime) */
  mode3RoleSwap: () => {
    tone({ freq: 300, slideTo: 600, duration: 0.1, volume: 0.14, type: "square" });
    tone({ freq: 600, slideTo: 1200, duration: 0.12, volume: 0.14, type: "square", delay: 0.1 });
    tone({ freq: 900, slideTo: 1800, duration: 0.15, volume: 0.12, type: "triangle", delay: 0.22 });
  },
  /** Swap type A — eerie descending glitch blip */
  swapA: () => {
    tone({ freq: 900, slideTo: 180, duration: 0.28, volume: 0.15, type: "sawtooth" });
    tone({ freq: 440, slideTo: 110, duration: 0.18, volume: 0.1, type: "square", delay: 0.12 });
  },
  /** Swap type B — ascending warped chime */
  swapB: () => {
    tone({ freq: 200, slideTo: 1100, duration: 0.22, volume: 0.12, type: "square" });
    tone({ freq: 660, slideTo: 880, duration: 0.18, volume: 0.14, type: "triangle", delay: 0.14 });
    tone({ freq: 330, slideTo: 660, duration: 0.12, volume: 0.09, type: "square", delay: 0.28 });
  },
  complete: () => {
    [523, 659, 784, 1046].forEach((f, i) =>
      tone({ freq: f, duration: 0.22, volume: 0.13, type: "square", delay: i * 0.11 }),
    );
  },
};
