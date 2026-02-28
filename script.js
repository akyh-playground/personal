const board = document.getElementById('game-board');
const ctx = board.getContext('2d');
const scoreLabel = document.getElementById('score');
const bestScoreLabel = document.getElementById('best-score');
const obstacleCountLabel = document.getElementById('obstacle-count');
const speedLevelLabel = document.getElementById('speed-level');
const restartButton = document.getElementById('restart-btn');
const statusMessage = document.getElementById('status');

const gridSize = 20;
const tileSize = board.width / gridSize;
const baseTickRateMs = 140;
const minTickRateMs = 70;
const speedIncreaseEvery = 2;
const speedStepMs = 7;
const initialSnakeLength = 7;
const obstacleIncreaseEvery = 2;
const maxObstacleCount = 45;

let snake;
let obstacles;
let food;
let direction;
let queuedDirection;
let score;
let bestScore;
let gameOver;
let gameStarted;
let loopId;
let currentTickRateMs;

function loadBestScore() {
  const stored = Number(localStorage.getItem('snake-best-score'));
  return Number.isFinite(stored) && stored >= 0 ? stored : 0;
}

function saveBestScore(value) {
  localStorage.setItem('snake-best-score', String(value));
}

function tileKey(tile) {
  return `${tile.x},${tile.y}`;
}

function getSpeedLevelForScore(value) {
  return 1 + Math.floor(value / speedIncreaseEvery);
}

function getTickRateForScore(value) {
  const speedLevel = getSpeedLevelForScore(value);
  const reduction = (speedLevel - 1) * speedStepMs;
  return Math.max(minTickRateMs, baseTickRateMs - reduction);
}

function updateSpeedLabel() {
  speedLevelLabel.textContent = `Lv ${getSpeedLevelForScore(score)}`;
}

function createInitialSnake() {
  const headX = Math.floor(gridSize / 2);
  const headY = Math.floor(gridSize / 2);

  return Array.from({ length: initialSnakeLength }, (_, index) => ({
    x: headX - index,
    y: headY
  }));
}

function buildOccupied(extraTiles = []) {
  const occupied = new Set();

  snake.forEach((segment) => {
    occupied.add(tileKey(segment));
  });

  obstacles.forEach((obstacle) => {
    occupied.add(tileKey(obstacle));
  });

  extraTiles.forEach((tile) => {
    if (tile) {
      occupied.add(tileKey(tile));
    }
  });

  return occupied;
}

function randomFreeTile(extraTiles = []) {
  const occupied = buildOccupied(extraTiles);
  const freeTiles = [];

  for (let y = 0; y < gridSize; y += 1) {
    for (let x = 0; x < gridSize; x += 1) {
      if (!occupied.has(`${x},${y}`)) {
        freeTiles.push({ x, y });
      }
    }
  }

  if (freeTiles.length === 0) {
    return null;
  }

  return freeTiles[Math.floor(Math.random() * freeTiles.length)];
}

function updateObstacleLabel() {
  obstacleCountLabel.textContent = String(obstacles.length);
}

function addObstacle() {
  if (obstacles.length >= maxObstacleCount) {
    return false;
  }

  const nextObstacle = randomFreeTile(food ? [food] : []);
  if (!nextObstacle) {
    return false;
  }

  obstacles.push(nextObstacle);
  return true;
}

function syncDifficulty() {
  const targetCount = Math.min(maxObstacleCount, Math.floor(score / obstacleIncreaseEvery));

  while (obstacles.length < targetCount) {
    if (!addObstacle()) {
      break;
    }
  }

  updateObstacleLabel();

  const nextTickRate = getTickRateForScore(score);
  if (nextTickRate !== currentTickRateMs) {
    currentTickRateMs = nextTickRate;
    startLoop();
  }

  updateSpeedLabel();
}

function resetGame() {
  snake = createInitialSnake();
  obstacles = [];
  food = null;
  direction = { x: 1, y: 0 };
  queuedDirection = direction;
  score = 0;
  gameOver = false;
  gameStarted = false;
  currentTickRateMs = getTickRateForScore(score);

  syncDifficulty();
  food = randomFreeTile();
  scoreLabel.textContent = String(score);
  statusMessage.textContent = 'Press any movement key to begin.';

  if (!food) {
    gameOver = true;
    statusMessage.textContent = 'No space left to spawn food. Press any key to restart.';
  }

  draw();
}

function tileCenter(tile) {
  return {
    x: tile.x * tileSize + tileSize / 2,
    y: tile.y * tileSize + tileSize / 2
  };
}

function drawCircle(tile, color, scale, offsetX = 0, offsetY = 0) {
  const center = tileCenter(tile);
  const radius = tileSize * scale;

  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(center.x + tileSize * offsetX, center.y + tileSize * offsetY, radius, 0, Math.PI * 2);
  ctx.fill();
}

function normalizeWrapDelta(value) {
  if (value > gridSize / 2) {
    return value - gridSize;
  }

  if (value < -gridSize / 2) {
    return value + gridSize;
  }

  return value;
}

function directionBetween(fromTile, toTile) {
  const rawX = normalizeWrapDelta(toTile.x - fromTile.x);
  const rawY = normalizeWrapDelta(toTile.y - fromTile.y);

  if (Math.abs(rawX) >= Math.abs(rawY)) {
    return { x: Math.sign(rawX), y: 0 };
  }

  return { x: 0, y: Math.sign(rawY) };
}

function drawWhaleHead(head) {
  drawCircle(head, '#38bdf8', 0.46);
  drawCircle(head, '#e0f2fe', 0.24, 0, 0.18);

  const eyeOffset = {
    x: direction.x * 0.16 + (direction.y !== 0 ? 0.12 : 0),
    y: direction.y * 0.16 - (direction.x !== 0 ? 0.12 : 0)
  };

  drawCircle(head, '#ffffff', 0.075, eyeOffset.x, eyeOffset.y);
  drawCircle(head, '#0f172a', 0.038, eyeOffset.x + direction.x * 0.02, eyeOffset.y + direction.y * 0.02);
}

function drawWhaleBody(segment, index) {
  const bodyColor = index % 2 === 0 ? '#0ea5e9' : '#38bdf8';
  drawCircle(segment, bodyColor, 0.41);
  drawCircle(segment, '#dbeafe', 0.2, 0, 0.15);
}

function drawWhaleTail(tail, previousSegment) {
  drawCircle(tail, '#0ea5e9', 0.37);

  let outward = directionBetween(previousSegment, tail);
  if (outward.x === 0 && outward.y === 0) {
    outward = { x: -direction.x, y: -direction.y };
  }

  const center = tileCenter(tail);
  const tipX = center.x + outward.x * tileSize * 0.44;
  const tipY = center.y + outward.y * tileSize * 0.44;
  const perp = { x: -outward.y, y: outward.x };

  ctx.fillStyle = '#7dd3fc';
  ctx.beginPath();
  ctx.moveTo(tipX + perp.x * tileSize * 0.17, tipY + perp.y * tileSize * 0.17);
  ctx.lineTo(center.x + outward.x * tileSize * 0.08, center.y + outward.y * tileSize * 0.08);
  ctx.lineTo(tipX - perp.x * tileSize * 0.17, tipY - perp.y * tileSize * 0.17);
  ctx.closePath();
  ctx.fill();
}

function drawObstacle(obstacle) {
  const x = obstacle.x * tileSize + 2;
  const y = obstacle.y * tileSize + 2;
  const size = tileSize - 4;

  ctx.fillStyle = '#f87171';
  ctx.fillRect(x, y, size, size);
  ctx.fillStyle = '#fecaca';
  ctx.fillRect(x + 4, y + 4, Math.max(2, size * 0.25), Math.max(2, size * 0.25));
}

function drawFood() {
  if (!food) {
    return;
  }

  drawCircle(food, '#fb923c', 0.34);
  drawCircle(food, '#fed7aa', 0.16, -0.1, -0.1);
}

function drawSnake() {
  snake.forEach((segment, index) => {
    if (index === 0) {
      drawWhaleHead(segment);
      return;
    }

    if (index === snake.length - 1) {
      drawWhaleTail(segment, snake[index - 1]);
      return;
    }

    drawWhaleBody(segment, index);
  });
}

function draw() {
  ctx.fillStyle = '#0b1220';
  ctx.fillRect(0, 0, board.width, board.height);

  obstacles.forEach((obstacle) => {
    drawObstacle(obstacle);
  });

  drawFood();
  drawSnake();
}

function setDirection(next) {
  const wouldReverse = next.x === -direction.x && next.y === -direction.y;
  if (!wouldReverse) {
    queuedDirection = next;
    if (!gameStarted) {
      gameStarted = true;
      statusMessage.textContent = '';
    }
  }
}

function directionFromKey(key) {
  const map = {
    ArrowUp: { x: 0, y: -1 },
    ArrowDown: { x: 0, y: 1 },
    ArrowLeft: { x: -1, y: 0 },
    ArrowRight: { x: 1, y: 0 },
    w: { x: 0, y: -1 },
    s: { x: 0, y: 1 },
    a: { x: -1, y: 0 },
    d: { x: 1, y: 0 }
  };

  if (typeof key !== 'string') {
    return null;
  }

  return map[key] || map[key.toLowerCase()] || null;
}

function handleInput(event) {
  const nextDirection = directionFromKey(event.key);

  if (gameOver) {
    event.preventDefault();
    resetGame();
    gameStarted = true;
    statusMessage.textContent = '';

    if (nextDirection) {
      direction = nextDirection;
      queuedDirection = nextDirection;
    }

    return;
  }

  if (nextDirection) {
    event.preventDefault();
    setDirection(nextDirection);
  }
}

function endGame(message) {
  gameOver = true;
  gameStarted = false;
  statusMessage.textContent = `${message} Press any key to restart.`;
  draw();
}

function step() {
  if (gameOver || !gameStarted) {
    draw();
    return;
  }

  direction = queuedDirection;
  const head = snake[0];
  const nextHead = {
    x: head.x + direction.x,
    y: head.y + direction.y
  };

  nextHead.x = (nextHead.x + gridSize) % gridSize;
  nextHead.y = (nextHead.y + gridSize) % gridSize;

  const hitObstacle = obstacles.some(
    (obstacle) => obstacle.x === nextHead.x && obstacle.y === nextHead.y
  );
  if (hitObstacle) {
    endGame('Game over! You crashed into an obstacle.');
    return;
  }

  const hitSelf = snake.some((segment) => segment.x === nextHead.x && segment.y === nextHead.y);
  if (hitSelf) {
    endGame('Game over! You crashed into yourself.');
    return;
  }

  snake.unshift(nextHead);

  const ateFood = food && nextHead.x === food.x && nextHead.y === food.y;
  if (ateFood) {
    score += 1;
    scoreLabel.textContent = String(score);

    if (score > bestScore) {
      bestScore = score;
      bestScoreLabel.textContent = String(bestScore);
      saveBestScore(bestScore);
    }

    syncDifficulty();
    food = randomFreeTile();

    if (!food) {
      endGame('You win! No free tiles left.');
      return;
    }
  } else {
    snake.pop();
  }

  draw();
}

function startLoop() {
  if (loopId) {
    clearInterval(loopId);
  }

  loopId = setInterval(step, currentTickRateMs);
}

bestScore = loadBestScore();
bestScoreLabel.textContent = String(bestScore);
resetGame();
startLoop();

window.addEventListener('keydown', handleInput, { passive: false });
restartButton.addEventListener('click', resetGame);
