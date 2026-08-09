import * as Phaser from "phaser";
import { TEX } from "../utils/constants";
import { sfx } from "../utils/sfx";

export interface TimedPlatformRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * A platform that begins a 2-second collapse countdown when either player lands on it.
 * It provides a visual warning animation (gradual transparency and accelerating flicker),
 * and crumbles completely after 2 seconds, removing collision support so players fall into spikes.
 */
export class TimedPlatform {
  public sprite: Phaser.GameObjects.TileSprite;
  public body: Phaser.Physics.Arcade.StaticBody;

  private readonly initialX: number;
  private readonly initialY: number;
  private triggered = false;
  private elapsedMs = 0;
  private readonly durationMs = 2000;
  private active = true;

  constructor(
    private readonly scene: Phaser.Scene,
    group: Phaser.Physics.Arcade.StaticGroup,
    rect: TimedPlatformRect,
    texture: string = TEX.stone,
  ) {
    this.initialX = rect.x;
    this.initialY = rect.y;

    this.sprite = scene.add
      .tileSprite(rect.x, rect.y, rect.width, rect.height, texture)
      .setOrigin(0, 0)
      .setDepth(10);

    group.add(this.sprite);
    this.body = this.sprite.body as Phaser.Physics.Arcade.StaticBody;
    this.body.updateFromGameObject();
  }

  /**
   * Starts the 2-second collapse countdown. Triggered when either player touches/lands on this platform.
   */
  trigger() {
    if (this.triggered || !this.active) return;
    this.triggered = true;
    this.elapsedMs = 0;
  }

  update(deltaMs: number) {
    if (!this.triggered || !this.active) return;

    this.elapsedMs += deltaMs;
    const progress = Math.min(1, this.elapsedMs / this.durationMs);

    // Visual warning animation:
    // 1. Overall transparency gradually decreases (1.0 down to 0.25)
    // 2. Flickering / blinking frequency accelerates exponentially towards the end
    const flickerFreq = 3 + Math.pow(progress, 2.2) * 25; // 3 Hz at start -> 28 Hz near expiration
    const blinkSine = 0.5 + 0.5 * Math.sin((this.elapsedMs / 1000) * flickerFreq * Math.PI * 2);

    const baseAlpha = 1.0 - progress * 0.65;
    const currentAlpha = Phaser.Math.Clamp(baseAlpha * (0.2 + 0.8 * blinkSine), 0.08, 1.0);
    this.sprite.setAlpha(currentAlpha);

    // Micro-vibration warning when near collapse
    if (progress > 0.6) {
      const shakeAmt = (progress - 0.6) * 3.5;
      this.sprite.x = this.initialX + (Math.random() - 0.5) * shakeAmt;
      this.sprite.y = this.initialY + (Math.random() - 0.5) * shakeAmt;
    } else {
      this.sprite.x = this.initialX;
      this.sprite.y = this.initialY;
    }

    if (this.elapsedMs >= this.durationMs) {
      this.collapse();
    }
  }

  private collapse() {
    this.active = false;
    this.sprite.setVisible(false);
    this.sprite.x = this.initialX;
    this.sprite.y = this.initialY;
    this.body.enable = false;

    // Disintegration crumble particles
    const emitter = this.scene.add.particles(
      this.initialX + this.sprite.width / 2,
      this.initialY + 8,
      TEX.spark,
      {
        speed: { min: 30, max: 140 },
        lifespan: 350,
        scale: { start: 1.2, end: 0 },
        alpha: { start: 0.9, end: 0 },
        gravityY: 400,
        emitting: false,
      },
    );
    emitter.setDepth(25);
    emitter.explode(14);
    this.scene.time.delayedCall(450, () => emitter.destroy());

    sfx.trap();
  }

  reset() {
    this.triggered = false;
    this.elapsedMs = 0;
    this.active = true;
    this.sprite.setVisible(true);
    this.sprite.setAlpha(1);
    this.sprite.x = this.initialX;
    this.sprite.y = this.initialY;
    this.body.enable = true;
    this.body.updateFromGameObject();
  }
}
