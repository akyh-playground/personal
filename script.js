const board = document.getElementById('game-board');
const ctx = board.getContext('2d');
const scoreLabel = document.getElementById('score');
const bestScoreLabel = document.getElementById('best-score');
const obstacleCountLabel = document.getElementById('obstacle-count');
const restartButton = document.getElementById('restart-btn');
const statusMessage = document.getElementById('status');

const gridSize = 20;
const tileSize = board.width / gridSize;
const tickRateMs = 120;
const initialSnakeLength = 5;
const baseObstacleCount = 3;
const obstacleIncreaseEvery = 3;
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

function syncObstacleDifficulty() {
  const targetCount = Math.min(
    maxObstacleCount,
    baseObstacleCount + Math.floor(score / obstacleIncreaseEvery)
  );

  while (obstacles.length < targetCount) {
    if (!addObstacle()) {
      break;
    }
  }

  updateObstacleLabel();
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

  for (let i = 0; i < baseObstacleCount; i += 1) {
    if (!addObstacle()) {
      break;
    }
  }

  updateObstacleLabel();
  food = randomFreeTile();
  scoreLabel.textContent = String(score);
  statusMessage.textContent = 'Press any movement key to begin.';

  if (!food) {
    gameOver = true;
    statusMessage.textContent = 'No space left to spawn food. Press Restart to try again.';
  }

  draw();
}

function drawTile(x, y, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x * tileSize + 1, y * tileSize + 1, tileSize - 2, tileSize - 2);
}

function draw() {
  ctx.fillStyle = '#0b1220';
  ctx.fillRect(0, 0, board.width, board.height);

  obstacles.forEach((obstacle) => {
    drawTile(obstacle.x, obstacle.y, '#f7768e');
  });

  if (food) {
    drawTile(food.x, food.y, '#ef9f76');
  }

  snake.forEach((segment, index) => {
    const color = index === 0 ? '#a6da95' : '#8bd5ca';
    drawTile(segment.x, segment.y, color);
  });
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

function handleInput(event) {
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

  const key = event.key;
  const next = map[key] || map[key.toLowerCase()];
  if (next) {
    event.preventDefault();
    setDirection(next);
  }
}

function endGame(message) {
  gameOver = true;
  statusMessage.textContent = message;
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

    syncObstacleDifficulty();
    food = randomFreeTile();

    if (!food) {
      endGame('You win! No free tiles left. Press Restart to play again.');
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

  loopId = setInterval(step, tickRateMs);
}

bestScore = loadBestScore();
bestScoreLabel.textContent = String(bestScore);
resetGame();
startLoop();

window.addEventListener('keydown', handleInput, { passive: false });
restartButton.addEventListener('click', resetGame);
