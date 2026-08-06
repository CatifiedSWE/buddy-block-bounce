import * as Phaser from "phaser";
import { TEX } from "../utils/constants";
import { sfx } from "../utils/sfx";

export type DoorKind = "red" | "blue" | "gate";

const TEXTURE: Record<DoorKind, string> = {
  red: TEX.doorRed,
  blue: TEX.doorBlue,
  gate: TEX.doorGate,
};

/**
 * A solid door that retracts into the ceiling when unlocked. Its static body
 * shrinks with the animation, so the opening feels physical.
 */
export class Door {
  readonly sprite: Phaser.GameObjects.Image;
  isOpen = false;
  private opening = false;

  constructor(
    private readonly scene: Phaser.Scene,
    x: number,
    bottomY: number,
    kind: DoorKind,
    group: Phaser.Physics.Arcade.StaticGroup,
  ) {
    this.sprite = scene.add.image(x, bottomY, TEXTURE[kind]).setOrigin(0.5, 1).setDepth(8);
    group.add(this.sprite);
    (this.sprite.body as Phaser.Physics.Arcade.StaticBody).updateFromGameObject();
  }

  open(durationMs = 700) {
    if (this.isOpen || this.opening) return;
    this.opening = true;
    sfx.door();

    const body = this.sprite.body as Phaser.Physics.Arcade.StaticBody;
    this.scene.tweens.add({
      targets: this.sprite,
      scaleY: 0.02,
      alpha: 0.35,
      duration: durationMs,
      ease: "Sine.easeInOut",
      onUpdate: () => body.updateFromGameObject(),
      onComplete: () => {
        body.enable = false;
        this.sprite.setVisible(false);
        this.isOpen = true;
        this.opening = false;
      },
    });

    this.burst();
  }

  close(durationMs = 500) {
    if (!this.isOpen && !this.opening) return;
    this.isOpen = false;
    this.opening = false;
    sfx.door();

    this.sprite.setVisible(true);
    const body = this.sprite.body as Phaser.Physics.Arcade.StaticBody;
    body.enable = true;

    this.scene.tweens.add({
      targets: this.sprite,
      scaleY: 1,
      alpha: 1,
      duration: durationMs,
      ease: "Sine.easeInOut",
      onUpdate: () => body.updateFromGameObject(),
      onComplete: () => {
        body.updateFromGameObject();
      },
    });
  }

  private burst() {
    const p = this.scene.add.particles(this.sprite.x, this.sprite.y - this.sprite.height / 2, TEX.spark, {
      speed: { min: 40, max: 150 },
      lifespan: { min: 250, max: 620 },
      quantity: 18,
      scale: { start: 1.6, end: 0 },
      alpha: { start: 1, end: 0 },
      gravityY: 260,
      emitting: false,
    });
    p.setDepth(30);
    p.explode(22);
    this.scene.time.delayedCall(900, () => p.destroy());
  }
}
