'use strict';

const COLS = 10;
const ROWS = 20;
const BLOCK = 30;

// Paletas por skin (índice = tipo de pieza: I O T S Z J L N)
const RETRO_COLORS = [
  null,
  '#4dd0e1', // I - cyan
  '#ffd54f', // O - yellow
  '#ba68c8', // T - purple
  '#81c784', // S - green
  '#e57373', // Z - red
  '#90caf9', // J - pale blue
  '#ffb74d', // L - orange
  '#b0bec5', // N - tuerca (gris metálico)
];
const NEON_COLORS = [null, '#00fff7', '#ffee00', '#d400ff', '#39ff14', '#ff073a', '#2979ff', '#ff9100', '#e0e0e0'];
const PASTEL_COLORS = [null, '#a8e6f0', '#fff3b0', '#d7b8f3', '#b9f0c4', '#ffb3b3', '#b5d3ff', '#ffd3a5', '#d9e2e7'];
const PIXEL_COLORS = [null, '#29b6f6', '#fdd835', '#ab47bc', '#66bb6a', '#ef5350', '#5c6bc0', '#ff9800', '#90a4ae'];

function roundRectPath(c, x, y, w, h, r) {
  c.beginPath();
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}

// Cada skin: colors, bg (fondo del canvas o null = transparente/tema), grid (color de rejilla o null = tema),
// draw(context, px, py, size, color) dibuja un bloque en píxeles
const SKINS = {
  retro: {
    label: 'Retro', colors: RETRO_COLORS, bg: null, grid: null,
    draw(c, px, py, s, color) {
      c.fillStyle = color;
      c.fillRect(px + 1, py + 1, s - 2, s - 2);
      c.fillStyle = 'rgba(255,255,255,0.12)';
      c.fillRect(px + 1, py + 1, s - 2, 4);
    },
  },
  neon: {
    label: 'Neon', colors: NEON_COLORS, bg: '#000000', grid: '#14141f',
    draw(c, px, py, s, color) {
      c.save();
      c.shadowColor = color;
      c.shadowBlur = 12;
      c.strokeStyle = color;
      c.lineWidth = 2;
      c.strokeRect(px + 3, py + 3, s - 6, s - 6);
      c.fillStyle = color;
      c.globalAlpha *= 0.35;
      c.fillRect(px + 3, py + 3, s - 6, s - 6);
      c.restore();
    },
  },
  pastel: {
    label: 'Pastel', colors: PASTEL_COLORS, bg: null, grid: null,
    draw(c, px, py, s, color) {
      roundRectPath(c, px + 1.5, py + 1.5, s - 3, s - 3, s * 0.3);
      c.fillStyle = color;
      c.fill();
      c.strokeStyle = 'rgba(255,255,255,0.7)';
      c.lineWidth = 1.5;
      c.stroke();
    },
  },
  pixel: {
    label: 'Pixel art', colors: PIXEL_COLORS, bg: null, grid: null,
    draw(c, px, py, s, color) {
      const u = Math.max(2, Math.floor(s / 6)); // "pixel" de la textura
      c.fillStyle = color;
      c.fillRect(px, py, s, s);
      // textura: tablero de ajedrez sutil
      c.fillStyle = 'rgba(0,0,0,0.18)';
      for (let i = 0; i * u < s; i++)
        for (let j = 0; j * u < s; j++)
          if ((i + j) % 2) c.fillRect(px + i * u, py + j * u, Math.min(u, s - i * u), Math.min(u, s - j * u));
      // bisel pixelado
      c.fillStyle = 'rgba(255,255,255,0.55)';
      c.fillRect(px, py, s, u);
      c.fillRect(px, py, u, s);
      c.fillStyle = 'rgba(0,0,0,0.45)';
      c.fillRect(px, py + s - u, s, u);
      c.fillRect(px + s - u, py, u, s);
    },
  },
};

let skinName = 'retro';
let skin = SKINS.retro;
let COLORS = skin.colors;

const PIECES = [
  null,
  [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]], // I
  [[2,2],[2,2]],                               // O
  [[0,3,0],[3,3,3],[0,0,0]],                  // T
  [[0,4,4],[4,4,0],[0,0,0]],                  // S
  [[5,5,0],[0,5,5],[0,0,0]],                  // Z
  [[6,0,0],[6,6,6],[0,0,0]],                  // J
  [[0,0,7],[7,7,7],[0,0,0]],                  // L
  [[8,8,8],[8,0,8],[8,8,8]],                  // N - tuerca (hueco central)
];

const LINE_SCORES = [0, 100, 300, 500, 800];

const canvas = document.getElementById('board');
const ctx = canvas.getContext('2d');
const nextCanvas = document.getElementById('next-canvas');
const nextCtx = nextCanvas.getContext('2d');
const scoreEl = document.getElementById('score');
const linesEl = document.getElementById('lines');
const levelEl = document.getElementById('level');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayScore = document.getElementById('overlay-score');
const restartBtn = document.getElementById('restart-btn');

let themeGridColor = '#22222e';
let gridColor = themeGridColor;
let board, current, next, score, lines, level, paused, gameOver, lastTime, dropAccum, dropInterval, animId;

const themeToggle = document.getElementById('theme-toggle');

function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  themeToggle.setAttribute('aria-checked', theme === 'light' ? 'true' : 'false');
  themeGridColor = getComputedStyle(document.documentElement).getPropertyValue('--grid').trim() || themeGridColor;
  gridColor = skin.grid || themeGridColor;
  // refresca el canvas si el loop está detenido (pausa / game over)
  if (current && (paused || gameOver)) { draw(); drawNext(); }
}

const skinSelect = document.getElementById('skin-select');

function applySkin(name) {
  if (!SKINS[name]) name = 'retro';
  skinName = name;
  skin = SKINS[name];
  COLORS = skin.colors;
  gridColor = skin.grid || themeGridColor;
  skinSelect.value = name;
  if (current) { draw(); drawNext(); } // refresco inmediato sin recargar
}

function toggleTheme() {
  const theme = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
  applyTheme(theme);
  try { localStorage.setItem('theme', theme); } catch (e) {}
}

function createBoard() {
  return Array.from({ length: ROWS }, () => new Array(COLS).fill(0));
}

function randomPiece() {
  const type = Math.floor(Math.random() * (PIECES.length - 1)) + 1;
  const shape = PIECES[type].map(row => [...row]);
  return { type, shape, x: Math.floor(COLS / 2) - Math.floor(shape[0].length / 2), y: 0 };
}

function collide(shape, ox, oy) {
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue;
      const nx = ox + c;
      const ny = oy + r;
      if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
      if (ny >= 0 && board[ny][nx]) return true;
    }
  }
  return false;
}

function rotateCW(shape) {
  const rows = shape.length, cols = shape[0].length;
  const result = Array.from({ length: cols }, () => new Array(rows).fill(0));
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++)
      result[c][rows - 1 - r] = shape[r][c];
  return result;
}

function tryRotate() {
  const rotated = rotateCW(current.shape);
  const kicks = [0, -1, 1, -2, 2];
  for (const kick of kicks) {
    if (!collide(rotated, current.x + kick, current.y)) {
      current.shape = rotated;
      current.x += kick;
      return;
    }
  }
}

function merge() {
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      if (current.shape[r][c])
        board[current.y + r][current.x + c] = current.shape[r][c];
}

function clearLines() {
  let cleared = 0;
  for (let r = ROWS - 1; r >= 0; r--) {
    if (board[r].every(v => v !== 0)) {
      board.splice(r, 1);
      board.unshift(new Array(COLS).fill(0));
      cleared++;
      r++;
    }
  }
  if (cleared) {
    lines += cleared;
    score += (LINE_SCORES[cleared] || 0) * level;
    level = Math.floor(lines / 10) + 1;
    dropInterval = Math.max(100, 1000 - (level - 1) * 90);
    updateHUD();
  }
}

function ghostY() {
  let gy = current.y;
  while (!collide(current.shape, current.x, gy + 1)) gy++;
  return gy;
}

function hardDrop() {
  const gy = ghostY();
  score += (gy - current.y) * 2;
  current.y = gy;
  lockPiece();
}

function softDrop() {
  if (!collide(current.shape, current.x, current.y + 1)) {
    current.y++;
    score += 1;
    updateHUD();
  } else {
    lockPiece();
  }
}

function lockPiece() {
  merge();
  clearLines();
  spawn();
}

function spawn() {
  current = next;
  next = randomPiece();
  if (collide(current.shape, current.x, current.y)) {
    endGame();
  }
  drawNext();
}

function updateHUD() {
  scoreEl.textContent = score.toLocaleString();
  linesEl.textContent = lines;
  levelEl.textContent = level;
}

function drawBlock(context, x, y, colorIndex, size, alpha) {
  if (!colorIndex) return;
  context.globalAlpha = alpha ?? 1;
  skin.draw(context, x * size, y * size, size, COLORS[colorIndex]);
  context.globalAlpha = 1;
}

function clearCanvas(context, cv) {
  context.clearRect(0, 0, cv.width, cv.height);
  if (skin.bg) {
    context.fillStyle = skin.bg;
    context.fillRect(0, 0, cv.width, cv.height);
  }
}

function drawGrid() {
  ctx.strokeStyle = gridColor;
  ctx.lineWidth = 0.5;
  for (let c = 1; c < COLS; c++) {
    ctx.beginPath();
    ctx.moveTo(c * BLOCK, 0);
    ctx.lineTo(c * BLOCK, ROWS * BLOCK);
    ctx.stroke();
  }
  for (let r = 1; r < ROWS; r++) {
    ctx.beginPath();
    ctx.moveTo(0, r * BLOCK);
    ctx.lineTo(COLS * BLOCK, r * BLOCK);
    ctx.stroke();
  }
}

function draw() {
  clearCanvas(ctx, canvas);
  drawGrid();

  // board
  for (let r = 0; r < ROWS; r++)
    for (let c = 0; c < COLS; c++)
      drawBlock(ctx, c, r, board[r][c], BLOCK);

  // en game over la pieza nueva no cabe: no dibujarla encima del tablero
  if (gameOver) return;

  // ghost
  const gy = ghostY();
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      if (current.shape[r][c])
        drawBlock(ctx, current.x + c, gy + r, current.shape[r][c], BLOCK, 0.2);

  // current piece
  for (let r = 0; r < current.shape.length; r++)
    for (let c = 0; c < current.shape[r].length; c++)
      drawBlock(ctx, current.x + c, current.y + r, current.shape[r][c], BLOCK);
}

function drawNext() {
  const NB = 30;
  clearCanvas(nextCtx, nextCanvas);
  const shape = next.shape;
  const offX = Math.floor((4 - shape[0].length) / 2);
  const offY = Math.floor((4 - shape.length) / 2);
  for (let r = 0; r < shape.length; r++)
    for (let c = 0; c < shape[r].length; c++)
      drawBlock(nextCtx, offX + c, offY + r, shape[r][c], NB);
}

function endGame() {
  gameOver = true;
  cancelAnimationFrame(animId);
  draw();
  overlayTitle.textContent = 'GAME OVER';
  overlayScore.textContent = `Puntuación: ${score.toLocaleString()}`;
  overlay.classList.remove('hidden');
}

function togglePause() {
  if (gameOver) return;
  paused = !paused;
  if (!paused) {
    lastTime = performance.now();
    loop(lastTime);
  } else {
    cancelAnimationFrame(animId);
    overlayTitle.textContent = 'PAUSA';
    overlayScore.textContent = '';
    overlay.classList.remove('hidden');
  }
}

function loop(ts) {
  if (gameOver || paused) return;
  const dt = ts - lastTime;
  lastTime = ts;
  dropAccum += dt;
  if (dropAccum >= dropInterval) {
    dropAccum = 0;
    if (!collide(current.shape, current.x, current.y + 1)) {
      current.y++;
    } else {
      lockPiece();
    }
  }
  draw();
  if (gameOver) return; // endGame ocurrió dentro de este frame: no re-programar
  animId = requestAnimationFrame(loop);
}

function init() {
  board = createBoard();
  score = 0;
  lines = 0;
  level = 1;
  paused = false;
  gameOver = false;
  dropInterval = 1000;
  dropAccum = 0;
  lastTime = performance.now();
  next = randomPiece();
  spawn();
  updateHUD();
  overlay.classList.add('hidden');
  cancelAnimationFrame(animId);
  animId = requestAnimationFrame(loop);
}

document.addEventListener('keydown', e => {
  if (e.code === 'KeyP') { togglePause(); return; }
  if (e.code === 'KeyT') { toggleTheme(); return; }
  if (paused || gameOver) return;
  switch (e.code) {
    case 'ArrowLeft':
      if (!collide(current.shape, current.x - 1, current.y)) current.x--;
      break;
    case 'ArrowRight':
      if (!collide(current.shape, current.x + 1, current.y)) current.x++;
      break;
    case 'ArrowDown':
      softDrop();
      break;
    case 'ArrowUp':
    case 'KeyX':
      tryRotate();
      break;
    case 'Space':
      e.preventDefault();
      hardDrop();
      break;
  }
  updateHUD();
});

restartBtn.addEventListener('click', init);

themeToggle.addEventListener('click', () => {
  toggleTheme();
  themeToggle.blur(); // evita que Space alterne el tema durante la partida
});

skinSelect.addEventListener('change', () => {
  applySkin(skinSelect.value);
  try { localStorage.setItem('skin', skinName); } catch (e) {}
  skinSelect.blur(); // evita que las flechas/Space cambien la skin durante la partida
});

let savedTheme = 'dark';
try { if (localStorage.getItem('theme') === 'light') savedTheme = 'light'; } catch (e) {}
let savedSkin = 'retro';
try { savedSkin = localStorage.getItem('skin') || 'retro'; } catch (e) {}
applySkin(savedSkin);
applyTheme(savedTheme);

init();
