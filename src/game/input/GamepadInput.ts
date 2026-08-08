import type { InputSource } from "./InputSource";

/**
 * GamepadInput — reads from the browser Gamepad API for a single controller.
 *
 * Button mapping (standard gamepad layout):
 *   Movement : Left analog stick (axes[0]) with deadzone, D-Pad Left/Right
 *              buttons[14] = D-Pad Left, buttons[15] = D-Pad Right
 *   Jump     : buttons[0]  (Xbox: A, PlayStation: Cross, Switch: B)
 *
 * Resilience:
 *   `navigator.getGamepads()` is called fresh every frame — it always returns
 *   the live snapshot. If the gamepad at `padIndex` is absent (disconnected or
 *   never connected) every method returns false. Keyboard input continues
 *   working automatically via CombinedInput's OR logic.
 *
 *   When the controller reconnects, the next frame's `getGamepads()` call will
 *   find it again and input resumes with zero configuration needed.
 *
 * padIndex accepts any number so this class can support future n-player modes
 * or debug scenarios without modification.
 */
export class GamepadInput implements InputSource {
  private static readonly DEADZONE = 0.3;

  /** Tracks whether jump was held last frame — used to compute the rising edge. */
  private prevJump = false;

  constructor(private readonly padIndex: number) {}

  /** Returns the live Gamepad snapshot, or null if unavailable. */
  private pad(): Gamepad | null {
    // navigator.getGamepads may be undefined in some environments (e.g. SSR).
    return navigator.getGamepads?.()[this.padIndex] ?? null;
  }

  left(): boolean {
    const p = this.pad();
    if (!p) return false;
    const axisX = p.axes[0] ?? 0;
    return axisX < -GamepadInput.DEADZONE || (p.buttons[14]?.pressed ?? false);
  }

  right(): boolean {
    const p = this.pad();
    if (!p) return false;
    const axisX = p.axes[0] ?? 0;
    return axisX > GamepadInput.DEADZONE || (p.buttons[15]?.pressed ?? false);
  }

  jump(): boolean {
    const p = this.pad();
    return !!p && (p.buttons[0]?.pressed ?? false);
  }

  jumpPressed(): boolean {
    const cur = this.jump();
    // Rising edge: currently pressed AND was not pressed last frame.
    const pressed = cur && !this.prevJump;
    this.prevJump = cur;
    return pressed;
  }

  /**
   * Vibrates all connected gamepads using the standard Gamepad API's vibrationActuator or vibration properties, with pulse fallbacks.
   */
  static vibrateAll(durationMs = 400, strongMagnitude = 0.8, weakMagnitude = 0.8): void {
    if (typeof navigator === "undefined" || !navigator.getGamepads) return;
    try {
      const pads = navigator.getGamepads();
      if (!pads) return;
      for (let i = 0; i < pads.length; i++) {
        const pad = pads[i];
        if (!pad) continue;

        // Try standard vibrationActuator, or vibration fallback (Phaser / Firefox custom properties)
        const actuator = (pad as any).vibrationActuator || (pad as any).vibration;
        if (actuator && typeof actuator.playEffect === "function") {
          actuator.playEffect("dual-rumble", {
            startDelay: 0,
            duration: durationMs,
            strongMagnitude: strongMagnitude,
            weakMagnitude: weakMagnitude,
          }).catch((err: any) => {
            console.warn(`Gamepad ${i} vibration failed:`, err);
          });
        } else if (actuator && typeof actuator.pulse === "function") {
          actuator.pulse(strongMagnitude, durationMs);
        } else {
          // Fallback to legacy hapticActuators
          const hapticActuators = (pad as any).hapticActuators;
          if (hapticActuators && hapticActuators.length > 0) {
            for (const ha of hapticActuators) {
              if (ha && typeof ha.pulse === "function") {
                ha.pulse(strongMagnitude, durationMs);
              }
            }
          }
        }
      }
    } catch (e) {
      console.warn("Failed to trigger gamepad vibration:", e);
    }
  }
}
