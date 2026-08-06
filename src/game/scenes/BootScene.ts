import * as Phaser from "phaser";
import { COLORS, TEX, TILE } from "../utils/constants";
import { generateTextures } from "../utils/textures";

export class BootScene extends Phaser.Scene {
  constructor() {
    super("Boot");
  }

  create() {
    generateTextures(this);
    // A single 1x1 white pixel used for background dust.
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(0xffffff, 1);
    g.fillRect(0, 0, 2, 2);
    g.generateTexture("tex-dust", 2, 2);
    g.destroy();

    void COLORS;
    void TEX;
    void TILE;
    const targetLevel = (this.game.registry.get("initialLevel") as string) || "DemoLevel";
    this.scene.start(targetLevel);
  }
}
