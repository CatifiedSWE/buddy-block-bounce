import { TILE } from "../utils/constants";
import type { LevelDefinition } from "./level1";

// Grid dimensions: 98 tiles wide x 18 tiles tall
// Section 1: Intro corridor (x: 0..11)
// Section 2: Maze structures (x: 12..40)
// Section 3: Phase 2 Timed Platforming Pit (x: 41..72)
// Section 4: Post-Platforming Landing & Ending Room (x: 72..98)

export const LEVEL_3: LevelDefinition = {
  name: "Level 3 — The Twist",
  tileWidth: TILE,
  tileHeight: TILE,
  width: 98,
  height: 18,
  solids: [
    // ── Continuous Main Floor for Sections 1 & 2 (x: 0..41, y: 15..17) ──
    { x: 0, y: 15, width: 41, height: 3 },

    // ── Section 3: Pit Floor Beneath Spikes (x: 41..66, y: 17..17) ──
    { x: 41, y: 17, width: 25, height: 1 },

    // ── Section 4: Post-Platforming Landing Floor (x: 66..98, y: 15..17) ──
    { x: 66, y: 15, width: 32, height: 3 },

    // ── Continuous Main Ceiling (y: 0..1) across entire level ──
    { x: 0, y: 0, width: 98, height: 2 },

    // ── Outer Boundaries ──────────────────────────────────────────
    { x: 0, y: 0, width: 2, height: 18 },  // Left outer wall
    { x: 96, y: 0, width: 2, height: 18 }, // Right outer wall

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
  ],

  timedPlatforms: [
    // 4 platforms total (reduced from 5), preserving exact original width (width: 2) and jump distances
    // Jump 1: Medium introduction
    { x: 45, y: 14, width: 2, height: 1 },
    // Jump 2: Elevated High Platform (requires full-height jump hold)
    { x: 50, y: 10.5, width: 2, height: 1 },
    // Jump 3: Lower Platform (requires mid-air deceleration)
    { x: 55.5, y: 14, width: 2, height: 1 },
    // Jump 4: Mid-Height Platform before safe ground at x: 66
    { x: 60, y: 12, width: 2, height: 1 },
  ],

  spikes: [
    // Floor spikes in lower dead end 1
    { x: 17, y: 14, width: 4, height: 1 },
    // Ceiling spikes above upper bridge
    { x: 24, y: 2, width: 4, height: 1 },
    // Floor spikes in dead end 2
    { x: 34, y: 14, width: 4, height: 1 },
    // Section 3: Platforming Pit Spike Gauntlet
    { x: 41, y: 16, width: 25, height: 1 },
  ],

  objects: [
    // Spawns in intro corridor
    { name: "spawn-blue", type: "spawn", x: 4, y: 14, properties: { color: "blue" } },
    { name: "spawn-red",  type: "spawn", x: 6, y: 14, properties: { color: "red" } },

    // Maze exit portal at end of platforming in safe landing room (moved 10 tiles away from x: 71 to x: 81)
    { name: "maze-exit", type: "exit", x: 81, y: 15 },
  ],
};
