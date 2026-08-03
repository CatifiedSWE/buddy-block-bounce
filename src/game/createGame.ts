import * as Phaser from "phaser";
import { BootScene } from "./scenes/BootScene";
import { Level1Scene } from "./scenes/Level1Scene";
import { COLORS, PHYSICS } from "./utils/constants";

export function createGame(parent: HTMLElement): Phaser.Game {
  return new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: 960,
    height: 540,
    pixelArt: true,
    roundPixels: true,
    backgroundColor: "#" + COLORS.bg.toString(16).padStart(6, "0"),
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    physics: {
      default: "arcade",
      arcade: {
        gravity: { x: 0, y: PHYSICS.gravityY },
        debug: false,
      },
    },
    scene: [BootScene, Level1Scene],
  });
}
