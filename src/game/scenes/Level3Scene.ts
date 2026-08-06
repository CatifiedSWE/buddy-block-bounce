import * as Phaser from "phaser";
import { COLORS, PHYSICS, TEX, TILE } from "../utils/constants";
import { Player, type PlayerKeys } from "../entities/Player";
import { LEVEL_3 } from "../levels/level3";
import type { TileRect } from "../levels/level1";
import { sfx } from "../utils/sfx";

const px = (t: number) => t * TILE;

const toRect = (r: TileRect) => ({
  x: px(r.x),
  y: px(r.y),
  width: px(r.width),
  height: px(r.height),
});

export class Level3Scene extends Phaser.Scene {
  private blue!: Player;
  private red!: Player;
  private players: Player[] = [];
  private solids!: Phaser.Physics.Arcade.StaticGroup;
  private spikesGroup!: Phaser.Physics.Arcade.StaticGroup;

  private exitDoorGraphic!: Phaser.GameObjects.Image;
  private postMazeZoneX = px(50); // x coordinate entering post-maze empty room

  private blueKeysOriginal!: PlayerKeys;
  private redKeysOriginal!: PlayerKeys;
  private blueKeysLive!: PlayerKeys;
  private redKeysLive!: PlayerKeys;

  private finished = false;
  private dying = false;
  private isFrozen = false;
  private camZoom = 1;

  // Intro state
  private introActive = true;
  private broomSprite!: Phaser.GameObjects.Graphics;
  private broomX = 0;
  private broomY = 0;

  // Twist state
  private swapTriggered = false;
  private postMazeTriggered = false;
  private evilShown = false;

  // UI elements
  private controlsContainer!: Phaser.GameObjects.Container;
  private twistText!: Phaser.GameObjects.Text;

  constructor() {
    super("Level3");
  }

  create() {
    this.finished = false;
    this.dying = false;
    this.isFrozen = true;
    this.introActive = true;
    this.swapTriggered = false;
    this.postMazeTriggered = false;
    this.evilShown = false;
    this.camZoom = 1;

    const worldW = px(LEVEL_3.width);
    const worldH = px(LEVEL_3.height);

    this.physics.world.setBounds(0, 0, worldW, worldH + 600);
    this.physics.world.gravity.y = PHYSICS.gravityY;
    this.cameras.main.setBounds(0, -80, worldW, worldH + 80);
    this.cameras.main.setBackgroundColor(COLORS.bg);
    this.cameras.main.roundPixels = true;

    this.buildBackground(worldW, worldH);
    this.buildSolids();
    this.buildSpikes();
    this.buildPlayers();
    this.buildBroom();
    this.runIntroSequence();

    this.cameras.main.fadeIn(600, 0, 0, 0);
  }

  // ─── Background ──────────────────────────────────────────────────────────────

  private buildBackground(worldW: number, worldH: number) {
    const bg = this.add.graphics().setDepth(-30).setScrollFactor(0);
    bg.fillGradientStyle(0x0a0c12, 0x0a0c12, COLORS.bg, COLORS.bg, 1);
    bg.fillRect(0, 0, 2000, 1200);

    for (let layer = 0; layer < 3; layer++) {
      const g = this.add
        .graphics()
        .setDepth(-20 + layer)
        .setScrollFactor(0.2 + layer * 0.2);
      const color = layer === 0 ? 0x0e1220 : layer === 1 ? 0x131826 : 0x181f30;
      g.fillStyle(color, 1);
      for (let x = -200; x < worldW; x += 140) {
        const h = 100 + ((x * 43) % 110) + layer * 30;
        g.fillTriangle(x, worldH, x + 70, worldH - h, x + 150, worldH);
        g.fillTriangle(x, 30, x + 80, 30 + h * 0.7, x + 160, 30);
      }
    }

    this.add.particles(0, 0, "tex-dust", {
      x: { min: 0, max: worldW },
      y: { min: 0, max: worldH },
      lifespan: 8000,
      speedY: { min: -8, max: -2 },
      speedX: { min: -6, max: 6 },
      scale: { min: 0.5, max: 1.8 },
      alpha: { start: 0.18, end: 0 },
    });
  }

  // ─── Solids & Spikes ─────────────────────────────────────────────────────────

  private buildSolids() {
    this.solids = this.physics.add.staticGroup();
    LEVEL_3.solids.forEach((r) => this.addSolid(toRect(r)));
  }

  private addSolid(rect: { x: number; y: number; width: number; height: number }) {
    const tile = this.add
      .tileSprite(rect.x, rect.y, rect.width, rect.height, TEX.stone)
      .setOrigin(0, 0)
      .setDepth(3);
    this.solids.add(tile);
    // CRITICAL: Update static physics body size from tileSprite dimensions!
    (tile.body as Phaser.Physics.Arcade.StaticBody).updateFromGameObject();
  }

  private buildSpikes() {
    this.spikesGroup = this.physics.add.staticGroup();
    (LEVEL_3.spikes ?? []).forEach((s, idx) => {
      const r = toRect(s);
      const isCeiling = idx === 1; // upper path ceiling spikes
      for (let x = r.x; x < r.x + r.width; x += TILE) {
        const sp = this.add
          .image(x + TILE / 2, isCeiling ? r.y : r.y + TILE, TEX.spike)
          .setOrigin(0.5, isCeiling ? 0 : 1)
          .setFlipY(isCeiling)
          .setDepth(6);
        this.spikesGroup.add(sp);
        (sp.body as Phaser.Physics.Arcade.StaticBody).updateFromGameObject();
      }
    });
  }

  // ─── Players ─────────────────────────────────────────────────────────────────

  private buildPlayers() {
    const kb = this.input.keyboard!;
    const key = (code: number) => kb.addKey(code, true, false);
    const K = Phaser.Input.Keyboard.KeyCodes;

    this.blueKeysOriginal = { left: key(K.A), right: key(K.D), jump: key(K.W) };
    this.redKeysOriginal  = { left: key(K.LEFT), right: key(K.RIGHT), jump: key(K.UP) };

    this.blueKeysLive = { ...this.blueKeysOriginal };
    this.redKeysLive  = { ...this.redKeysOriginal };

    const spawnBlue = LEVEL_3.objects.find((o) => o.name === "spawn-blue")!;
    const spawnRed  = LEVEL_3.objects.find((o) => o.name === "spawn-red")!;

    this.blue = new Player(this, px(spawnBlue.x), px(spawnBlue.y) - 20, "blue", this.blueKeysLive);
    this.red  = new Player(this, px(spawnRed.x),  px(spawnRed.y)  - 20, "red",  this.redKeysLive);
    this.players = [this.blue, this.red];

    this.physics.add.collider(this.players, this.solids);
    this.physics.add.overlap(this.players, this.spikesGroup, () => {
      this.triggerDeath();
    });

    // Exit portal marker graphics at end of maze
    const exitDef = LEVEL_3.objects.find((o) => o.name === "maze-exit")!;
    this.exitDoorGraphic = this.add.image(px(exitDef.x), px(exitDef.y), TEX.exit)
      .setOrigin(0.5, 1)
      .setDepth(2);

    this.add.text(px(exitDef.x), px(exitDef.y) - 135, "MAZE EXIT", {
      fontFamily: "monospace",
      fontSize: "14px",
      color: "#4aa3ff",
    }).setOrigin(0.5).setDepth(4);
  }

  // ─── Flying Broom Intro ───────────────────────────────────────────────────────

  private buildBroom() {
    const startX = -120;
    const flyY = px(7);

    this.broomX = startX;
    this.broomY = flyY;

    this.broomSprite = this.add.graphics().setDepth(15);
    this.drawBroom(this.broomSprite, 0, 0);

    this.blue.setPosition(startX - 12, flyY - 20);
    this.red.setPosition(startX + 12, flyY - 20);
    this.blue.body_.setVelocity(0, 0);
    this.red.body_.setVelocity(0, 0);
    this.blue.body_.setAllowGravity(false);
    this.red.body_.setAllowGravity(false);
  }

  private drawBroom(g: Phaser.GameObjects.Graphics, ox: number, oy: number) {
    g.clear();
    // Wooden handle
    g.fillStyle(0x8a6030, 1);
    g.fillRect(ox - 50, oy - 4, 100, 8);
    g.fillStyle(0xa07840, 1);
    g.fillRect(ox - 50, oy - 2, 100, 3);
    // Bristles
    g.fillStyle(0xc8a860, 1);
    g.fillRect(ox + 30, oy - 14, 22, 28);
    g.fillStyle(0xdfc080, 1);
    g.fillRect(ox + 32, oy - 12, 6, 24);
    g.fillRect(ox + 42, oy - 10, 6, 20);
    // Band
    g.fillStyle(0x6a4020, 1);
    g.fillRect(ox + 28, oy - 6, 6, 12);
  }

  private runIntroSequence() {
    const cam = this.cameras.main;
    const flyY = px(7);
    const landX = px(5);
    const landY = px(15) - 18;

    // Step 1: Broom flies through cave
    this.tweens.add({
      targets: { dummy: 0 },
      dummy: 1,
      duration: 3500,
      ease: "Linear",
      onUpdate: (_, __, ___, current: number) => {
        this.broomX = Phaser.Math.Linear(-120, landX, current);
        this.broomY = flyY;
        this.broomSprite.setPosition(this.broomX, this.broomY);
        this.blue.setPosition(this.broomX - 12, this.broomY - 22);
        this.red.setPosition(this.broomX + 12, this.broomY - 22);
        cam.centerOn(this.broomX + 100, flyY);
      },
      onComplete: () => {
        // Step 2: Display controls
        this.showControlsPanel();

        // Step 3: Display "But with a twist..." after reading controls
        this.time.delayedCall(4000, () => {
          this.showTwistMessage();

          // Step 4: Broom lands at entrance of maze
          this.time.delayedCall(1500, () => {
            this.hideTwistMessage(() => {
              this.landBroom(landX, landY);
            });
          });
        });
      },
    });
  }

  private showControlsPanel() {
    const cam = this.cameras.main;
    const W = cam.width;
    const H = cam.height;

    this.controlsContainer = this.add.container(0, 0).setScrollFactor(0).setDepth(100).setAlpha(0);

    const panelBg = this.add.rectangle(W / 2, H / 2, 480, 220, 0x0d0f16, 0.92)
      .setStrokeStyle(2, 0x3a4760);
    this.controlsContainer.add(panelBg);

    const titleText = this.add.text(W / 2, H / 2 - 85, "CONTROLS", {
      fontFamily: "monospace",
      fontSize: "14px",
      color: "#8ea0bf",
      align: "center",
      letterSpacing: 6,
    }).setOrigin(0.5);
    this.controlsContainer.add(titleText);

    const blueBlock = this.add.text(W / 2 - 110, H / 2 - 50,
      "BLUE PLAYER\n\nA = Move Left\nD = Move Right\nW = Jump", {
      fontFamily: "monospace",
      fontSize: "16px",
      color: "#4aa3ff",
      align: "center",
      lineSpacing: 8,
    }).setOrigin(0.5, 0);
    this.controlsContainer.add(blueBlock);

    const divider = this.add.rectangle(W / 2, H / 2, 2, 140, 0x2c3a50);
    this.controlsContainer.add(divider);

    const redBlock = this.add.text(W / 2 + 110, H / 2 - 50,
      "RED PLAYER\n\n↑ = Move Up\n↓ = Move Down\n← = Move Left\n→ = Move Right", {
      fontFamily: "monospace",
      fontSize: "15px",
      color: "#ff5a55",
      align: "center",
      lineSpacing: 6,
    }).setOrigin(0.5, 0);
    this.controlsContainer.add(redBlock);

    this.tweens.add({
      targets: this.controlsContainer,
      alpha: 1,
      duration: 600,
      ease: "Sine.easeOut",
    });
  }

  private showTwistMessage() {
    const cam = this.cameras.main;
    const W = cam.width;
    const H = cam.height;

    this.tweens.add({
      targets: this.controlsContainer,
      alpha: 0,
      duration: 400,
      ease: "Sine.easeIn",
    });

    this.twistText = this.add.text(W / 2, H / 2, "But with a twist...", {
      fontFamily: "monospace",
      fontSize: "28px",
      color: "#e8ecf5",
      align: "center",
    }).setOrigin(0.5).setScrollFactor(0).setDepth(101).setAlpha(0);

    this.tweens.add({
      targets: this.twistText,
      alpha: 1,
      y: H / 2 - 8,
      duration: 700,
      ease: "Sine.easeOut",
    });
  }

  private hideTwistMessage(onDone: () => void) {
    this.tweens.add({
      targets: this.twistText,
      alpha: 0,
      duration: 500,
      ease: "Sine.easeIn",
      onComplete: () => onDone(),
    });
  }

  private landBroom(targetX: number, targetY: number) {
    this.tweens.add({
      targets: { dummy: 0 },
      dummy: 1,
      duration: 1200,
      ease: "Sine.easeInOut",
      onUpdate: (_, __, ___, current: number) => {
        const curX = Phaser.Math.Linear(this.broomX, targetX, current);
        const curY = Phaser.Math.Linear(this.broomY, targetY, current);
        this.broomSprite.setPosition(curX, curY);
        this.blue.setPosition(curX - 12, curY - 22);
        this.red.setPosition(curX + 12, curY - 22);
        this.cameras.main.centerOn(curX + 80, curY);
      },
      onComplete: () => {
        this.startGameplay();
      },
    });
  }

  private startGameplay() {
    this.blue.body_.setAllowGravity(true);
    this.red.body_.setAllowGravity(true);

    const spawnBlue = LEVEL_3.objects.find((o) => o.name === "spawn-blue")!;
    const spawnRed  = LEVEL_3.objects.find((o) => o.name === "spawn-red")!;
    this.blue.setPosition(px(spawnBlue.x), px(spawnBlue.y) - 20);
    this.red.setPosition(px(spawnRed.x), px(spawnRed.y) - 20);

    this.broomSprite.setVisible(false);
    this.isFrozen = false;
    this.introActive = false;
  }

  // ─── Control Swap ─────────────────────────────────────────────────────────────

  private applyRandomSwap() {
    const modes = [1, 2, 3, 4];
    const mode = modes[Math.floor(Math.random() * modes.length)];

    const origBlue = this.blueKeysOriginal;
    const origRed  = this.redKeysOriginal;

    if (mode === 1) {
      // Invert horizontal for both players
      sfx.swapA();
      this.blue.setKeys({ left: origBlue.right, right: origBlue.left, jump: origBlue.jump });
      this.red.setKeys({ left: origRed.right, right: origRed.left, jump: origRed.jump });
    } else if (mode === 2) {
      // Swap players (Blue uses Arrow keys, Red uses WASD)
      sfx.swapB();
      this.blue.setKeys({ left: origRed.left, right: origRed.right, jump: origRed.jump });
      this.red.setKeys({ left: origBlue.left, right: origBlue.right, jump: origBlue.jump });
    } else if (mode === 3) {
      // Inverted horizontal + Swapped players
      sfx.swapA();
      this.blue.setKeys({ left: origRed.right, right: origRed.left, jump: origRed.jump });
      this.red.setKeys({ left: origBlue.right, right: origBlue.left, jump: origBlue.jump });
    } else {
      // Swapped players with mixed vertical/horizontal inversion
      sfx.swapB();
      this.blue.setKeys({ left: origRed.right, right: origRed.left, jump: origBlue.jump });
      this.red.setKeys({ left: origBlue.left, right: origBlue.right, jump: origRed.jump });
    }
  }

  // ─── Death & Restart ──────────────────────────────────────────────────────────

  private triggerDeath() {
    if (this.dying || this.finished) return;
    this.dying = true;

    sfx.trap();
    this.cameras.main.shake(320, 0.015);

    this.players.forEach((p) => {
      const sp = this.add.particles(p.x, p.y, TEX.spark, {
        speed: { min: 40, max: 160 },
        lifespan: 400,
        scale: { start: 1.5, end: 0 },
        alpha: { start: 1, end: 0 },
        gravityY: 200,
        emitting: false,
      });
      sp.setDepth(30);
      sp.explode(16);
      this.time.delayedCall(600, () => sp.destroy());
    });

    // Restart level from beginning
    this.time.delayedCall(500, () => {
      this.cameras.main.fadeOut(400, 0, 0, 0);
      this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
        this.scene.restart();
      });
    });
  }

  // ─── Post-Maze Sequence ───────────────────────────────────────────────────────

  private triggerPostMaze() {
    if (this.postMazeTriggered) return;
    this.postMazeTriggered = true;

    // Freeze player controls
    this.isFrozen = true;
    this.players.forEach((p) => {
      p.body_.setVelocity(0, 0);
      p.body_.setAcceleration(0, 0);
    });

    this.time.delayedCall(1200, () => {
      this.showEvilCharacter();
    });
  }

  private showEvilCharacter() {
    if (this.evilShown) return;
    this.evilShown = true;

    const cam = this.cameras.main;
    const W = cam.width;
    const H = cam.height;

    sfx.trap();
    cam.shake(600, 0.02);

    const overlay = this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0)
      .setScrollFactor(0)
      .setDepth(199);

    this.tweens.add({
      targets: overlay,
      alpha: 0.8,
      duration: 600,
      ease: "Sine.easeIn",
    });

    const evil = this.add.graphics().setScrollFactor(0).setDepth(200);
    this.drawEvilCharacter(evil, W / 2, H / 2 - 40);

    const evilText = this.add.text(W / 2, H / 2 + 55, "YOU SHALL NOT PASS", {
      fontFamily: "monospace",
      fontSize: "32px",
      color: "#ff2222",
      align: "center",
      shadow: {
        offsetX: 0,
        offsetY: 0,
        color: "#ff4444",
        blur: 16,
        fill: true,
      },
    }).setOrigin(0.5).setScrollFactor(0).setDepth(201).setAlpha(0);

    this.tweens.add({
      targets: evilText,
      alpha: 1,
      scaleX: { from: 1.4, to: 1 },
      scaleY: { from: 1.4, to: 1 },
      duration: 500,
      delay: 400,
      ease: "Sine.easeOut",
    });

    // Pulsing text effect
    this.tweens.add({
      targets: evilText,
      alpha: { from: 1, to: 0.7 },
      duration: 600,
      yoyo: true,
      repeat: -1,
      delay: 1000,
    });

    // Show for 5 seconds, then fade to full black and roll credits
    this.time.delayedCall(5000, () => {
      this.finished = true;
      cam.fadeOut(1500, 0, 0, 0);
      cam.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
        this.scene.start("Credits");
      });
    });
  }

  private drawEvilCharacter(g: Phaser.GameObjects.Graphics, cx: number, cy: number) {
    g.fillStyle(0x1a0000, 1);
    g.fillTriangle(cx - 55, cy + 55, cx + 55, cy + 55, cx, cy - 65);
    g.fillStyle(0x0d0000, 1);
    g.fillCircle(cx, cy - 52, 22);
    g.fillStyle(0xff2200, 1);
    g.fillCircle(cx - 8, cy - 55, 4);
    g.fillCircle(cx + 8, cy - 55, 4);
    g.fillStyle(0xff8888, 0.8);
    g.fillCircle(cx - 7, cy - 56, 1.5);
    g.fillCircle(cx + 9, cy - 56, 1.5);
    g.fillStyle(0x2a1000, 1);
    g.fillRect(cx + 40, cy - 80, 5, 130);
    g.fillStyle(0x880000, 1);
    g.fillCircle(cx + 42, cy - 82, 10);
    g.fillStyle(0xff4444, 0.6);
    g.fillCircle(cx + 42, cy - 82, 5);

    g.fillStyle(0x440000, 0.3);
    g.fillCircle(cx, cy, 90);
    g.fillStyle(0x220000, 0.2);
    g.fillCircle(cx, cy, 120);
  }

  // ─── Stacking ────────────────────────────────────────────────────────────────

  private resolveStacking() {
    this.blue.standingOnPartner = false;
    this.red.standingOnPartner = false;

    const pairs: Array<[Player, Player]> = [
      [this.blue, this.red],
      [this.red, this.blue],
    ];

    pairs.forEach(([top, bottom]) => {
      const tb = top.body_;
      const bb = bottom.body_;
      const overlapX = Math.min(tb.right, bb.right) - Math.max(tb.left, bb.left);
      const feet = tb.bottom;
      const head = bb.top;
      const landing = feet >= head - 4 && feet <= head + 22 && tb.top < head;
      if (overlapX > 6 && tb.velocity.y >= -20 && landing) {
        const dy = feet - head;
        top.y -= dy;
        tb.y -= dy;
        if (tb.velocity.y > 0) tb.velocity.y = 0;
        top.x += bb.deltaX();
        tb.x += bb.deltaX();
        top.standingOnPartner = true;
      }
    });
  }

  // ─── Camera ──────────────────────────────────────────────────────────────────

  private updateCamera(delta: number) {
    const cam = this.cameras.main;
    const midX = (this.blue.x + this.red.x) / 2;
    const midY = (this.blue.y + this.red.y) / 2;
    const spread = Math.abs(this.blue.x - this.red.x);
    const spreadY = Math.abs(this.blue.y - this.red.y);

    const needW = Math.max(spread + 360, 760);
    const needH = Math.max(spreadY + 260, 460);
    const target = Phaser.Math.Clamp(
      Math.min(cam.width / needW, cam.height / needH),
      0.62,
      1.15,
    );
    this.camZoom = Phaser.Math.Linear(this.camZoom, target, 1 - Math.pow(0.001, delta / 1000));
    cam.setZoom(this.camZoom);

    const cx = Phaser.Math.Linear(cam.midPoint.x, midX, 1 - Math.pow(0.0002, delta / 1000));
    const cy = Phaser.Math.Linear(cam.midPoint.y, midY - 40, 1 - Math.pow(0.002, delta / 1000));
    cam.centerOn(cx, cy);
  }

  // ─── Respawn & Triggers ──────────────────────────────────────────────────────

  private updateRespawn() {
    const floor = px(LEVEL_3.height) + 120;
    if (this.players.some((p) => p.y > floor)) {
      this.triggerDeath();
    }
  }

  private updateTriggers() {
    if (this.postMazeTriggered) return;

    // Trigger control swap when stepping into the maze (past x = 10 tiles)
    if (!this.swapTriggered) {
      const inMaze = this.players.some((p) => p.x > px(10));
      if (inMaze) {
        this.swapTriggered = true;
        this.applyRandomSwap();
      }
    }

    // Trigger post-maze evil character when stepping past the maze exit portal into empty room
    const pastExit = this.players.every((p) => p.x > this.postMazeZoneX);
    if (pastExit) {
      this.triggerPostMaze();
    }
  }

  // ─── Update Loop ─────────────────────────────────────────────────────────────

  override update(_time: number, delta: number) {
    if (this.finished || this.introActive) return;

    if (this.isFrozen) {
      this.players.forEach((p) => {
        p.body_.setVelocity(0, 0);
        p.body_.setAcceleration(0, 0);
      });
      return;
    }

    if (this.dying) return;

    this.resolveStacking();
    this.players.forEach((p) => p.tick(delta));
    this.updateCamera(delta);
    this.updateRespawn();
    this.updateTriggers();
  }
}
