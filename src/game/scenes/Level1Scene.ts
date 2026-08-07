import * as Phaser from "phaser";
import { COLORS, PHYSICS, TEX, TILE } from "../utils/constants";
import { Player } from "../entities/Player";
import { KeyboardInput } from "../input/KeyboardInput";
import { GamepadInput } from "../input/GamepadInput";
import { CombinedInput } from "../input/CombinedInput";
import { ColorButton } from "../mechanics/Button";
import { Door } from "../mechanics/Door";
import { LEVEL_1, type TileRect } from "../levels/level1";
import { sfx } from "../utils/sfx";

const px = (t: number) => t * TILE;

const toRect = (r: TileRect) => ({
  x: px(r.x),
  y: px(r.y),
  width: px(r.width),
  height: px(r.height),
});

export class Level1Scene extends Phaser.Scene {
  private blue!: Player;
  private red!: Player;
  private players: Player[] = [];
  private solids!: Phaser.Physics.Arcade.StaticGroup;
  private spikesGroup!: Phaser.Physics.Arcade.StaticGroup;

  private buttons: Record<string, ColorButton> = {};
  private doors: Record<string, Door> = {};

  private exitZone!: Phaser.Geom.Rectangle;
  private exitTimer = 0;
  private finished = false;
  private dying = false;

  private checkpoints: number[] = [];
  private checkpointIndex = -1;

  private triggers: Array<{ x: number; fired: boolean; run: () => void }> = [];
  private camZoom = 1;

  // Act 3 Timed Door state
  private doorCountdownMs = 0;
  private countdownText?: Phaser.GameObjects.Text | undefined;
  private doorOpenMs = 5000; // Door remains open for 5 seconds

  constructor() {
    super("Level1");
  }

  create() {
    this.dying = false;
    this.finished = false;
    this.checkpointIndex = -1;
    this.exitTimer = 0;
    this.doorCountdownMs = 0;
    this.countdownText = undefined;
    this.camZoom = 1;
    this.buttons = {};
    this.doors = {};
    this.triggers = [];
    this.checkpoints = [];

    const worldW = px(LEVEL_1.width);
    const worldH = px(LEVEL_1.height);

    this.physics.world.setBounds(0, 0, worldW, worldH + 600);
    this.physics.world.gravity.y = PHYSICS.gravityY;
    this.cameras.main.setBounds(0, -160, worldW, worldH + 160);
    this.cameras.main.setBackgroundColor(COLORS.bg);
    this.cameras.main.roundPixels = true;

    this.buildBackground(worldW, worldH);

    this.solids = this.physics.add.staticGroup();
    LEVEL_1.solids.forEach((r) => this.addSolid(toRect(r)));

    this.spikesGroup = this.physics.add.staticGroup();
    this.buildSpikes();

    this.buildObjects();
    this.buildPlayers();
    this.wireMechanics();
    this.buildHints();

    this.cameras.main.fadeIn(500, 0, 0, 0);
  }

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

  private addSolid(rect: { x: number; y: number; width: number; height: number }) {
    const tile = this.add
      .tileSprite(rect.x, rect.y, rect.width, rect.height, TEX.stone)
      .setOrigin(0, 0);
    this.solids.add(tile);
  }

  private buildSpikes() {
    (LEVEL_1.spikes ?? []).forEach((s) => {
      const r = toRect(s);
      for (let x = r.x; x < r.x + r.width; x += TILE) {
        const spikeSprite = this.add
          .image(x + TILE / 2, r.y + TILE, TEX.spike)
          .setOrigin(0.5, 1)
          .setDepth(6);
        this.spikesGroup.add(spikeSprite);
      }
    });
  }

  private buildObjects() {
    const o = LEVEL_1.objects;

    o.filter((x) => x.type === "button").forEach((def) => {
      const color = (def.properties?.["color"] as "blue" | "red") ?? "blue";
      this.buttons[def.name] = new ColorButton(this, px(def.x), px(def.y), color);
    });

    o.filter((x) => x.type === "door").forEach((def) => {
      const kind = (def.properties?.["kind"] as "gate" | "blue" | "red") ?? "gate";
      this.doors[def.name] = new Door(this, px(def.x), px(def.y), kind, this.solids);
    });

    const exitDef = o.find((x) => x.type === "exit")!;
    this.add
      .image(px(exitDef.x), px(exitDef.y), TEX.exit)
      .setOrigin(0.5, 1)
      .setDepth(2);

    this.exitZone = new Phaser.Geom.Rectangle(
      px(exitDef.x) - 36,
      px(exitDef.y) - 128,
      72,
      128,
    );

    this.checkpoints = o.filter((x) => x.type === "checkpoint").map((c) => px(c.x));
  }

  private buildPlayers() {
    const kb = this.input.keyboard!;
    const key = (code: number) => kb.addKey(code, true, false);
    const K = Phaser.Input.Keyboard.KeyCodes;

    // Blue: WASD keyboard + Controller 1 (gamepad index 0)
    const blueInput = new CombinedInput(
      new KeyboardInput(key(K.A), key(K.D), key(K.W)),
      new GamepadInput(0),
    );

    // Red: Arrow Keys keyboard + Controller 2 (gamepad index 1)
    const redInput = new CombinedInput(
      new KeyboardInput(key(K.LEFT), key(K.RIGHT), key(K.UP)),
      new GamepadInput(1),
    );

    const spawnBlue = LEVEL_1.objects.find((o) => o.name === "spawn-blue")!;
    const spawnRed = LEVEL_1.objects.find((o) => o.name === "spawn-red")!;

    this.blue = new Player(this, px(spawnBlue.x), px(spawnBlue.y) - 20, "blue", blueInput);
    this.red = new Player(this, px(spawnRed.x), px(spawnRed.y) - 20, "red", redInput);
    this.players = [this.blue, this.red];

    this.physics.add.collider(this.players, this.solids);

    // Hazard overlap: spikes kill BOTH players and restart at latest checkpoint
    this.physics.add.overlap(this.players, this.spikesGroup, () => {
      this.triggerSharedDeath();
    });

    const mid = (this.blue.x + this.red.x) / 2;
    this.cameras.main.centerOn(mid, this.blue.y - 40);
  }

  private triggerSharedDeath() {
    if (this.dying || this.finished) return;
    this.dying = true;

    sfx.trap();
    this.cameras.main.shake(320, 0.015);

    // Spark particles at player positions
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

  private wireMechanics() {
    // Act 3 Dual Button Coordination
    const checkCoopDoor = () => {
      const upperBtn = this.buttons["btn-upper-blue"];
      const lowerBtn = this.buttons["btn-lower-red"];

      if (upperBtn?.pressed && lowerBtn?.pressed) {
        const door = this.doors["coop-gate"];
        if (door && !door.isOpen) {
          door.open(500);
          this.cameras.main.shake(220, 0.01);
          this.doorCountdownMs = this.doorOpenMs;
        }
      }
    };

    if (this.buttons["btn-upper-blue"]) {
      this.buttons["btn-upper-blue"].onChange = (p) => p && checkCoopDoor();
    }
    if (this.buttons["btn-lower-red"]) {
      this.buttons["btn-lower-red"].onChange = (p) => p && checkCoopDoor();
    }
  }

  private updateDoorCountdown(delta: number) {
    const door = this.doors["coop-gate"];
    if (!door) return;

    if (!this.countdownText) {
      const dx = door.sprite.x;
      const dy = door.sprite.y - 235;
      this.countdownText = this.add
        .text(dx, dy, "", {
          fontFamily: "monospace",
          fontSize: "13px",
          color: "#e8ecf5",
          align: "center",
          backgroundColor: "#0d0f16ee",
          padding: { x: 10, y: 6 },
        })
        .setOrigin(0.5, 1)
        .setDepth(50);
    }

    const upperBtn = this.buttons["btn-upper-blue"];
    const lowerBtn = this.buttons["btn-lower-red"];

    if (door.isOpen) {
      this.doorCountdownMs -= delta;
      const sec = Math.max(0, this.doorCountdownMs / 1000);

      let color = "#52e080";
      if (sec < 1.5) color = "#ff5a55";
      else if (sec < 3.0) color = "#ffd166";

      this.countdownText
        .setText(`⏱ DOOR OPEN! CLOSING IN ${sec.toFixed(1)}s`)
        .setColor(color)
        .setVisible(true);

      if (this.doorCountdownMs <= 0) {
        door.close(500);
      }
    } else {
      if (upperBtn?.pressed && !lowerBtn?.pressed) {
        this.countdownText
          .setText("⚡ NEED RED SWITCH!")
          .setColor("#ff5a55")
          .setVisible(true);
      } else if (!upperBtn?.pressed && lowerBtn?.pressed) {
        this.countdownText
          .setText("⚡ NEED BLUE SWITCH!")
          .setColor("#4aa3ff")
          .setVisible(true);
      } else {
        this.countdownText
          .setText("🔒 PRESS BOTH SWITCHES TOGETHER")
          .setColor("#8ea0bf")
          .setVisible(true);
      }
    }
  }

  private floatingHint(x: number, y: number, text: string, color = 0xe8ecf5, life = 5200) {
    const label = this.add
      .text(x, y, text, {
        fontFamily: "monospace",
        fontSize: "15px",
        color: "#" + color.toString(16).padStart(6, "0"),
        align: "center",
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

  private buildHints() {
    this.floatingHint(px(5), px(16.5), "ACT 1: Respect the spikes!", COLORS.blue, 8000);

    this.triggers = [
      {
        x: px(30),
        fired: false,
        run: () =>
          this.floatingHint(
            px(38),
            px(16),
            "ACT 2: Synchronize jumps — one mistake resets both!",
            0xffd166,
            8000,
          ),
      },
      {
        x: px(67),
        fired: false,
        run: () =>
          this.floatingHint(
            px(76),
            px(11),
            "ACT 3: Press BOTH buttons at the SAME TIME to open the gate!",
            COLORS.blue,
            10000,
          ),
      },
    ];
  }

  override update(_time: number, delta: number) {
    if (this.finished || this.dying) return;

    this.resolveStacking();
    this.players.forEach((p) => p.tick(delta));
    Object.values(this.buttons).forEach((b) => b.update(this.players));

    this.updateCamera(delta);
    this.updateTriggers();
    this.updateDoorCountdown(delta);
    this.updateRespawn();
    this.updateExit(delta);
  }

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

  private updateRespawn() {
    const floor = px(LEVEL_1.height) + 120;
    const outOfBounds = this.players.some((p) => p.y > floor);
    if (outOfBounds) {
      this.triggerSharedDeath();
    }
  }

  private updateExit(delta: number) {
    const door = this.doors["coop-gate"];
    if (!door || !door.isOpen) {
      this.exitTimer = 0;
      return;
    }

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
        .text(cx, cy - 20, "LEVEL 1 COMPLETE", {
          fontFamily: "monospace",
          fontSize: "34px",
          color: "#e8ecf5",
        })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(100)
        .setAlpha(0);

      const sub = this.add
        .text(cx, cy + 30, "Next: Level 2 — The Troll...", {
          fontFamily: "monospace",
          fontSize: "16px",
          color: "#8ea0bf",
        })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(100)
        .setAlpha(0);

      cam.fadeIn(400, 0, 0, 0);
      this.tweens.add({ targets: title, alpha: 1, duration: 700, delay: 200 });
      this.tweens.add({ targets: sub, alpha: 1, duration: 700, delay: 1200 });

      this.game.events.emit("level-change", "Level2");
      this.time.delayedCall(2500, () => {
        this.scene.start("Level2");
      });
    });
    cam.fadeOut(900, 0, 0, 0);
  }
}
