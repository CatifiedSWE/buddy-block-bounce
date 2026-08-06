import * as Phaser from "phaser";
import { COLORS } from "../utils/constants";

const CREDITS_LINES = [
  "",
  "BUDDY BLOCK BOUNCE",
  "",
  "— A COOPERATIVE PLATFORMER —",
  "",
  "",
  "DESIGN & DEVELOPMENT",
  "The Dev",
  "",
  "LEVEL DESIGN",
  "The Dev",
  "",
  "SOUND DESIGN",
  "Procedural WebAudio",
  "",
  "SPECIAL THANKS",
  "Everyone who played",
  "Everyone who died to the spikes",
  "Everyone who got trolled",
  "",
  "",
  "YOU SHALL NOT PASS",
  "",
  "",
  "— THANKS FOR PLAYING —",
  "",
  "",
];

export class CreditsScene extends Phaser.Scene {
  constructor() {
    super("Credits");
  }

  create() {
    const cam = this.cameras.main;
    const W = cam.width;
    const H = cam.height;

    // Deep dark background
    this.add.rectangle(0, 0, W, H, 0x000000).setOrigin(0, 0);

    // Subtle star field
    for (let i = 0; i < 80; i++) {
      const x = Phaser.Math.Between(0, W);
      const y = Phaser.Math.Between(0, H);
      const size = Phaser.Math.Between(1, 2);
      const alpha = Phaser.Math.FloatBetween(0.2, 0.7);
      this.add.rectangle(x, y, size, size, 0xffffff, alpha);
    }

    // Build credits text block
    const lineH = 36;
    const totalH = CREDITS_LINES.length * lineH;
    const startY = H + 60;
    const endY = -totalH - 60;

    const container = this.add.container(0, 0);

    CREDITS_LINES.forEach((line, i) => {
      const y = startY + i * lineH;
      const isTitle = line === "BUDDY BLOCK BOUNCE";
      const isSection = line === line.toUpperCase() && line.length > 0 && !isTitle && line !== "YOU SHALL NOT PASS";
      const isYSNP = line === "YOU SHALL NOT PASS";
      const isTagline = line === "— A COOPERATIVE PLATFORMER —" || line === "— THANKS FOR PLAYING —";

      let fontSize = "16px";
      let color = "#8ea0bf";
      if (isTitle) { fontSize = "38px"; color = "#e8ecf5"; }
      else if (isYSNP) { fontSize = "28px"; color = "#ff3333"; }
      else if (isSection) { fontSize = "14px"; color = "#4aa3ff"; }
      else if (isTagline) { fontSize = "13px"; color = "#6a7a9a"; }

      const txt = this.add.text(W / 2, y, line, {
        fontFamily: "monospace",
        fontSize,
        color,
        align: "center",
      }).setOrigin(0.5, 0);

      container.add(txt);
    });

    // Scroll credits upward
    const scrollDuration = Math.max(totalH + H + 120, 1) / 55 * 1000; // ~55 px/s

    this.tweens.add({
      targets: container,
      y: endY - startY,
      duration: scrollDuration,
      ease: "Linear",
      onComplete: () => {
        // Hold on black then restart loop or just stay
        this.time.delayedCall(2000, () => {
          cam.fadeOut(1200, 0, 0, 0);
          cam.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
            this.scene.start("Credits");
          });
        });
      },
    });

    // Fade in
    cam.fadeIn(1500, 0, 0, 0);
  }
}
