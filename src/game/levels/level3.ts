import { TILE } from "../utils/constants";
import type { LevelDefinition } from "./level1";

// Grid dimensions: 72 tiles wide x 18 tiles tall
// Section 1: Intro corridor (x: 0..11)
// Section 2: Simple maze (x: 12..48)
// Section 3: Post-maze empty room (x: 49..71)

export const LEVEL_3: LevelDefinition = {
  name: "Level 3 — The Twist",
  tileWidth: TILE,
  tileHeight: TILE,
  width: 72,
  height: 18,
  solids: [
    // ── Continuous Main Floor (y: 15..17) ─────────────────────────
    { x: 0, y: 15, width: 72, height: 3 },

    // ── Continuous Main Ceiling (y: 0..1) ─────────────────────────
    { x: 0, y: 0, width: 72, height: 2 },

    // ── Outer Boundaries ──────────────────────────────────────────
    { x: 0, y: 0, width: 2, height: 18 },  // Left outer wall
    { x: 70, y: 0, width: 2, height: 18 }, // Right outer wall

    // ── Section 1: Intro Corridor ──────────────────────────────────
    { x: 2, y: 2, width: 9, height: 2 },   // Intro upper ceiling shelf

    // ── Section 2: Maze Structures ─────────────────────────────────
    { x: 11, y: 2, width: 1, height: 9 },  // Maze entrance divider (gap at y: 11..14)

    // Lower path dead-end divider 1
    { x: 14, y: 11, width: 6, height: 1 }, // Step platform 1
    { x: 22, y: 8, width: 1, height: 7 },  // Wall 1 blocking bottom path
    { x: 22, y: 6, width: 8, height: 1 },  // Upper bridge platform

    // Middle chamber dividers
    { x: 32, y: 11, width: 4, height: 1 }, // Step platform 2
    { x: 38, y: 2, width: 1, height: 9 },  // Wall 2 blocking top path (gap at y: 11..14)

    // Maze exit chamber
    { x: 42, y: 11, width: 5, height: 1 }, // Step platform 3
    { x: 48, y: 2, width: 1, height: 9 },  // Wall 3 framing maze exit (gap at y: 11..14)

    // ── Section 3: Post-Maze Room ──────────────────────────────────
    // Completely empty room from x: 49 to x: 70.
    // Floor is solid (y: 15..17), Ceiling is solid (y: 0..1).
    // No obstacles or doors inside this room.
  ],

  spikes: [
    // Floor spikes in lower dead end 1
    { x: 17, y: 14, width: 4, height: 1 },
    // Ceiling spikes above upper bridge
    { x: 24, y: 2, width: 4, height: 1 },
    // Floor spikes in dead end 2
    { x: 34, y: 14, width: 4, height: 1 },
  ],

  objects: [
    // Spawns in intro corridor
    { name: "spawn-blue", type: "spawn", x: 4, y: 14, properties: { color: "blue" } },
    { name: "spawn-red",  type: "spawn", x: 6, y: 14, properties: { color: "red" } },

    // Maze exit portal at end of maze
    { name: "maze-exit", type: "exit", x: 47, y: 14 },
  ],
};
