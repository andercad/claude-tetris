# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Tetris in vanilla JS + HTML5 Canvas. No dependencies, no build, no tests, no linter. README.md (Spanish) documents controls and customization.

## Run

Open `index.html` directly, or serve statically: `python -m http.server 8000` (or `npx serve .`).

## Architecture

Three files, all loaded by `index.html` (`<script src="game.js">`, no modules):

- `index.html` — fixed DOM ids that `game.js` looks up at load: `board` (300x600 canvas), `next-canvas` (120x120), `score`, `lines`, `level`, `overlay`, `overlay-title`, `overlay-score`, `restart-btn`, `theme-toggle`, `skin-select`, plus pause-menu ids: `pause-overlay`, `pause-main`, `pause-controls`, `resume-btn`, `pause-restart-btn`, `controls-btn`, `controls-back-btn`, `start-level` (select filled from JS, 1..`MAX_START_LEVEL`). Renaming any breaks the game.
- `style.css` — layout/theme only.
- `game.js` (~300 lines) — all logic, global scope:
  - Constants: `COLS=10`, `ROWS=20`, `BLOCK=30` (canvas size = COLS/ROWS × BLOCK; keep in sync with canvas attrs in HTML), `SKINS` (per skin: `colors`, `bg`, `grid`, `draw(ctx,px,py,size,color)`), `COLORS` (active palette, reassigned by `applySkin`), `PIECES`, `LINE_SCORES`.
  - Mutable game state lives in module-level `let` vars (`board`, `current`, `next`, `score`, `level`, `paused`, `gameOver`, `dropAccum`, `dropInterval`, `animId`...), reset in `init()`.
  - Loop: `requestAnimationFrame(loop)` accumulates delta time into `dropAccum`; gravity step when it exceeds `dropInterval` (shrinks per level). `lockPiece` → `merge` → `clearLines` → `spawn` (game over if spawn collides).
  - Pause menu (`P`/`Escape` toggles `togglePause`): separate `#pause-overlay`; game input blocked while `paused`. `startLevel` (chosen in menu) is applied in `init()` (`level`, `dropInterval` via `intervalForLevel`); level = `startLevel + floor(lines/10)`.
  - Single `keydown` listener handles input; restart button calls `init`.
  - Skins: `applySkin(name)` swaps `skin`/`COLORS`, persists in `localStorage['skin']`; `drawBlock` delegates to `skin.draw`, `clearCanvas` paints `skin.bg`. Applies to board, next and ghost.
  - Rendering is a full redraw each frame (`draw`, `drawNext`, ghost piece via `ghostY`).
