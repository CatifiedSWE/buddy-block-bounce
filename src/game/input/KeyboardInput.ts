import * as Phaser from "phaser";
import type { InputSource } from "./InputSource";

/**
 * KeyboardInput — wraps three Phaser keyboard Keys into an InputSource.
 *
 * This is a thin, stateless adapter. Phaser already handles key-state tracking
 * internally on its Key objects, so we just read `.isDown` and use the Phaser
 * helper `JustDown` for the rising-edge `jumpPressed()` signal.
 *
 * Usage:
 *   const kb = new KeyboardInput(scene.input.keyboard!, K.A, K.D, K.W);
 */
export class KeyboardInput implements InputSource {
  private readonly leftKey: Phaser.Input.Keyboard.Key;
  private readonly rightKey: Phaser.Input.Keyboard.Key;
  private readonly jumpKey: Phaser.Input.Keyboard.Key;

  constructor(
    leftKey: Phaser.Input.Keyboard.Key,
    rightKey: Phaser.Input.Keyboard.Key,
    jumpKey: Phaser.Input.Keyboard.Key,
  ) {
    this.leftKey = leftKey;
    this.rightKey = rightKey;
    this.jumpKey = jumpKey;
  }

  left(): boolean {
    return this.leftKey.isDown;
  }

  right(): boolean {
    return this.rightKey.isDown;
  }

  jump(): boolean {
    return this.jumpKey.isDown;
  }

  jumpPressed(): boolean {
    // Phaser.Input.Keyboard.JustDown returns true only on the first frame the
    // key transitions from up → down, which is exactly the rising-edge we need.
    return Phaser.Input.Keyboard.JustDown(this.jumpKey);
  }
}
