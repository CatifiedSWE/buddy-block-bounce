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
  objects: LevelObject[];
}

export const LEVEL_1: LevelDefinition = {
  name: "Level 1 — Cooperation",
  tileWidth: TILE,
  tileHeight: TILE,
  width: 104,
  height: 26,
  solids: [
    // --- ACT 1: FEAR ---
    { x: 0, y: 20, width: 12, height: 6 },
    { x: 16, y: 20, width: 6, height: 6 },
    { x: 23, y: 17, width: 3, height: 1 },
    { x: 27, y: 20, width: 8, height: 6 },
    // Solid pit floors under spikes
    { x: 12, y: 22, width: 4, height: 4 },
    { x: 22, y: 22, width: 5, height: 4 },

    // --- ACT 2: RESPONSIBILITY ---
    { x: 39, y: 19, width: 4, height: 7 },
    { x: 45, y: 16, width: 3, height: 1 },
    { x: 50, y: 19, width: 4, height: 7 },
    { x: 55, y: 20, width: 11, height: 6 },
    // Solid pit floor under Act 2 spikes
    { x: 35, y: 23, width: 20, height: 3 },

    // --- ACT 3: COORDINATION ---
    { x: 66, y: 20, width: 32, height: 6 },
    // Stair steps leading to upper platform
    { x: 72, y: 18, width: 2, height: 2 },
    { x: 74, y: 16, width: 2, height: 4 },
    // Upper platform
    { x: 76, y: 14, width: 9, height: 1 },
  ],
  spikes: [
    // Act 1 Spikes
    { x: 12, y: 21, width: 4, height: 1 },
    { x: 22, y: 21, width: 5, height: 1 },
    // Act 2 Spikes
    { x: 35, y: 22, width: 4, height: 1 },
    { x: 43, y: 22, width: 7, height: 1 },
  ],
  objects: [
    // Spawns
    { name: "spawn-blue", type: "spawn", x: 2.5, y: 20, properties: { color: "blue" } },
    { name: "spawn-red", type: "spawn", x: 4, y: 20, properties: { color: "red" } },

    // Act 3 Buttons (Upper & Lower)
    { name: "btn-upper-blue", type: "button", x: 80, y: 14, properties: { color: "blue" } },
    { name: "btn-lower-red", type: "button", x: 70, y: 20, properties: { color: "red" } },

    // Act 3 Timed Exit Gate
    { name: "coop-gate", type: "door", x: 89, y: 20, properties: { kind: "gate" } },
    { name: "exit", type: "exit", x: 94, y: 20 },

    // Checkpoints
    { name: "cp-1", type: "checkpoint", x: 28, y: 20 },
    { name: "cp-2", type: "checkpoint", x: 57, y: 20 },
    { name: "cp-3", type: "checkpoint", x: 67, y: 20 },
  ],
};
