# Buddy Bound

Create a web-based 2-player cooperative puzzle platformer prototype inspired by Pico Park, Fireboy & Watergirl, and Level Devil.

Goal:

This is NOT a complete game. It is a polished MVP whose only purpose is to teach the player the controls and the core mechanics through Level 1.

Tech Stack

- React

- TypeScript

- Vite

- Phaser 3

- Arcade Physics

- Tiled-compatible tilemap architecture (even if the first level is hardcoded)

- Pixel-art rendering

- Responsive canvas

- Clean component architecture

Art Style

- Retro pixel art

- Simple colored rectangles/placeholders are acceptable

- Blue player

- Red player

- Blue buttons

- Red buttons

- Gray platforms

- Dark cave background

- Small camera shake when buttons activate

- Tiny particle effect when doors open

Controls

Player 1 (Blue)

A = Move Left

D = Move Right

W = Jump

Player 2 (Red)

← = Move Left

→ = Move Right

↑ = Jump

Display these controls on screen before gameplay starts.

-----------------------------------

LEVEL 1 OBJECTIVE

Teach mechanics naturally without dialogue-heavy tutorials.

The level should last around 45-60 seconds.

Mechanics introduced one at a time.

-----------------------------------

SECTION 1

Movement

Both players spawn together.

Show floating text:

"Blue: WASD"

"Red: Arrow Keys"

Players simply walk and jump over a few platforms.

-----------------------------------

SECTION 2

Color Buttons

Introduce two pressure buttons.

Blue Button

Only Blue player can activate it.

If Red stands on it:

- nothing happens

- button stays inactive

Blue presses it:

- button lights up

- bridge extends

- satisfying sound

Show small floating hint once:

"Only Blue can activate Blue switches."

-----------------------------------

SECTION 3

Immediately after,

Red encounters a Red button.

Blue cannot activate it.

Red activates it.

Door opens.

Hint:

"Only Red can activate Red switches."

-----------------------------------

SECTION 4

Cooperation

Players reach a large gate.

Gate only opens if BOTH buttons are pressed simultaneously.

Players must stand on their own colored buttons together.

Door slowly opens.

Teach teamwork without explaining it.

-----------------------------------

SECTION 5

Stacking

A wall is too tall.

One player must stand still.

The other jumps on top.

Together they reach the ledge.

Hint appears only if they struggle for several seconds:

"Try standing on each other."

-----------------------------------

SECTION 6

Level Devil Introduction

Everything appears safe.

When both players cross a bridge,

the middle platform suddenly falls.

Players survive because another platform appears underneath.

Show a tiny text:

"Expect the unexpected."

This introduces the Level Devil concept without killing the player.

-----------------------------------

SECTION 7

Finish

Both players must reach the exit door together.

If only one enters:

Door remains closed.

When both enter:

Fade out.

Display

"Level Complete"

Then

"More mechanics coming soon..."

-----------------------------------

Gameplay Rules

- No enemies

- No combat

- No timers

- No lives

- Instant respawn if someone falls

- Camera follows both players

- Keep both players visible at all times

- Smooth camera movement

- Simple physics

- Tight controls

- Coyote time

- Jump buffering

Architecture

Organize code professionally.

src/

    scenes/

    entities/

    mechanics/

        Button.ts

        Door.ts

        Bridge.ts

    ui/

    assets/

    utils/

Keep mechanics modular so future levels can easily add:

- moving platforms

- keys

- lasers

- disappearing blocks

- gravity switches

- Level Devil traps

- cooperative puzzles

Focus on polish over quantity.

The prototype should feel like the first 60 seconds of a polished indie game that teaches the player everything through gameplay rather than lengthy tutorials.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/25fcd446-8fec-4669-870d-2400a8864c90).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
