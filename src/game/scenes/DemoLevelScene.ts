import * as Phaser from "phaser";
import { COLORS, PHYSICS, TEX, TILE } from "../utils/constants";
import { Player, type PlayerKeys } from "../entities/Player";
import { ColorButton } from "../mechanics/Button";
import { Door } from "../mechanics/Door";
import { Bridge, type PlankRect } from "../mechanics/Bridge";
import { FallingTrap } from "../mechanics/FallingTrap";
import { DEMO_LEVEL, STAIRS_PLANKS, type TileRect } from "../levels/demoLevel";
import { sfx } from "../utils/sfx";

const px = (t: number) => t * TILE;

const toRect = (r: TileRect) => ({
  x: px(r.x),
  y: px(r.y),
  width: px(r.width),
  height: px(r.height),
});

export class DemoLevelScene extends Phaser.Scene {
  private blue!: Player;
  private red!: Player;
  private players: Player[] = [];
  private solids!: Phaser.Physics.Arcade.StaticGroup;

  private buttons: Record<string, ColorButton> = {};
  private doors: Record<string, Door> = {};
  private bridges: Record<string, Bridge> = {};
  private trap!: FallingTrap;

  private exitZone!: Phaser.Geom.Rectangle;
  private exitTimer = 0;
  private finished = false;

  private checkpoints: number[] = [];
  private checkpointIndex = -1;

  private triggers: Array<{ x: number; fired: boolean; run: () => void }> = [];
  private struggleMs = 0;
  private struggleHintShown = false;

  private camZoom = 1;

  constructor() {
    super("DemoLevel");
  }

  create() {
    this.finished = false;
    this.exitTimer = 0;
    this.checkpointIndex = -1;
    this.struggleMs = 0;
    this.struggleHintShown = false;
    this.camZoom = 1;
    this.buttons = {};
    this.doors = {};
    this.bridges = {};
    this.triggers = [];
    this.checkpoints = [];

    const worldW = px(DEMO_LEVEL.width);
    const worldH = px(DEMO_LEVEL.height);

    this.physics.world.setBounds(0, 0, worldW, worldH + 600);
    this.physics.world.gravity.y = PHYSICS.gravityY;
    this.cameras.main.setBounds(0, -160, worldW, worldH + 160);
    this.cameras.main.setBackgroundColor(COLORS.bg);
    this.cameras.main.roundPixels = true;

    this.buildBackground(worldW, worldH);

    this.solids = this.physics.add.staticGroup();
    DEMO_LEVEL.solids.forEach((r) => this.addSolid(toRect(r)));

    this.buildObjects();
    this.buildPlayers();
    this.wireMechanics();
    this.buildHints();

    this.cameras.main.fadeIn(500, 0, 0, 0);
  }

  // ---------------------------------------------------------------- visuals
  private buildBackground(worldW: number, worldH: number) {
    const bg = this.add.graphics().setDepth(-30).setScrollFactor(0);
    bg.fillGradientStyle(0x141a2b, 0x141a2b, COLORS.bg, COLORS.bg, 1);
    bg.fillRect(0, 0, 2000, 1200);

    // parallax cave silhouettes
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

    // floating dust
    this.add.particles(0, 0, "tex-dust", {
      x: { min: 0, max: worldW },
      y: { min: 0, max: worldH },
      lifespan: 6000,
      speedY: { min: -12, max: -3 },
      speedX: { min: -8, max: 8 },
      scale: { min: 0.6, max: 1.6 },
      alpha: { start: 0.22, end: 0 },
      quantity: 1,
      frequency: 160,
    });
  }

  private addSolid(r: { x: number; y: number; width: number; height: number }) {
    const ts = this.add
      .tileSprite(r.x, r.y, r.width, r.height, TEX.stone)
      .setOrigin(0, 0)
      .setDepth(2);
    this.solids.add(ts);
    (ts.body as Phaser.Physics.Arcade.StaticBody).updateFromGameObject();
    return ts;
  }

  private hiddenPlank(r: { x: number; y: number; width: number; height: number }) {
    const ts = this.add
      .tileSprite(r.x, r.y, r.width, r.height, TEX.bridge)
      .setOrigin(0, 0)
      .setDepth(6);
    this.solids.add(ts);
    (ts.body as Phaser.Physics.Arcade.StaticBody).updateFromGameObject();
    return ts;
  }

  // --------------------------------------------------------------- entities
  private buildObjects() {
    const o = DEMO_LEVEL.objects;

    o.filter((x) => x.type === "button").forEach((def) => {
      this.buttons[def.name] = new ColorButton(
        this,
        px(def.x),
        px(def.y),
        def.properties?.["color"] === "red" ? "red" : "blue",
      );
    });

    o.filter((x) => x.type === "door").forEach((def) => {
      const kind = (def.properties?.["kind"] ?? "red") as "red" | "blue" | "gate";
      this.doors[def.name] = new Door(this, px(def.x), px(def.y), kind, this.solids);
    });

    // Section 2 bridge
    const bridgeDef = o.find((x) => x.name === "bridge-pit")!;
    const planks: PlankRect[] = [];
    for (let i = 0; i < (bridgeDef.width ?? 0); i++) {
      planks.push({ x: px(bridgeDef.x + i), y: px(bridgeDef.y), width: TILE, height: 16 });
    }
    this.bridges["bridge-pit"] = new Bridge(this, this.solids, planks);

    // Section 5 rescue stairs
    this.bridges["stairs"] = new Bridge(this, this.solids, STAIRS_PLANKS.map(toRect));

    // Section 6 — devil bridge (left + right are permanent, middle collapses)
    ["bridge-devil-left", "bridge-devil-right"].forEach((name) => {
      const d = o.find((x) => x.name === name)!;
      for (let i = 0; i < (d.width ?? 0); i++) {
        this.hiddenPlank({ x: px(d.x + i), y: px(d.y), width: TILE, height: 16 }).setVisible(true);
      }
    });

    const trapDef = o.find((x) => x.name === "trap-devil")!;
    const collapsing: Phaser.GameObjects.TileSprite[] = [];
    for (let i = 0; i < (trapDef.width ?? 0); i++) {
      collapsing.push(this.hiddenPlank({ x: px(trapDef.x + i), y: px(trapDef.y), width: TILE, height: 16 }));
    }
    const rescueDef = o.find((x) => x.name === "rescue-devil")!;
    const rescue = this.hiddenPlank({
      x: px(rescueDef.x),
      y: px(rescueDef.y),
      width: px(rescueDef.width ?? 4),
      height: 16,
    });
    this.trap = new FallingTrap(this, collapsing, rescue, () => {
      this.floatingHint(px(88), px(12.5), "Expect the unexpected.", 0xffd166, 3200);
    });

    // exit portal
    const exitDef = o.find((x) => x.type === "exit")!;
    const exitImg = this.add
      .image(px(exitDef.x), px(exitDef.y), TEX.exit)
      .setOrigin(0.5, 1)
      .setDepth(1);
    this.exitZone = new Phaser.Geom.Rectangle(
      exitImg.x - 34,
      exitImg.y - 120,
      68,
      120,
    );
    this.add
      .text(exitImg.x, exitImg.y - 140, "EXIT", {
        fontFamily: "monospace",
        fontSize: "14px",
        color: "#cfe0ff",
      })
      .setOrigin(0.5)
      .setDepth(12);

    this.checkpoints = o.filter((x) => x.type === "checkpoint").map((c) => px(c.x));
  }

  private buildPlayers() {
    const kb = this.input.keyboard!;
    const key = (code: number) => kb.addKey(code, true, false);
    const K = Phaser.Input.Keyboard.KeyCodes;

    const blueKeys: PlayerKeys = { left: key(K.A), right: key(K.D), jump: key(K.W) };
    const redKeys: PlayerKeys = { left: key(K.LEFT), right: key(K.RIGHT), jump: key(K.UP) };

    const spawnBlue = DEMO_LEVEL.objects.find((o) => o.name === "spawn-blue")!;
    const spawnRed = DEMO_LEVEL.objects.find((o) => o.name === "spawn-red")!;

    this.blue = new Player(this, px(spawnBlue.x), px(spawnBlue.y) - 20, "blue", blueKeys);
    this.red = new Player(this, px(spawnRed.x), px(spawnRed.y) - 20, "red", redKeys);
    this.players = [this.blue, this.red];

    this.physics.add.collider(this.players, this.solids);

    const mid = (this.blue.x + this.red.x) / 2;
    this.cameras.main.centerOn(mid, this.blue.y - 40);
  }

  private wireMechanics() {
    // Section 2 — blue-only bridge
    this.buttons["btn-blue-bridge"]!.onChange = (pressed) => {
      if (pressed) {
        this.bridges["bridge-pit"]!.extend();
        this.cameras.main.shake(140, 0.006);
      }
    };

    // Section 3 — red-only door
    this.buttons["btn-red-door"]!.onChange = (pressed) => {
      if (pressed) {
        this.doors["door-red"]!.open(650);
        this.cameras.main.shake(140, 0.006);
      }
    };

    // Section 4 — both, simultaneously
    const checkGate = () => {
      const b = this.buttons["btn-gate-blue"]!;
      const r = this.buttons["btn-gate-red"]!;
      this.cameras.main.shake(120, 0.005);
      if (b.pressed && r.pressed) this.doors["gate"]!.open(1800);
    };
    this.buttons["btn-gate-blue"]!.onChange = (p) => p && checkGate();
    this.buttons["btn-gate-red"]!.onChange = (p) => p && checkGate();

    // Section 5 — whoever gets up top drops a staircase for their partner
    const dropStairs = (pressed: boolean) => {
      if (!pressed) return;
      this.bridges["stairs"]!.extend(140);
      this.cameras.main.shake(160, 0.007);
    };
    this.buttons["btn-ledge-blue"]!.onChange = dropStairs;
    this.buttons["btn-ledge-red"]!.onChange = dropStairs;
  }

  // ------------------------------------------------------------------ hints
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
    this.floatingHint(px(2.5), px(16.5), "Blue:  A  D  ·  W to jump", COLORS.blue, 9000);
    this.floatingHint(px(6.5), px(14.5), "Red:  ←  →  ·  ↑ to jump", COLORS.red, 9000);

    this.triggers = [
      {
        x: px(14),
        fired: false,
        run: () =>
          this.floatingHint(px(18), px(17.5), "Only Blue can activate Blue switches.", COLORS.blue),
      },
      {
        x: px(32),
        fired: false,
        run: () =>
          this.floatingHint(px(34), px(17.5), "Only Red can activate Red switches.", COLORS.red),
      },
    ];
  }

  // ----------------------------------------------------------------- update
  override update(_time: number, delta: number) {
    if (this.finished) return;

    this.resolveStacking();
    this.players.forEach((p) => p.tick(delta));
    Object.values(this.buttons).forEach((b) => b.update(this.players));

    this.updateCamera(delta);
    this.updateTriggers();
    this.updateStruggleHint(delta);
    this.updateTrap();
    this.updateRespawn();
    this.updateExit(delta);
  }

  /**
   * Manual stack resolution: Arcade can't reliably keep one dynamic body on
   * top of another, so we snap the upper player onto their partner's head and
   * let them ride along.
   */
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

    // checkpoints advance when BOTH players are past them
    const trail = Math.min(this.blue.x, this.red.x);
    this.checkpoints.forEach((cx, i) => {
      if (i > this.checkpointIndex && trail > cx) {
        this.checkpointIndex = i;
        const y = i >= 3 ? px(15) - 20 : px(20) - 20;
        this.blue.setSpawn(cx + 24, y);
        this.red.setSpawn(cx + 72, y);
      }
    });
  }

  private updateStruggleHint(delta: number) {
    if (this.struggleHintShown) return;
    const nearWall = this.players.every((p) => p.x > px(66) && p.x < px(73) && p.y > px(17));
    if (nearWall) this.struggleMs += delta;
    else this.struggleMs = Math.max(0, this.struggleMs - delta * 0.5);

    if (this.struggleMs > 6000) {
      this.struggleHintShown = true;
      this.floatingHint(px(69), px(17), "Try standing on each other.", 0xffd166, 7000);
    }
  }

  private updateTrap() {
    if (this.trap.triggered) return;
    const onBridge = this.players.every(
      (p) => p.x > px(83.5) && p.x < px(90.5) && p.y < px(16.5) && p.y > px(12),
    );
    if (onBridge) this.trap.trigger();
  }

  private updateRespawn() {
    const floor = px(DEMO_LEVEL.height) + 120;
    this.players.forEach((p) => {
      if (p.y > floor) p.respawn();
    });
  }

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
        .text(cx, cy - 20, "DEMO LEVEL COMPLETE", {
          fontFamily: "monospace",
          fontSize: "34px",
          color: "#e8ecf5",
        })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(100)
        .setAlpha(0);

      const sub = this.add
        .text(cx, cy + 30, "Next: Level 1 — Cooperation...", {
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

      this.game.events.emit("level-change", "Level1");
      this.time.delayedCall(2400, () => {
        this.scene.start("Level1");
      });
    });
    cam.fadeOut(900, 0, 0, 0);
  }
}
