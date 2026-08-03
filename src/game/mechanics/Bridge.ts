import Phaser from "phaser";
import { TEX } from "../utils/constants";
import { sfx } from "../utils/sfx";

export interface PlankRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * A run of planks that snaps into place one by one. Used for the extending
 * bridge and for the rescue staircase — any future "appearing platform"
 * mechanic can reuse this.
 */
export class Bridge {
  extended = false;
  private readonly planks: Phaser.GameObjects.TileSprite[] = [];

  constructor(
    private readonly scene: Phaser.Scene,
    group: Phaser.Physics.Arcade.StaticGroup,
    rects: PlankRect[],
    private readonly texture: string = TEX.bridge,
  ) {
    rects.forEach((r) => {
      const plank = scene.add
        .tileSprite(r.x, r.y, r.width, r.height, this.texture)
        .setOrigin(0, 0)
        .setDepth(6)
        .setVisible(false);
      group.add(plank);
      const body = plank.body as Phaser.Physics.Arcade.StaticBody;
      body.updateFromGameObject();
      body.enable = false;
      this.planks.push(plank);
    });
  }

  extend(stepMs = 90) {
    if (this.extended) return;
    this.extended = true;
    sfx.bridge();

    this.planks.forEach((plank, i) => {
      this.scene.time.delayedCall(i * stepMs, () => {
        plank.setVisible(true).setAlpha(0);
        const targetY = plank.y;
        plank.y = targetY - 10;
        (plank.body as Phaser.Physics.Arcade.StaticBody).enable = true;
        this.scene.tweens.add({
          targets: plank,
          y: targetY,
          alpha: 1,
          duration: 150,
          ease: "Back.easeOut",
          onComplete: () => (plank.body as Phaser.Physics.Arcade.StaticBody).updateFromGameObject(),
        });
      });
    });
  }
}
