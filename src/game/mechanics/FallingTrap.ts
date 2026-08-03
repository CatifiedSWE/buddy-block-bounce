import Phaser from "phaser";
import { TEX } from "../utils/constants";
import { sfx } from "../utils/sfx";

/**
 * The "Level Devil" moment: a section of floor drops out, but a hidden
 * platform snaps in underneath so nobody actually dies.
 */
export class FallingTrap {
  triggered = false;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly collapsing: Phaser.GameObjects.TileSprite[],
    private readonly rescue: Phaser.GameObjects.TileSprite,
    private readonly onTrigger?: () => void,
  ) {
    const body = rescue.body as Phaser.Physics.Arcade.StaticBody;
    body.enable = false;
    rescue.setVisible(false);
  }

  trigger() {
    if (this.triggered) return;
    this.triggered = true;
    sfx.trap();
    this.scene.cameras.main.shake(320, 0.012);

    this.collapsing.forEach((plank, i) => {
      const body = plank.body as Phaser.Physics.Arcade.StaticBody;
      body.enable = false;
      this.scene.tweens.add({
        targets: plank,
        y: plank.y + 700,
        angle: Phaser.Math.Between(-25, 25),
        alpha: 0.1,
        delay: i * 45,
        duration: 900,
        ease: "Quad.easeIn",
      });
    });

    // rescue platform slides in a beat later
    this.scene.time.delayedCall(230, () => {
      const target = this.rescue.y;
      this.rescue.setVisible(true).setAlpha(0);
      this.rescue.y = target + 40;
      const body = this.rescue.body as Phaser.Physics.Arcade.StaticBody;
      body.enable = true;
      sfx.save();
      this.scene.tweens.add({
        targets: this.rescue,
        y: target,
        alpha: 1,
        duration: 220,
        ease: "Back.easeOut",
        onUpdate: () => body.updateFromGameObject(),
        onComplete: () => body.updateFromGameObject(),
      });

      const p = this.scene.add.particles(this.rescue.x + this.rescue.width / 2, target, TEX.spark, {
        speed: { min: 30, max: 120 },
        lifespan: 500,
        scale: { start: 1.4, end: 0 },
        alpha: { start: 0.9, end: 0 },
        gravityY: 200,
        emitting: false,
      });
      p.setDepth(30);
      p.explode(16);
      this.scene.time.delayedCall(800, () => p.destroy());
    });

    this.onTrigger?.();
  }
}
