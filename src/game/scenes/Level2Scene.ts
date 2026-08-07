import * as Phaser from "phaser";
import { COLORS, PHYSICS, TEX, TILE } from "../utils/constants";
import { Player, type PlayerKeys } from "../entities/Player";
import { LEVEL_2 } from "../levels/level2";
import type { TileRect } from "../levels/level1";
import { sfx } from "../utils/sfx";

const px = (t: number) => t * TILE;

const toRect = (r: TileRect) => ({
  x: px(r.x),
  y: px(r.y),
  width: px(r.width),
  height: px(r.height),
});

export class Level2Scene extends Phaser.Scene {
  private blue!: Player;
  private red!: Player;
  private players: Player[] = [];
  private solids!: Phaser.Physics.Arcade.StaticGroup;
  private spikesGroup!: Phaser.Physics.Arcade.StaticGroup;

  private exitZone!: Phaser.Geom.Rectangle;
  private fakeExitZone!: Phaser.Geom.Rectangle;
  private fakeExitTriggered = false;

  private exitTimer = 0;
  private finished = false;
  private dying = false;
  private isFrozen = false;

  private checkpoints: number[] = [];
  private checkpointIndex = -1;

  private triggers: Array<{ x: number; fired: boolean; run: () => void }> = [];
  private camZoom = 1;

  // Act 2 Collapsing floor (x: 15..18)
  private collapsingPlanks: Phaser.GameObjects.TileSprite[] = [];
  private floorTrapTriggered = false;

  // Act 3 Left Spike Chase — purely visual, manually moved each frame
  private chaserSprites: Phaser.GameObjects.Image[] = [];
  private chaserHitbox!: Phaser.Geom.Rectangle;
  private spikeChaseActive = false;
  private chaserX = -9999;
  private chaserW = TILE * 2; // visual width
  private readonly leftSpikeSpeed = 220.5; // 105 % of 210

  // Act 4 Fast Harmless Right Spikes (150% speed = 315 px/s)
  private fastRightSprites: Phaser.GameObjects.Image[] = [];
  private fastRightSpikesActive = false;
  private readonly rightSpikeSpeed = 315;
  private harmlessRightTriggered = false;

  // Act 4 Non-freezing warning containers
  private pitWarningContainer: Phaser.GameObjects.Container | null = null;
  private pitWarningText: Phaser.GameObjects.Text | null = null;
  private pitWarningBox: Phaser.GameObjects.Rectangle | null = null;
  private pitWarningTriggered = false;
  private justKiddingTriggered = false;

  constructor() {
    super("Level2");
  }

  create() {
    this.dying = false;
    this.finished = false;
    this.isFrozen = false;
    this.fakeExitTriggered = false;
    this.floorTrapTriggered = false;
    this.spikeChaseActive = false;
    this.fastRightSpikesActive = false;
    this.harmlessRightTriggered = false;
    this.pitWarningTriggered = false;
    this.justKiddingTriggered = false;
    this.pitWarningContainer = null;
    this.checkpointIndex = -1;
    this.chaserX = -9999;
    this.chaserHitbox = new Phaser.Geom.Rectangle(-9999, 0, TILE, px(LEVEL_2.height));

    const worldW = px(LEVEL_2.width);
    const worldH = px(LEVEL_2.height);

    this.physics.world.setBounds(0, 0, worldW, worldH + 600);
    this.physics.world.gravity.y = PHYSICS.gravityY;
    this.cameras.main.setBounds(0, -160, worldW, worldH + 160);
    this.cameras.main.setBackgroundColor(COLORS.bg);
    this.cameras.main.roundPixels = true;

    this.buildBackground(worldW, worldH);

    this.solids = this.physics.add.staticGroup();
    LEVEL_2.solids.forEach((r) => {
      if (this.floorTrapTriggered && r.x === 0 && r.y === 20 && r.width === 32) {
        this.addSolid(toRect({ x: 0, y: 20, width: 18, height: 6 }));
        this.addSolid(toRect({ x: 22, y: 20, width: 10, height: 6 }));
      } else {
        this.addSolid(toRect(r));
      }
    });

    this.spikesGroup = this.physics.add.staticGroup();
    this.buildSpikes();

    this.buildCollapsingFloor();
    this.buildChaserSprites();
    this.buildFastRightSprites();
    this.buildObjects();
    this.buildPlayers();
    this.buildTriggers();

    this.cameras.main.fadeIn(500, 0, 0, 0);
  }

  // ─── Background ──────────────────────────────────────────────────────────────

  private buildBackground(worldW: number, worldH: number) {
    const bg = this.add.graphics().setDepth(-30).setScrollFactor(0);
    bg.fillGradientStyle(0x141a2b, 0x141a2b, COLORS.bg, COLORS.bg, 1);
    bg.fillRect(0, 0, 2000, 1200);

    for (let layer = 0; layer < 2; layer++) {
      const g = this.add
        .graphics()
        .setDepth(-20 + layer)
        .setScrollFactor(0.25 + layer * 0.25);
      const color = layer === 0 ? 0x1a2032 : 0x222a40;
      g.fillStyle(color, 1);
      for (let x = -200; x < worldW; x += 160) {
        const h = 90 + ((x * 37) % 130) + layer * 40;
        g.fillTriangle(x, worldH, x + 80, worldH - h, x + 170, worldH);
        g.fillTriangle(x, 40, x + 90, 40 + h * 0.6, x + 180, 40);
      }
    }

    this.add.particles(0, 0, "tex-dust", {
      x: { min: 0, max: worldW },
      y: { min: 0, max: worldH },
      lifespan: 6000,
      speedY: { min: -12, max: -3 },
      speedX: { min: -8, max: 8 },
      scale: { min: 0.6, max: 1.6 },
      alpha: { start: 0.22, end: 0 },
    });
  }

  // ─── Solids & spikes ─────────────────────────────────────────────────────────

  private addSolid(rect: { x: number; y: number; width: number; height: number }) {
    const tile = this.add
      .tileSprite(rect.x, rect.y, rect.width, rect.height, TEX.stone)
      .setOrigin(0, 0);
    this.solids.add(tile);
  }

  private buildSpikes() {
    (LEVEL_2.spikes ?? []).forEach((s) => {
      const r = toRect(s);
      for (let x = r.x; x < r.x + r.width; x += TILE) {
        const spikeSprite = this.add
          .image(x + TILE / 2, r.y + TILE, TEX.spike)
          .setOrigin(0.5, 1)
          .setDepth(4)
          .setVisible(false)
          .setAlpha(0);
        this.spikesGroup.add(spikeSprite);
      }
    });
  }

  // ─── Collapsing floor ────────────────────────────────────────────────────────

  private buildCollapsingFloor() {
    this.collapsingPlanks = [];
    const trapX = px(18);
    const trapY = px(20);
    const trapW = px(4);

    if (this.floorTrapTriggered) {
      // On retry after trap fired: pit spikes remain revealed
      this.spikesGroup.getChildren().forEach((sp) => {
        (sp as Phaser.GameObjects.Image).setVisible(true).setAlpha(1);
      });
      return;
    }

    // On 1st attempt: build seamless overlay planks covering x=18..21
    for (let x = trapX; x < trapX + trapW; x += TILE) {
      const plank = this.add
        .tileSprite(x, trapY, TILE, TILE, TEX.stone)
        .setOrigin(0, 0)
        .setDepth(6);
      this.collapsingPlanks.push(plank);
    }
  }

  // ─── Chaser spike wall (visual only, no Arcade physics) ──────────────────────

  private buildChaserSprites() {
    this.chaserSprites = [];
    const worldH = px(LEVEL_2.height);

    // Build two columns of spikes instantiated far off-screen (-9999)
    for (let col = 0; col < 2; col++) {
      for (let row = -6; row <= Math.ceil(worldH / TILE) + 2; row++) {
        const sp = this.add
          .image(-9999, -9999, TEX.spike)
          .setAngle(col === 0 ? 90 : -90)
          .setDepth(25)
          .setVisible(false)
          .setAlpha(0);

        this.chaserSprites.push(sp);
      }
    }
  }

  // ─── Harmless fast right spikes ──────────────────────────────────────────────

  private buildFastRightSprites() {
    this.fastRightSprites = [];
    const worldH = px(LEVEL_2.height);

    for (let row = -6; row <= Math.ceil(worldH / TILE) + 2; row++) {
      const sp = this.add
        .image(-9999, -9999, TEX.spike)
        .setAngle(-90)
        .setDepth(20)
        .setVisible(false)
        .setAlpha(0);

      this.fastRightSprites.push(sp);
    }
  }

  // ─── Objects (exits, checkpoints) ────────────────────────────────────────────

  private buildObjects() {
    const o = LEVEL_2.objects;

    // Act 1 Fake Exit Door
    const fakeExitDef = o.find((x) => x.name === "fake-exit")!;
    this.add
      .image(px(fakeExitDef.x), px(fakeExitDef.y), TEX.exit)
      .setOrigin(0.5, 1)
      .setDepth(2);

    // Act 1 "EMERGENCY EXIT" Big Banner
    this.add
      .text(px(fakeExitDef.x), px(fakeExitDef.y) - 135, "🚨 EMERGENCY EXIT 🚨", {
        fontFamily: "monospace",
        fontSize: "18px",
        color: "#ffdd44",
        backgroundColor: "#111622dd",
        padding: { x: 10, y: 5 },
        align: "center",
      })
      .setOrigin(0.5, 1)
      .setDepth(15);

    this.fakeExitZone = new Phaser.Geom.Rectangle(
      px(fakeExitDef.x) - 48,
      px(fakeExitDef.y) - 128,
      96,
      128,
    );

    // Act 4 Real Exit Door at x: 113
    const realExitDef = o.find((x) => x.name === "real-exit")!;
    this.add
      .image(px(realExitDef.x), px(realExitDef.y), TEX.exit)
      .setOrigin(0.5, 1)
      .setDepth(2);

    this.exitZone = new Phaser.Geom.Rectangle(
      px(realExitDef.x) - 36,
      px(realExitDef.y) - 128,
      72,
      128,
    );

    this.checkpoints = o.filter((x) => x.type === "checkpoint").map((c) => px(c.x));
  }

  // ─── Players ─────────────────────────────────────────────────────────────────

  private buildPlayers() {
    const kb = this.input.keyboard!;
    const key = (code: number) => kb.addKey(code, true, false);
    const K = Phaser.Input.Keyboard.KeyCodes;

    const blueKeys: PlayerKeys = { left: key(K.A), right: key(K.D), jump: key(K.W) };
    const redKeys: PlayerKeys = { left: key(K.LEFT), right: key(K.RIGHT), jump: key(K.UP) };

    const spawnBlue = LEVEL_2.objects.find((o) => o.name === "spawn-blue")!;
    const spawnRed = LEVEL_2.objects.find((o) => o.name === "spawn-red")!;

    this.blue = new Player(this, px(spawnBlue.x), px(spawnBlue.y) - 20, "blue", blueKeys);
    this.red = new Player(this, px(spawnRed.x), px(spawnRed.y) - 20, "red", redKeys);
    this.players = [this.blue, this.red];

    this.physics.add.collider(this.players, this.solids);

    // Static pit spikes hazard collision
    this.physics.add.overlap(this.players, this.spikesGroup, () => {
      this.triggerSharedDeath();
    });

    const mid = (this.blue.x + this.red.x) / 2;
    this.cameras.main.centerOn(mid, this.blue.y - 40);
  }

  // ─── Triggers ────────────────────────────────────────────────────────────────

  private buildTriggers() {
    this.triggers = [
      {
        x: px(17.5),
        fired: false,
        run: () => this.triggerCollapsingFloor(),
      },
      {
        x: px(31),
        fired: false,
        run: () => this.triggerSpikeChase(),
      },
      {
        x: px(91),
        fired: false,
        run: () => this.triggerHarmlessRightSpikes(),
      },
      // PIT AHEAD warning 15 tiles away from exit (exit at x=113, so 113-15 = 98)
      {
        x: px(98),
        fired: false,
        run: () => this.triggerPitWarning(),
      },
      // Just Kidding warning 5 tiles away from exit (exit at x=113, so 113-5 = 108)
      {
        x: px(108),
        fired: false,
        run: () => this.triggerJustKidding(),
      },
    ];
  }

  // ─── Collapsing floor trigger ─────────────────────────────────────────────────

  private triggerCollapsingFloor() {
    if (this.floorTrapTriggered) return;
    this.floorTrapTriggered = true;
    sfx.trap();
    this.cameras.main.shake(250, 0.01);

    // Reveal spikes inside the pit as the floor drops
    this.spikesGroup.getChildren().forEach((sp) => {
      (sp as Phaser.GameObjects.Image).setVisible(true).setAlpha(1);
    });

    // Re-build solids to split continuous ground (x:0..32) into left (0..18) and right (22..32)
    this.solids.clear(true, true);
    LEVEL_2.solids.forEach((r) => {
      if (r.x === 0 && r.y === 20 && r.width === 32) {
        this.addSolid(toRect({ x: 0, y: 20, width: 18, height: 6 }));
        this.addSolid(toRect({ x: 22, y: 20, width: 10, height: 6 }));
      } else {
        this.addSolid(toRect(r));
      }
    });

    // Animate falling planks
    this.collapsingPlanks.forEach((plank, i) => {
      this.tweens.add({
        targets: plank,
        y: plank.y + 600,
        angle: Phaser.Math.Between(-30, 30),
        alpha: 0.1,
        delay: i * 40,
        duration: 800,
        ease: "Quad.easeIn",
        onComplete: () => plank.destroy(),
      });
    });
  }

  // ─── Spike chase trigger (Spike wall visible at freeze t=0s, movement starts t=2.0s, unfreeze t=2.5s) ─

  private triggerSpikeChase() {
    if (this.spikeChaseActive || this.isFrozen) return;
    this.isFrozen = true; // Hold player movement during reveal animation

    // Freeze player movement
    this.players.forEach((p) => {
      p.body_.setVelocity(0, 0);
      p.body_.setAcceleration(0, 0);
    });

    sfx.trap();
    this.cameras.main.shake(300, 0.015);

    const trailX = Math.min(this.blue.x, this.red.x);
    const playerMidX = (this.blue.x + this.red.x) / 2;
    const midY = (this.blue.y + this.red.y) / 2 - 40;

    this.chaserX = trailX - 300;
    this.chaserHitbox.setPosition(this.chaserX, 0);

    // Make spike wall VISIBLE IMMEDIATELY at t=0s
    let colIdx = 0;
    let rowIdx = 0;
    const worldH = px(LEVEL_2.height);
    const rowCount = Math.ceil(worldH / TILE) + 9;

    this.chaserSprites.forEach((sp, idx) => {
      colIdx = Math.floor(idx / rowCount);
      rowIdx = idx % rowCount;
      sp.setPosition(this.chaserX + colIdx * TILE, -6 * TILE + rowIdx * TILE);
      sp.setVisible(true);
      sp.setAlpha(1);
    });

    // 1. Pan camera LEFT to reveal spike wall behind players (no zoom out)
    const spikeRevealX = this.chaserX + 160;
    this.cameras.main.pan(spikeRevealX, midY, 700, "Sine.easeInOut");

    // 2. At 800ms, display warning hint and pan camera back RIGHT to players
    this.time.delayedCall(800, () => {
      this.floatingHint(
        trailX + 80,
        px(14),
        "⚠ SPIKE WALL INCOMING! RUN! 🏃‍♂️💨",
        0xff5a55,
        4000,
      );
      this.cameras.main.pan(playerMidX, midY, 900, "Sine.easeInOut");
    });

    // 3. At 1800ms, start spike wall movement!
    this.time.delayedCall(1800, () => {
      this.spikeChaseActive = true;
    });

    // 4. At 2100ms, unfreeze players so they can run!
    this.time.delayedCall(2100, () => {
      this.isFrozen = false;
    });
  }

  // ─── Harmless right spikes trigger ───────────────────────────────────────────

  private triggerHarmlessRightSpikes() {
    if (this.harmlessRightTriggered) return;
    this.harmlessRightTriggered = true;
    this.fastRightSpikesActive = true;

    sfx.trap();
    this.cameras.main.shake(300, 0.012);

    const startX = px(112);
    const worldH = px(LEVEL_2.height);
    const rowCount = Math.ceil(worldH / TILE) + 9;

    this.fastRightSprites.forEach((sp, idx) => {
      const rowIdx = idx % rowCount;
      sp.setPosition(startX, -6 * TILE + rowIdx * TILE);
      sp.setVisible(true);
      sp.setAlpha(1);
    });
  }

  // ─── PIT AHEAD warning (15 tiles away from exit, NO control freeze) ──────────

  private triggerPitWarning() {
    if (this.pitWarningTriggered || this.finished) return;
    this.pitWarningTriggered = true;
    sfx.buttonOn();

    const cam = this.cameras.main;
    const cx = cam.width / 2;
    const cy = 70; // top center screen

    this.pitWarningContainer = this.add.container(cx, cy).setScrollFactor(0).setDepth(200);

    this.pitWarningBox = this.add
      .rectangle(0, 0, 420, 56, 0x0d0f16, 0.95)
      .setStrokeStyle(3, 0xff5a55);
    this.pitWarningContainer.add(this.pitWarningBox);

    this.pitWarningText = this.add
      .text(0, 0, "⚠ PIT AHEAD", {
        fontFamily: "monospace",
        fontSize: "22px",
        color: "#ff5a55",
        align: "center",
      })
      .setOrigin(0.5);
    this.pitWarningContainer.add(this.pitWarningText);
  }

  // ─── Just Kidding warning (5 tiles away from exit, NO control freeze) ─────────

  private triggerJustKidding() {
    if (this.justKiddingTriggered || this.finished) return;
    this.justKiddingTriggered = true;
    sfx.save();

    if (!this.pitWarningContainer) {
      this.triggerPitWarning();
    }

    if (this.pitWarningBox && this.pitWarningText) {
      this.pitWarningBox.setStrokeStyle(3, 0x4aa3ff);
      this.pitWarningText.setText("Just kidding. 😂").setColor("#4aa3ff");
    }

    this.time.delayedCall(1200, () => {
      if (this.pitWarningContainer) {
        this.tweens.add({
          targets: this.pitWarningContainer,
          alpha: 0,
          scale: 0.8,
          duration: 350,
          onComplete: () => {
            this.pitWarningContainer?.destroy();
            this.pitWarningContainer = null;
          },
        });
      }
    });
  }

  // ─── Shared death ────────────────────────────────────────────────────────────

  private triggerSharedDeath() {
    if (this.dying || this.finished) return;
    this.dying = true;

    sfx.trap();
    this.cameras.main.shake(320, 0.015);

    // Hide and reset the chaser wall
    this.spikeChaseActive = false;
    this.chaserX = -9999;
    this.chaserHitbox.setPosition(-9999, 0);
    this.chaserSprites.forEach((sp) => sp.setVisible(false).setAlpha(0));

    // Destroy warning container if present
    if (this.pitWarningContainer) {
      this.pitWarningContainer.destroy();
      this.pitWarningContainer = null;
    }

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
      this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
        this.scene.restart();
      });
      this.cameras.main.fadeOut(400, 0, 0, 0);
    });
  }

  // ─── Floating hint ───────────────────────────────────────────────────────────

  private floatingHint(x: number, y: number, text: string, color = 0xe8ecf5, life = 5200) {
    const label = this.add
      .text(x, y, text, {
        fontFamily: "monospace",
        fontSize: "15px",
        color: "#" + color.toString(16).padStart(6, "0"),
        align: "center",
        backgroundColor: "#0d0f16bb",
        padding: { x: 8, y: 4 },
      })
      .setOrigin(0.5)
      .setDepth(40)
      .setAlpha(0);

    this.tweens.add({ targets: label, alpha: 1, y: y - 10, duration: 420, ease: "Sine.easeOut" });
    this.tweens.add({
      targets: label,
      y: y - 18,
      duration: 1600,
      yoyo: true,
      repeat: -1,
      delay: 420,
      ease: "Sine.easeInOut",
    });
    this.time.delayedCall(life, () => {
      this.tweens.add({
        targets: label,
        alpha: 0,
        duration: 500,
        onComplete: () => label.destroy(),
      });
    });
    return label;
  }

  // ─── Update ──────────────────────────────────────────────────────────────────

  override update(_time: number, delta: number) {
    if (this.finished || this.dying) return;

    this.checkFakeExit();

    if (this.isFrozen) {
      this.players.forEach((p) => {
        p.body_.setVelocity(0, 0);
        p.body_.setAcceleration(0, 0);
      });
      this.updateChaserWall(delta);
      return;
    }

    this.resolveStacking();
    this.players.forEach((p) => p.tick(delta));

    this.updateChaserWall(delta);
    this.updateFastRightSpikes(delta);

    this.updateCamera(delta);
    this.updateTriggers();
    this.updateRespawn();
    this.updateExit(delta);
  }

  private updateChaserWall(delta: number) {
    if (!this.spikeChaseActive) return;
    const dt = delta / 1000;
    this.chaserX += this.leftSpikeSpeed * dt;
    this.chaserHitbox.x = this.chaserX;

    let colIdx = 0;
    let rowIdx = 0;
    const worldH = px(LEVEL_2.height);
    const rowCount = Math.ceil(worldH / TILE) + 9;

    this.chaserSprites.forEach((sp, idx) => {
      colIdx = Math.floor(idx / rowCount);
      rowIdx = idx % rowCount;
      sp.x = this.chaserX + colIdx * TILE;
      sp.y = -6 * TILE + rowIdx * TILE;
    });

    if (!this.dying) {
      const wallRect = new Phaser.Geom.Rectangle(this.chaserX - 4, -999, TILE * 2 + 8, 99999);
      const hit = this.players.some((p) =>
        Phaser.Geom.Intersects.RectangleToRectangle(p.getBounds(), wallRect),
      );
      if (hit) this.triggerSharedDeath();
    }

    if (this.chaserX >= px(73)) {
      this.spikeChaseActive = false;
      this.tweens.add({
        targets: this.chaserSprites,
        alpha: 0,
        duration: 600,
        onComplete: () => {
          this.chaserSprites.forEach((sp) => sp.setVisible(false));
          this.chaserX = -9999;
          this.chaserHitbox.setPosition(-9999, 0);
        },
      });
    }
  }

  private updateFastRightSpikes(delta: number) {
    if (!this.fastRightSpikesActive) return;
    const moveDistance = (this.rightSpikeSpeed * delta) / 1000;
    this.fastRightSprites.forEach((sp) => {
      sp.x -= moveDistance;
    });

    const leadSpike = this.fastRightSprites[0];
    if (leadSpike && leadSpike.x < px(60)) {
      this.fastRightSpikesActive = false;
      this.tweens.add({
        targets: this.fastRightSprites,
        alpha: 0,
        duration: 400,
        onComplete: () => this.fastRightSprites.forEach((sp) => sp.setVisible(false)),
      });
    }
  }

  // ─── Fake exit check ─────────────────────────────────────────────────────────

  private checkFakeExit() {
    if (this.fakeExitTriggered) return;
    const inFake = this.players.some((p) =>
      Phaser.Geom.Intersects.RectangleToRectangle(p.getBounds(), this.fakeExitZone),
    );

    if (inFake) {
      this.fakeExitTriggered = true;
      sfx.buttonOff();
      this.floatingHint(
        px(3),
        px(16),
        "You actually thought it'd be that easy? 😂\nHead RIGHT →",
        0xffd166,
        6000,
      );
    }
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
    if (this.isFrozen) return;

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

  // ─── Triggers & Checkpoints ──────────────────────────────────────────────────

  private updateTriggers() {
    const lead = Math.max(this.blue.x, this.red.x);
    this.triggers.forEach((t) => {
      if (!t.fired && lead > t.x) {
        t.fired = true;
        t.run();
      }
    });

    const trail = Math.min(this.blue.x, this.red.x);
    this.checkpoints.forEach((cx, i) => {
      if (i > this.checkpointIndex && trail > cx) {
        this.checkpointIndex = i;
        const y = px(20) - 20;
        this.blue.setSpawn(cx + 24, y);
        this.red.setSpawn(cx + 72, y);
      }
    });
  }

  // ─── Respawn on fall ─────────────────────────────────────────────────────────

  private updateRespawn() {
    const floor = px(LEVEL_2.height) + 120;
    const outOfBounds = this.players.some((p) => p.y > floor);
    if (outOfBounds) {
      this.triggerSharedDeath();
    }
  }

  // ─── Exit ────────────────────────────────────────────────────────────────────

  private updateExit(delta: number) {
    const bothIn = this.players.every((p) =>
      Phaser.Geom.Intersects.RectangleToRectangle(p.getBounds(), this.exitZone),
    );
    this.exitTimer = bothIn ? this.exitTimer + delta : 0;
    if (this.exitTimer > 350) this.complete();
  }

  private complete() {
    if (this.finished) return;
    this.finished = true;
    sfx.complete();
    this.players.forEach((p) => p.body_.setVelocity(0, 0));

    const cam = this.cameras.main;
    cam.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      const cx = cam.width / 2;
      const cy = cam.height / 2;
      cam.setBackgroundColor(0x000000);

      const title = this.add
        .text(cx, cy - 40, "LEVEL COMPLETE", {
          fontFamily: "monospace",
          fontSize: "36px",
          color: "#e8ecf5",
        })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(100)
        .setAlpha(0);

      const levelSub = this.add
        .text(cx, cy + 10, "Level 3", {
          fontFamily: "monospace",
          fontSize: "24px",
          color: "#4aa3ff",
        })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(100)
        .setAlpha(0);

      const tagline = this.add
        .text(cx, cy + 50, "ADAPT", {
          fontFamily: "monospace",
          fontSize: "20px",
          color: "#8ea0bf",
        })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(100)
        .setAlpha(0);

      cam.fadeIn(400, 0, 0, 0);
      this.tweens.add({ targets: title, alpha: 1, duration: 600, delay: 200 });
      this.tweens.add({ targets: levelSub, alpha: 1, duration: 600, delay: 800 });
      this.tweens.add({ targets: tagline, alpha: 1, duration: 600, delay: 1400 });

      this.game.events.emit("level-change", "Level3");
      this.time.delayedCall(2800, () => {
        this.scene.start("Level3");
      });
    });
    cam.fadeOut(900, 0, 0, 0);
  }
}
