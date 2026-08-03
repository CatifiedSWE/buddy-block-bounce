import * as Phaser from "phaser";
import { COLORS, TEX } from "./constants";

/**
 * All art is generated at runtime so the prototype ships with zero binary
 * assets while still looking like hand-placed pixel art.
 */
export function generateTextures(scene: Phaser.Scene) {
  const g = scene.make.graphics({ x: 0, y: 0 }, false);

  const rect = (x: number, y: number, w: number, h: number, color: number, alpha = 1) => {
    g.fillStyle(color, alpha);
    g.fillRect(x, y, w, h);
  };

  // ---- stone tile -------------------------------------------------------
  g.clear();
  rect(0, 0, 32, 32, COLORS.stone);
  rect(0, 0, 32, 3, COLORS.stoneLight);
  rect(0, 29, 32, 3, COLORS.stoneDark);
  const speckles: Array<[number, number]> = [
    [4, 8],
    [20, 6],
    [12, 18],
    [26, 22],
    [7, 25],
  ];
  speckles.forEach(([x, y]) => rect(x, y, 3, 3, COLORS.stoneDark));
  const glints: Array<[number, number]> = [
    [16, 11],
    [24, 14],
    [3, 16],
  ];
  glints.forEach(([x, y]) => rect(x, y, 2, 2, COLORS.stoneLight, 0.5));
  g.generateTexture(TEX.stone, 32, 32);

  // ---- bridge plank -----------------------------------------------------
  g.clear();
  rect(0, 0, 32, 16, 0x7a6248);
  rect(0, 0, 32, 2, 0x9a7d5c);
  rect(0, 13, 32, 3, 0x4e3f2e);
  rect(15, 0, 2, 16, 0x5f4c38);
  g.generateTexture(TEX.bridge, 32, 16);

  // ---- players ----------------------------------------------------------
  const player = (key: string, body: number, dark: number) => {
    g.clear();
    rect(3, 2, 18, 32, dark);
    rect(4, 3, 16, 30, body);
    rect(4, 3, 16, 3, 0xffffff, 0.35);
    // visor
    rect(6, 9, 12, 7, 0x0e1220);
    rect(8, 11, 3, 3, 0xffffff, 0.9);
    rect(14, 11, 3, 3, 0xffffff, 0.55);
    // legs
    rect(5, 30, 5, 4, dark);
    rect(14, 30, 5, 4, dark);
    g.generateTexture(key, 24, 36);
  };
  player(TEX.playerBlue, COLORS.blue, COLORS.blueDark);
  player(TEX.playerRed, COLORS.red, COLORS.redDark);

  // ---- spark ------------------------------------------------------------
  g.clear();
  rect(0, 0, 4, 4, 0xffffff);
  g.generateTexture(TEX.spark, 4, 4);

  // ---- buttons ----------------------------------------------------------
  const button = (key: string, body: number, dark: number) => {
    g.clear();
    rect(0, 6, 48, 8, 0x2c3340);
    rect(4, 0, 40, 8, dark);
    rect(6, 0, 36, 5, body);
    rect(6, 0, 36, 2, 0xffffff, 0.35);
    g.generateTexture(key, 48, 14);
  };
  button(TEX.buttonBlue, COLORS.blue, COLORS.blueDark);
  button(TEX.buttonRed, COLORS.red, COLORS.redDark);

  // ---- doors ------------------------------------------------------------
  const door = (key: string, w: number, h: number, body: number, dark: number) => {
    g.clear();
    rect(0, 0, w, h, dark);
    rect(2, 2, w - 4, h - 4, body);
    for (let y = 6; y < h - 4; y += 12) rect(3, y, w - 6, 2, 0x000000, 0.22);
    rect(0, 0, w, 3, 0xffffff, 0.25);
    g.generateTexture(key, w, h);
  };
  door(TEX.doorRed, 24, 160, COLORS.red, COLORS.redDark);
  door(TEX.doorBlue, 24, 160, COLORS.blue, COLORS.blueDark);
  door(TEX.doorGate, 40, 224, 0x8a93a6, 0x4b5262);

  // ---- exit portal ------------------------------------------------------
  g.clear();
  rect(0, 0, 72, 128, 0x1b2130);
  rect(4, 4, 64, 120, 0x101725);
  rect(10, 10, 52, 108, 0x243149);
  rect(10, 10, 52, 4, 0xffffff, 0.18);
  rect(28, 60, 16, 6, 0xd7e2ff, 0.5);
  g.generateTexture(TEX.exit, 72, 128);

  g.destroy();
}
