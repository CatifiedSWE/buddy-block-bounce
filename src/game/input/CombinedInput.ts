import type { InputSource } from "./InputSource";

/**
 * CombinedInput — ORs multiple InputSources into one.
 *
 * This is the main driver passed to each Player. It aggregates physical device
 * inputs (keyboard + gamepad) so a player can freely use either without any
 * special handling inside Player.ts.
 *
 * Example (standard setup):
 *   new CombinedInput(
 *     new KeyboardInput(A, D, W),   // WASD
 *     new GamepadInput(0),          // Controller 1
 *   )
 *
 * For each action, returns true if ANY source returns true. Sources are checked
 * in order; short-circuit evaluation applies.
 *
 * `setSources()` allows Level 3's control-scrambling mechanic to hot-swap the
 * composition of sources at runtime without creating a new Player or touching
 * Player.ts at all.
 */
export class CombinedInput implements InputSource {
  private sources: InputSource[];

  constructor(...sources: InputSource[]) {
    this.sources = sources;
  }

  left(): boolean {
    return this.sources.some((s) => s.left());
  }

  right(): boolean {
    return this.sources.some((s) => s.right());
  }

  jump(): boolean {
    return this.sources.some((s) => s.jump());
  }

  jumpPressed(): boolean {
    // Must call jumpPressed() on ALL sources every frame — not short-circuit —
    // because each GamepadInput tracks its own rising-edge state internally and
    // needs its prevJump flag updated even when another source already returned
    // true. Skipping a source's call would corrupt its state tracking.
    let any = false;
    for (const s of this.sources) {
      if (s.jumpPressed()) any = true;
    }
    return any;
  }

  /**
   * Hot-swap the set of input sources at runtime.
   * Used by Level 3 to rewire player inputs during control-scramble events.
   * The Player itself is never aware this swap happened.
   */
  setSources(...sources: InputSource[]): void {
    this.sources = sources;
  }
}
