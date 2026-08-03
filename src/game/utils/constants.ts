export const TILE = 32;

export const PHYSICS = {
  gravityY: 1400,
  moveSpeed: 210,
  accel: 2400,
  drag: 2000,
  jumpVelocity: 640,
  coyoteMs: 110,
  jumpBufferMs: 130,
} as const;

export const COLORS = {
  blue: 0x4aa3ff,
  blueDark: 0x1c5fb0,
  red: 0xff5a55,
  redDark: 0xa8261f,
  stone: 0x555f6e,
  stoneDark: 0x39414d,
  stoneLight: 0x6d7889,
  bg: 0x0d0f16,
  bgFar: 0x161a27,
  text: 0xe8ecf5,
} as const;

export const TEX = {
  stone: "tex-stone",
  bridge: "tex-bridge",
  playerBlue: "tex-player-blue",
  playerRed: "tex-player-red",
  spark: "tex-spark",
  buttonBlue: "tex-button-blue",
  buttonRed: "tex-button-red",
  doorBlue: "tex-door-blue",
  doorRed: "tex-door-red",
  doorGate: "tex-door-gate",
  exit: "tex-exit",
} as const;

export type PlayerId = "blue" | "red";
