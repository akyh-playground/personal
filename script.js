const board = document.getElementById('game-board');
const ctx = board.getContext('2d');
const scoreLabel = document.getElementById('score');
const bestScoreLabel = document.getElementById('best-score');
const restartButton = document.getElementById('restart-btn');
const statusMessage = document.getElementById('status');

const gridSize = 20;
const tileSize = board.width / gridSize;
const tickRateMs = 120;

let snake;
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

function resetGame() {
  snake = [
    { x: 10, y: 10 },
    { x: 9, y: 10 },
    { x: 8, y: 10 }
  ];
  direction = { x: 1, y: 0 };
  queuedDirection = direction;
  score = 0;
  gameOver = false;
  gameStarted = false;
  food = randomFreeTile();
  scoreLabel.textContent = String(score);
  statusMessage.textContent = 'Press any movement key to begin.';
  draw();
}

function randomFreeTile() {
  const occupied = new Set(snake.map((part) => `${part.x},${part.y}`));
  const freeTiles = [];

  for (let y = 0; y < gridSize; y += 1) {
    for (let x = 0; x < gridSize; x += 1) {
      if (!occupied.has(`${x},${y}`)) {
        freeTiles.push({ x, y });
      }
    }
  }

  return freeTiles[Math.floor(Math.random() * freeTiles.length)];
}

function drawTile(x, y, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x * tileSize + 1, y * tileSize + 1, tileSize - 2, tileSize - 2);
}

function draw() {
  ctx.fillStyle = '#0b1220';
  ctx.fillRect(0, 0, board.width, board.height);

  drawTile(food.x, food.y, '#ef9f76');

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

  const hitWall =
    nextHead.x < 0 ||
    nextHead.x >= gridSize ||
    nextHead.y < 0 ||
    nextHead.y >= gridSize;

  const hitSelf = snake.some((segment) => segment.x === nextHead.x && segment.y === nextHead.y);

  if (hitWall || hitSelf) {
    gameOver = true;
    statusMessage.textContent = 'Game over! Press Restart to play again.';
    draw();
    return;
  }

  snake.unshift(nextHead);

  const ateFood = nextHead.x === food.x && nextHead.y === food.y;
  if (ateFood) {
    score += 1;
    scoreLabel.textContent = String(score);
    if (score > bestScore) {
      bestScore = score;
      bestScoreLabel.textContent = String(bestScore);
      saveBestScore(bestScore);
    }
    food = randomFreeTile();
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
