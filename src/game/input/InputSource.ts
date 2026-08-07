/**
 * InputSource — the only thing Player.ts ever sees.
 *
 * Every concrete input driver (keyboard, gamepad, modifier wrapper, combined)
 * implements this interface. The Player is completely agnostic about what
 * physical device — or combination of devices — is behind it.
 *
 * Design notes:
 *  - `left()` / `right()` / `jump()` represent held state (isDown equivalent).
 *  - `jumpPressed()` is a rising-edge signal: true for exactly ONE frame when
 *    the player first presses jump. Each InputSource tracks its own previous
 *    frame state, so callers (Player.tick) never need to track history.
 *  - All methods are called every game-update frame. Keep them cheap.
 */
export interface InputSource {
  /** True while the player is actively holding the move-left input. */
  left(): boolean;

  /** True while the player is actively holding the move-right input. */
  right(): boolean;

  /** True while the player is actively holding the jump input. */
  jump(): boolean;

  /**
   * True on the FIRST frame the jump input transitions from released → held.
   * Used by Player to feed the jump buffer.
   */
  jumpPressed(): boolean;
}
