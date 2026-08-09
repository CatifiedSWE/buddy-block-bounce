import { TILE } from "../utils/constants";

export interface TileRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface LevelObject {
  name: string;
  type:
    | "spawn"
    | "button"
    | "door"
    | "bridge"
    | "trap"
    | "rescue"
    | "exit"
    | "hint"
    | "checkpoint"
    | "spike";
  x: number;
  y: number;
  width?: number;
  height?: number;
  properties?: Record<string, string | number | boolean>;
}

export interface LevelDefinition {
  name: string;
  tileWidth: number;
  tileHeight: number;
  width: number;
  height: number;
  /** Static collision geometry, in tile units. */
  solids: TileRect[];
  spikes?: TileRect[];
  timedPlatforms?: TileRect[];
  objects: LevelObject[];
}

export const LEVEL_1: LevelDefinition = {
  name: "Level 1 — Cooperation",
  tileWidth: TILE,
  tileHeight: TILE,
  width: 138,
  height: 26,
  solids: [
    // --- ACT 1: FLAT PLAIN FOR FIRST x = 800px (tiles 0..26) ---
    // Continuous flat and plain starting runway with zero obstacles
    { x: 0, y: 20, width: 26, height: 6 },

    // --- SUPER SIMPLE 4-STEP PARKOUR (ALL SAME LEVEL, EASY GAPS) ---
    { x: 28, y: 20, width: 3, height: 6 }, // Step 1
    { x: 33, y: 20, width: 3, height: 6 }, // Step 2
    { x: 38, y: 20, width: 3, height: 6 }, // Step 3
    { x: 43, y: 20, width: 3, height: 6 }, // Step 4

    // Platform with Blue bridge button
    { x: 48, y: 20, width: 6, height: 6 },
    // Landing ground after bridge
    { x: 62, y: 20, width: 6, height: 6 },

    // --- ACT 2: TEST PIT FLOOR ---
    // Solid pit floor beneath spikes
    { x: 68, y: 24, width: 31, height: 2 },

    // --- ACT 3: COORDINATION (ORIGINAL COMPACT DESIGN) ---
    // Lower ground running to exit
    { x: 99, y: 20, width: 36, height: 6 },
    // Stair steps leading to upper platform
    { x: 107, y: 18, width: 2, height: 2 },
    { x: 109, y: 16, width: 2, height: 4 },
    // Upper platform
    { x: 111, y: 14, width: 9, height: 1 },
  ],
  timedPlatforms: [
    // Act 2 Disappearing Platforms: Uniform block size (width: 2, height: 1) with staggered (x, y) positions
    // Jump 1: Medium introduction
    { x: 72, y: 19, width: 2, height: 1 },
    // Jump 2: Elevated High Platform (requires full-height jump hold)
    { x: 77, y: 15.5, width: 2, height: 1 },
    // Jump 3: Lower Platform (requires mid-air deceleration)
    { x: 82.5, y: 19, width: 2, height: 1 },
    // Jump 4: Mid-Height Platform
    { x: 87, y: 17, width: 2, height: 1 },
    // Jump 5: High Perch before safe ground
    { x: 93, y: 16.5, width: 2, height: 1 },
  ],
  spikes: [
    // Act 2 Spike Gauntlet
    { x: 68, y: 23, width: 31, height: 1 },
  ],
  objects: [
    // Spawns
    { name: "spawn-blue", type: "spawn", x: 3, y: 20, properties: { color: "blue" } },
    { name: "spawn-red", type: "spawn", x: 6, y: 20, properties: { color: "red" } },

    // Act 1: Blue Button and Bridge
    { name: "btn-blue-bridge", type: "button", x: 51, y: 20, properties: { color: "blue" } },
    {
      name: "bridge-pit",
      type: "bridge",
      x: 54,
      y: 20,
      width: 8,
      height: 0.5,
      properties: { source: "btn-blue-bridge" },
    },

    // Act 3: Simultaneous Buttons & Timed Exit Gate
    { name: "btn-lower-red", type: "button", x: 104, y: 20, properties: { color: "red" } },
    { name: "btn-upper-blue", type: "button", x: 115, y: 14, properties: { color: "blue" } },
    { name: "coop-gate", type: "door", x: 124, y: 20, properties: { kind: "gate" } },
    { name: "exit", type: "exit", x: 129, y: 20 },

    // Checkpoints
    { name: "cp-1", type: "checkpoint", x: 65, y: 20 },
    { name: "cp-2", type: "checkpoint", x: 101, y: 20 },
  ],
};
