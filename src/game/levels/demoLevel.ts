import { TILE } from "../utils/constants";

/**
 * Tiled-compatible level description.
 *
 * Everything is expressed in tile units so this object can later be swapped
 * for a real Tiled JSON export (`layers[].data` -> `solids`, object layers ->
 * `objects`) without touching the scene code.
 */
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
    | "checkpoint";
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
  objects: LevelObject[];
}

export const DEMO_LEVEL: LevelDefinition = {
  name: "Demo Level — Tutorial",
  tileWidth: TILE,
  tileHeight: TILE,
  width: 106,
  height: 26,
  solids: [
    // Section 1 — movement
    { x: 0, y: 20, width: 22, height: 6 },
    { x: 7, y: 17, width: 3, height: 1 },
    { x: 12, y: 15, width: 3, height: 1 },
    // Section 3 — red switch ground
    { x: 31, y: 20, width: 14, height: 6 },
    // Section 4 — cooperation ground
    { x: 45, y: 20, width: 17, height: 6 },
    // Section 5 — stacking ground + wall + ledge
    { x: 62, y: 20, width: 12, height: 6 },
    { x: 72, y: 15, width: 2, height: 5 },
    { x: 74, y: 15, width: 8, height: 1 },
    // Section 7 — finish ground
    { x: 94, y: 15, width: 12, height: 6 },
  ],
  objects: [
    { name: "spawn-blue", type: "spawn", x: 2.5, y: 20, properties: { color: "blue" } },
    { name: "spawn-red", type: "spawn", x: 4, y: 20, properties: { color: "red" } },

    // Section 2 — blue switch extends a bridge over the pit
    { name: "btn-blue-bridge", type: "button", x: 18, y: 20, properties: { color: "blue" } },
    {
      name: "bridge-pit",
      type: "bridge",
      x: 22,
      y: 20,
      width: 9,
      height: 0.5,
      properties: { source: "btn-blue-bridge" },
    },

    // Section 3 — red switch opens a red door
    { name: "btn-red-door", type: "button", x: 34, y: 20, properties: { color: "red" } },
    {
      name: "door-red",
      type: "door",
      x: 43,
      y: 20,
      properties: { kind: "red", source: "btn-red-door" },
    },

    // Section 4 — both switches at once open the gate
    { name: "btn-gate-blue", type: "button", x: 47.5, y: 20, properties: { color: "blue" } },
    { name: "btn-gate-red", type: "button", x: 52, y: 20, properties: { color: "red" } },
    { name: "gate", type: "door", x: 60, y: 20, properties: { kind: "gate" } },

    // Section 5 — stacking, then a staircase for the partner left behind
    { name: "btn-ledge-blue", type: "button", x: 75.5, y: 15, properties: { color: "blue" } },
    { name: "btn-ledge-red", type: "button", x: 78, y: 15, properties: { color: "red" } },
    { name: "stairs", type: "bridge", x: 0, y: 0, properties: { preset: "stairs" } },

    // Section 6 — the Level Devil bridge
    { name: "bridge-devil-left", type: "bridge", x: 82, y: 15, width: 4, height: 0.5 },
    { name: "trap-devil", type: "trap", x: 86, y: 15, width: 4, height: 0.5 },
    { name: "bridge-devil-right", type: "bridge", x: 90, y: 15, width: 4, height: 0.5 },
    { name: "rescue-devil", type: "rescue", x: 86, y: 17, width: 4, height: 0.5 },

    // Section 7
    { name: "exit", type: "exit", x: 101, y: 15 },

    { name: "cp-1", type: "checkpoint", x: 32, y: 20 },
    { name: "cp-2", type: "checkpoint", x: 46, y: 20 },
    { name: "cp-3", type: "checkpoint", x: 63, y: 20 },
    { name: "cp-4", type: "checkpoint", x: 75, y: 15 },
    { name: "cp-5", type: "checkpoint", x: 95, y: 15 },
  ],
};

/** Stairs that unfold once someone reaches the high ledge. */
export const STAIRS_PLANKS: TileRect[] = [
  { x: 69, y: 18, width: 2, height: 0.5 },
  { x: 70.5, y: 16, width: 2, height: 0.5 },
];
