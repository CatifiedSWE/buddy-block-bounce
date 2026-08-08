import * as Phaser from "phaser";
import { COLORS, PHYSICS, TEX, TILE } from "../utils/constants";
import { Player } from "../entities/Player";
import { LEVEL_3 } from "../levels/level3";
import type { TileRect } from "../levels/level1";
import { sfx } from "../utils/sfx";
import type { InputSource } from "../input/InputSource";
import { KeyboardInput } from "../input/KeyboardInput";
import { GamepadInput } from "../input/GamepadInput";
import { CombinedInput } from "../input/CombinedInput";

/**
 * InvertedInput — modifier that swaps left ↔ right on the wrapped source.
 *
 * This is a local Level3 concern only. It accepts any InputSource so it can
 * wrap a KeyboardInput, a GamepadInput, a CombinedInput, or another modifier.
 * Player.ts is never aware that controls have been inverted.
 */
class InvertedInput implements InputSource {
  constructor(private readonly src: InputSource) {}
  left(): boolean  { return this.src.right(); }
  right(): boolean { return this.src.left(); }
  jump(): boolean  { return this.src.jump(); }
  jumpPressed(): boolean { return this.src.jumpPressed(); }
}

/**
 * JumpOnlyInput — modifier that passes jump through but silences left/right.
 *
 * Used by Mode 2 (Split Control): each player moves with their own controls,
 * but only the partner's JUMP signal crosses over. Without this, adding the
 * full partner source via CombinedInput would bleed their movement keys too
 * (e.g. Blue presses left → Red also goes left because CombinedInput ORs all
 * actions). JumpOnlyInput prevents that cross-contamination.
 */
class JumpOnlyInput implements InputSource {
  constructor(private readonly src: InputSource) {}
  left(): boolean  { return false; }
  right(): boolean { return false; }
  jump(): boolean  { return this.src.jump(); }
  jumpPressed(): boolean { return this.src.jumpPressed(); }
}

/**
 * MoveOnlyInput — modifier that passes left/right through but silences jump.
 *
 * Used alongside JumpOnlyInput in Mode 2: the player keeps their own movement
 * controls but their OWN jump is stripped out, replaced exclusively by the
 * partner's jump via JumpOnlyInput. Without this, the player could still jump
 * with their own key in addition to the partner's key.
 */
class MoveOnlyInput implements InputSource {
  constructor(private readonly src: InputSource) {}
  left(): boolean  { return this.src.left(); }
  right(): boolean { return this.src.right(); }
  jump(): boolean  { return false; }
  jumpPressed(): boolean { return false; }
}

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

  // Original per-player input sources — the "canonical" inputs, never mutated.
  // blueInputOriginal = keyboard WASD + Controller 1
  // redInputOriginal  = keyboard Arrows + Controller 2
  private blueInputOriginal!: CombinedInput;
  private redInputOriginal!: CombinedInput;

  // The CombinedInput instances that are actually wired to each Player.
  // triggerNextSwap calls setSources() on these to hot-swap compositions.
  private blueCombined!: CombinedInput;
  private redCombined!: CombinedInput;

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

  // Periodic swap state
  private swapTimer = 0;
  private nextSwapMs = 8000;
  private currentMode = 0;
  private modeBanner?: Phaser.GameObjects.Container | undefined;

  // UI elements
  private controlsContainer!: Phaser.GameObjects.Container;
  private twistText!: Phaser.GameObjects.Text;

  constructor() {
    super("Level3");
  }

  preload() {
    if (!this.cache.audio.exists("ysnp")) {
      this.load.audio("ysnp", "/you-shall-not-pass.mp3");
    }
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
    this.swapTimer = 0;
    this.nextSwapMs = Phaser.Math.Between(8000, 10000);
    this.currentMode = 0;
    this.modeBanner = undefined;

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

    // ── Physical device sources ───────────────────────────────────────────────
    // These are the raw per-player inputs (keyboard + gamepad). They are stored
    // so triggerNextSwap can compose them into swap modes without ever knowing
    // about specific keys or buttons.
    const blueKb  = new KeyboardInput(key(K.A), key(K.D), key(K.W));
    const redKb   = new KeyboardInput(key(K.LEFT), key(K.RIGHT), key(K.UP));
    const bluePad = new GamepadInput(0);
    const redPad  = new GamepadInput(1);

    // ── Canonical player inputs (keyboard + their assigned controller) ────────
    // These represent the concept of "Blue's inputs" and "Red's inputs"
    // regardless of what mode is active. Swap modes compose from these.
    this.blueInputOriginal = new CombinedInput(blueKb, bluePad);
    this.redInputOriginal  = new CombinedInput(redKb,  redPad);

    // ── Live combined inputs — these are what the Players actually read ───────
    // triggerNextSwap calls setSources() on these to swap compositions.
    this.blueCombined = new CombinedInput(blueKb, bluePad);
    this.redCombined  = new CombinedInput(redKb,  redPad);

    const spawnBlue = LEVEL_3.objects.find((o) => o.name === "spawn-blue")!;
    const spawnRed  = LEVEL_3.objects.find((o) => o.name === "spawn-red")!;

    this.blue = new Player(this, px(spawnBlue.x), px(spawnBlue.y) - 20, "blue", this.blueCombined);
    this.red  = new Player(this, px(spawnRed.x),  px(spawnRed.y)  - 20, "red",  this.redCombined);
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

  // ─── Control Swap (3 Modes: Invert, Split/Cross Jump, Role Swap) ───────────────
  //
  // Swap modes are now expressed as InputSource compositions rather than raw
  // key references. Each mode calls setSources() on blueCombined/redCombined
  // to rewire what inputs each player sees. Player.ts is never involved.

  private triggerNextSwap() {
    const modes = [1, 2, 3].filter((m) => m !== this.currentMode);
    const newMode = modes[Math.floor(Math.random() * modes.length)] ?? 1;
    this.currentMode = newMode;

    const blue = this.blueInputOriginal; // Blue's canonical input
    const red  = this.redInputOriginal;  // Red's canonical input

    let bannerText = "";
    let colorHex = "#ffffff";
    let bgHex = 0x000000;

    if (newMode === 1) {
      // Mode 1: INVERSION — left/right reversed for both players.
      // InvertedInput wraps the canonical source, delegating left()→right() and
      // vice versa. Each player's jump input remains unchanged.
      sfx.mode1Invert();
      this.blueCombined.setSources(new InvertedInput(blue));
      this.redCombined.setSources(new InvertedInput(red));
      bannerText = "⚡ MODE 1: INVERTED CONTROLS! (Left ↔ Right)";
      colorHex = "#ff9933";
      bgHex = 0x331a00;
    } else if (newMode === 2) {
      // Mode 2: SPLIT CONTROL
      // Blue moves with their own left/right, but their OWN jump is blocked.
      // Red's jump key exclusively controls Blue's jump, and vice versa.
      // MoveOnlyInput strips own jump; JumpOnlyInput strips partner's movement.
      sfx.mode2Split();
      this.blueCombined.setSources(
        new MoveOnlyInput(blue), // Blue's left/right — own jump blocked
        new JumpOnlyInput(red),  // Red's jump key only — no left/right bleed
      );
      this.redCombined.setSources(
        new MoveOnlyInput(red),  // Red's left/right — own jump blocked
        new JumpOnlyInput(blue), // Blue's jump key only — no left/right bleed
      );
      bannerText = "🔀 MODE 2: SPLIT CONTROL! (Red Jumps Blue / Blue Jumps Red)";
      colorHex = "#cc66ff";
      bgHex = 0x260033;
    } else {
      // Mode 3: FULL ROLE SWAP — Blue gets Red's complete input set, and vice
      // versa. Both keyboard and controller assignments follow the swap.
      sfx.mode3RoleSwap();
      this.blueCombined.setSources(red);  // Blue now uses Red's inputs
      this.redCombined.setSources(blue);  // Red now uses Blue's inputs
      bannerText = "🔀 MODE 3: PLAYER ROLE SWAP! (Blue = Arrows/Pad2, Red = WASD/Pad1)";
      colorHex = "#4aa3ff";
      bgHex = 0x001a33;
    }

    this.cameras.main.shake(140, 0.008);
    this.showModeBanner(bannerText, colorHex, bgHex);
  }

  private showModeBanner(text: string, colorHex: string, bgHex: number) {
    if (this.modeBanner) {
      this.modeBanner.destroy();
      this.modeBanner = undefined;
    }

    const cam = this.cameras.main;
    const W = cam.width;

    const colorNum = Phaser.Display.Color.HexStringToColor(colorHex).color;
    const bg = this.add
      .rectangle(0, 0, 520, 36, bgHex, 0.9)
      .setStrokeStyle(2, colorNum);

    const txt = this.add
      .text(0, 0, text, {
        fontFamily: "monospace",
        fontSize: "13px",
        color: colorHex,
        align: "center",
      })
      .setOrigin(0.5);

    const container = this.add
      .container(W / 2, 40, [bg, txt])
      .setScrollFactor(0)
      .setDepth(150)
      .setAlpha(0)
      .setScale(0.85);

    this.modeBanner = container;

    this.tweens.add({
      targets: container,
      alpha: 1,
      scale: 1,
      duration: 300,
      ease: "Back.easeOut",
    });

    this.time.delayedCall(4500, () => {
      if (this.modeBanner === container) {
        this.tweens.add({
          targets: container,
          alpha: 0,
          scale: 0.85,
          duration: 350,
          onComplete: () => {
            container.destroy();
            if (this.modeBanner === container) this.modeBanner = undefined;
          },
        });
      }
    });
  }

  // ─── Death & Restart ──────────────────────────────────────────────────────────

  private triggerDeath() {
    if (this.dying || this.finished) return;
    this.dying = true;

    GamepadInput.vibrateAll(400, 0.8, 0.8);
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

    // 1. Play Audio (Phaser Sound + HTML5 Audio fallback for instant playback)
    try {
      if (this.sound.get("ysnp")) {
        this.sound.play("ysnp", { volume: 1.0 });
      } else {
        const audio = new Audio("/you-shall-not-pass.mp3");
        void audio.play();
      }
    } catch {
      const audio = new Audio("/you-shall-not-pass.mp3");
      void audio.play();
    }

    sfx.trap();
    cam.shake(500, 0.015);
    GamepadInput.vibrateAll(500, 0.6, 0.6);

    // Dark vignette background overlay
    const overlay = this.add
      .rectangle(W / 2, H / 2, W, H, 0x000000, 0)
      .setScrollFactor(0)
      .setDepth(199);

    this.tweens.add({
      targets: overlay,
      alpha: 0.85,
      duration: 800,
      ease: "Sine.easeIn",
    });

    // Red aura glow behind character
    const redGlow = this.add
      .circle(W / 2, H / 2 - 40, 160, 0xff0000, 0)
      .setScrollFactor(0)
      .setDepth(199);

    this.tweens.add({
      targets: redGlow,
      alpha: 0.35,
      scale: 1.3,
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });

    // Fiery particle embers floating upwards
    const embers = this.add
      .particles(W / 2, H / 2 + 100, TEX.spark, {
        x: { min: -180, max: 180 },
        speedY: { min: -140, max: -40 },
        speedX: { min: -30, max: 30 },
        scale: { start: 2.0, end: 0 },
        alpha: { start: 1, end: 0 },
        lifespan: { min: 800, max: 1800 },
        frequency: 60,
      })
      .setScrollFactor(0)
      .setDepth(200);

    // 0s - 4s: Character entrance & Dynamic text reveal
    const evilContainer = this.add
      .container(W / 2, H / 2 - 40)
      .setScrollFactor(0)
      .setDepth(201)
      .setAlpha(0)
      .setScale(0.5);

    const evilG = this.add.graphics();
    this.drawEvilCharacter(evilG, 0, 0);
    evilContainer.add(evilG);

    // Character entrance animation (0s - 1.5s)
    this.tweens.add({
      targets: evilContainer,
      alpha: 1,
      scaleX: 1.15,
      scaleY: 1.15,
      duration: 1200,
      ease: "Back.easeOut",
    });

    // Text Reveal (1.0s - 3.5s): Letter-by-letter typing with red glow
    const fullText = "YOU SHALL NOT PASS";
    const evilText = this.add
      .text(W / 2, H / 2 + 65, "", {
        fontFamily: "monospace",
        fontSize: "36px",
        color: "#ff2222",
        align: "center",
        stroke: "#550000",
        strokeThickness: 4,
        shadow: {
          offsetX: 0,
          offsetY: 0,
          color: "#ff0000",
          blur: 24,
          fill: true,
        },
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(205)
      .setAlpha(0);

    let charIdx = 0;
    this.time.delayedCall(1000, () => {
      evilText.setAlpha(1);
      this.time.addEvent({
        delay: 95,
        repeat: fullText.length - 1,
        callback: () => {
          charIdx++;
          evilText.setText(fullText.substring(0, charIdx));
          sfx.land();
          cam.shake(80, 0.005);
          GamepadInput.vibrateAll(80, 0.25, 0.25);
        },
      });
    });

    // 4s - 7s: EVERYTHING BREAKS, BLACK & WHITE MONOCHROME SHATTER, EARTHQUAKE SHAKE
    this.time.delayedCall(4000, () => {
      // Violent earthquake shake
      cam.shake(2800, 0.04);
      GamepadInput.vibrateAll(2800, 0.9, 0.9);
      sfx.trap();

      // Shockwave ring expanding from character
      const shockwave = this.add
        .circle(W / 2, H / 2 - 40, 20, 0xffffff, 0.9)
        .setScrollFactor(0)
        .setDepth(210);

      this.tweens.add({
        targets: shockwave,
        radius: 600,
        alpha: 0,
        duration: 800,
        ease: "Quad.easeOut",
        onComplete: () => shockwave.destroy(),
      });

      // World breaking: Debris blocks flying apart
      for (let i = 0; i < 35; i++) {
        const debrisX = Phaser.Math.Between(40, W - 40);
        const debrisY = Phaser.Math.Between(40, H - 40);
        const chunk = this.add
          .rectangle(
            debrisX,
            debrisY,
            Phaser.Math.Between(14, 34),
            Phaser.Math.Between(14, 34),
            0x444444,
          )
          .setScrollFactor(0)
          .setDepth(208);

        const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
        const speed = Phaser.Math.Between(220, 650);
        const vx = Math.cos(angle) * speed;
        const vy = Math.sin(angle) * speed - 150;

        this.tweens.add({
          targets: chunk,
          x: debrisX + vx,
          y: debrisY + vy,
          rotation: Phaser.Math.FloatBetween(-4, 4),
          alpha: 0,
          duration: 2200,
          ease: "Power2.easeOut",
          onComplete: () => chunk.destroy(),
        });
      }

      // Black & White (Monochrome Desaturation Overlay + Flash Glitch)
      const monochromeGlitch = this.add
        .rectangle(W / 2, H / 2, W, H, 0xffffff, 0)
        .setScrollFactor(0)
        .setDepth(220)
        .setBlendMode(Phaser.BlendModes.DIFFERENCE);

      this.tweens.add({
        targets: monochromeGlitch,
        alpha: { from: 0.9, to: 0.15 },
        duration: 75,
        yoyo: true,
        repeat: 20,
      });

      // Monochrome background tint cover
      this.add
        .rectangle(W / 2, H / 2, W, H, 0x111111, 0.78)
        .setScrollFactor(0)
        .setDepth(198);

      // Text trembling aggressively
      this.tweens.add({
        targets: evilText,
        scaleX: 1.35,
        scaleY: 1.35,
        duration: 90,
        yoyo: true,
        repeat: -1,
      });
    });

    // 6.9s: SUDDEN CUT TO BLACK -> Credits
    this.time.delayedCall(6900, () => {
      this.finished = true;
      embers.destroy();

      // Sharp sudden cut to pitch black mask
      this.add
        .rectangle(W / 2, H / 2, W + 200, H + 200, 0x000000, 1)
        .setScrollFactor(0)
        .setDepth(99999);

      this.time.delayedCall(300, () => {
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

    // Trigger initial control swap when stepping into the maze (past x = 10 tiles)
    if (!this.swapTriggered) {
      const inMaze = this.players.some((p) => p.x > px(10));
      if (inMaze) {
        this.swapTriggered = true;
        this.triggerNextSwap();
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

    // Periodic control swap every 8-10 seconds while inside the maze
    if (this.swapTriggered && !this.postMazeTriggered) {
      this.swapTimer += delta;
      if (this.swapTimer >= this.nextSwapMs) {
        this.swapTimer = 0;
        this.nextSwapMs = Phaser.Math.Between(8000, 10000);
        this.triggerNextSwap();
      }
    }

    this.resolveStacking();
    this.players.forEach((p) => p.tick(delta));
    this.updateCamera(delta);
    this.updateRespawn();
    this.updateTriggers();
  }
}
