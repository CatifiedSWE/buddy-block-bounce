import { TILE } from "../utils/constants";
import type { LevelDefinition } from "./level1";

export const LEVEL_2: LevelDefinition = {
  name: "Level 2 — The Troll",
  tileWidth: TILE,
  tileHeight: TILE,
  width: 121,
  height: 26,
  solids: [
    // Act 1 & Act 2: Seamless solid ground (x: 0..32) with pit floor underneath at x: 18..21 (shifted 3 tiles right)
    { x: 0, y: 20, width: 32, height: 6 },
    { x: 18, y: 25, width: 4, height: 1 }, // Pit bottom under collapsing trap at x: 18..21

    // Act 3: Long 105% Spike Chase Section (x: 32..73, ~150m long chase)
    { x: 32, y: 20, width: 10, height: 6 },
    { x: 42, y: 19, width: 3, height: 7 }, // minor 1-tile step
    { x: 45, y: 20, width: 9, height: 6 },
    { x: 54, y: 19, width: 3, height: 7 }, // minor 1-tile step
    { x: 57, y: 20, width: 8, height: 6 },
    { x: 65, y: 19, width: 3, height: 7 }, // minor 1-tile step
    { x: 68, y: 20, width: 5, height: 6 }, // chase ends at x: 73
    { x: 68, y: 25, width: 4, height: 1 }, // Pit bottom under collapsing trap at x: 68..71 (x: 2187, 4 tiles wide towards right)

    // Act 3 Breathing Space (x: 73..91, ~30m calm section with zero traps)
    { x: 73, y: 20, width: 18, height: 6 },

    // Act 4: Real Exit approach path (x: 91..121)
    { x: 91, y: 20, width: 30, height: 6 },
    { x: 112, y: 25, width: 4, height: 1 }, // Pit bottom under collapsing trap at x: 112..115 (x: 3600, 4 tiles wide towards right)
  ],
  spikes: [
    // Pit 1 spikes under collapsing floor (4 tiles wide at x: 18..21)
    { x: 18, y: 24, width: 4, height: 1 },
    // Pit 2 spikes under collapsing floor at x: 2187 (4 tiles wide at x: 68..71)
    { x: 68, y: 24, width: 4, height: 1 },
    // Pit 3 spikes under collapsing floor at x: 3600 (4 tiles wide at x: 112..115)
    { x: 112, y: 24, width: 4, height: 1 },
  ],
  objects: [
    // Spawns
    { name: "spawn-blue", type: "spawn", x: 10.5, y: 20, properties: { color: "blue" } },
    { name: "spawn-red", type: "spawn", x: 12, y: 20, properties: { color: "red" } },

    // Act 1 Fake Exit
    { name: "fake-exit", type: "exit", x: 3, y: 20 },

    // Act 4 Real Exit
    { name: "real-exit", type: "exit", x: 113, y: 20 },

    // Checkpoints
    { name: "cp-1", type: "checkpoint", x: 23, y: 20 },
    { name: "cp-2", type: "checkpoint", x: 75, y: 20 },
  ],
};
