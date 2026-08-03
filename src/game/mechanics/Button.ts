import * as Phaser from "phaser";
import { COLORS, TEX, type PlayerId } from "../utils/constants";
import type { Player } from "../entities/Player";
import { sfx } from "../utils/sfx";

/**
 * Colour-locked pressure plate. Only the matching player can depress it;
 * the wrong player simply stands on an inert plate.
 */
export class ColorButton {
  readonly color: PlayerId;
  pressed = false;
  onChange?: (pressed: boolean, button: ColorButton) => void;

  readonly x: number;
  readonly y: number;

  private readonly plate: Phaser.GameObjects.Image;
  private readonly glow: Phaser.GameObjects.Rectangle;
  private readonly hitArea: Phaser.Geom.Rectangle;
  private readonly baseY: number;

  constructor(scene: Phaser.Scene, x: number, groundTop: number, color: PlayerId) {
    this.color = color;
    this.x = x;
    this.y = groundTop;
    this.baseY = groundTop;

    this.glow = scene.add
      .rectangle(x, groundTop - 24, 46, 44, color === "blue" ? COLORS.blue : COLORS.red, 0.0)
      .setOrigin(0.5, 1)
      .setDepth(4);

    this.plate = scene.add
      .image(x, groundTop, color === "blue" ? TEX.buttonBlue : TEX.buttonRed)
      .setOrigin(0.5, 1)
      .setDepth(5);

    this.hitArea = new Phaser.Geom.Rectangle(x - 26, groundTop - 18, 52, 22);
  }

  /** Called every frame with both players. Returns true when the state flips. */
  update(players: Player[]): boolean {
    const owner = players.find((p) => p.id === this.color);
    const down =
      !!owner &&
      Phaser.Geom.Intersects.RectangleToRectangle(owner.getBounds(), this.hitArea) &&
      owner.body_.velocity.y >= -20;

    if (down === this.pressed) return false;
    this.pressed = down;
    this.plate.y = this.baseY + (down ? 5 : 0);
    this.plate.setTint(down ? 0xffffff : 0xdddddd);
    if (down) sfx.buttonOn();
    else sfx.buttonOff();

    this.plate.scene.tweens.add({
      targets: this.glow,
      fillAlpha: down ? 0.22 : 0,
      duration: 160,
    });

    this.onChange?.(down, this);
    return true;
  }
}
