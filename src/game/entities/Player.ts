import * as Phaser from "phaser";
import { PHYSICS, TEX, type PlayerId } from "../utils/constants";
import { sfx } from "../utils/sfx";
import type { InputSource } from "../input/InputSource";

/**
 * A tightly-tuned platformer avatar: coyote time, jump buffering and
 * acceleration-based ground movement. Players are non-pushable so they can be
 * stacked on top of each other.
 *
 * Input abstraction: Player depends only on InputSource. It has zero knowledge
 * of keyboards, gamepads, or any other physical device. The scene is responsible
 * for constructing the appropriate InputSource (typically a CombinedInput) and
 * passing it here. To change, swap, or invert controls, the scene calls
 * `setInput()` without touching any gameplay logic.
 */
export class Player extends Phaser.Physics.Arcade.Sprite {
  readonly id: PlayerId;
  spawnX: number;
  spawnY: number;

  private _input: InputSource;
  private coyote = 0;
  private buffer = 0;
  private wasOnFloor = true;
  private squash = 1;
  /** Set by the scene when this player is stood on their partner's head. */
  standingOnPartner = false;

  constructor(scene: Phaser.Scene, x: number, y: number, id: PlayerId, input: InputSource) {
    super(scene, x, y, id === "blue" ? TEX.playerBlue : TEX.playerRed);
    this.id = id;
    this._input = input;
    this.spawnX = x;
    this.spawnY = y;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(20, 34);
    body.setOffset(2, 2);
    body.setMaxVelocity(PHYSICS.moveSpeed, 1400);
    body.setDragX(PHYSICS.drag);
    // Players stay pushable so Arcade can separate them - this is what makes
    // standing on each other (and gentle nudging) work.
    body.pushable = true;
    this.setDepth(20);
  }

  get body_(): Phaser.Physics.Arcade.Body {
    return this.body as Phaser.Physics.Arcade.Body;
  }

  get onFloor(): boolean {
    const b = this.body_;
    return b.blocked.down || b.touching.down || this.standingOnPartner;
  }

  respawn() {
    this.setPosition(this.spawnX, this.spawnY);
    this.body_.reset(this.spawnX, this.spawnY);
    this.body_.setVelocity(0, 0);
    this.body_.setAcceleration(0, 0);
    this.coyote = 0;
    this.buffer = 0;
    this.wasOnFloor = true;
    this.standingOnPartner = false;
    this.setAlpha(0);
    this.scene.tweens.add({ targets: this, alpha: 1, duration: 220 });
    sfx.respawn();
  }

  setSpawn(x: number, y: number) {
    this.spawnX = x;
    this.spawnY = y;
  }

  /**
   * Rewire the input source for this player at runtime.
   * Used by Level 3's control-scrambling mechanic; Player remains completely
   * unaware of what device or modifier is behind the new source.
   */
  setInput(source: InputSource) {
    this._input = source;
  }

  tick(deltaMs: number) {
    const body = this.body_;
    const grounded = this.onFloor;

    if (grounded) {
      this.coyote = PHYSICS.coyoteMs;
      if (!this.wasOnFloor) {
        sfx.land();
        this.squash = 0.78;
      }
    } else {
      this.coyote = Math.max(0, this.coyote - deltaMs);
    }
    this.wasOnFloor = grounded;

    // horizontal
    const left = this._input.left();
    const right = this._input.right();
    if (left === right) {
      body.setAccelerationX(0);
    } else if (left) {
      body.setAccelerationX(-PHYSICS.accel);
      this.setFlipX(true);
    } else {
      body.setAccelerationX(PHYSICS.accel);
      this.setFlipX(false);
    }

    // jump buffer
    if (this._input.jumpPressed()) this.buffer = PHYSICS.jumpBufferMs;
    else this.buffer = Math.max(0, this.buffer - deltaMs);

    if (this.buffer > 0 && this.coyote > 0) {
      // A boosted launch when using your partner as a springboard.
      body.setVelocityY(-PHYSICS.jumpVelocity * (this.standingOnPartner ? 1.22 : 1));
      this.buffer = 0;
      this.coyote = 0;
      this.squash = 1.18;
      sfx.jump();
    }

    // variable jump height
    if (!this._input.jump() && body.velocity.y < -180) {
      body.setVelocityY(body.velocity.y + 22);
    }

    // juice: squash & stretch
    this.squash = Phaser.Math.Linear(this.squash, 1, 0.18);
    this.setScale(2 - this.squash, this.squash);
  }
}
