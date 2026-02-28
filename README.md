# Snake Game

A simple browser-based Snake game made with HTML, CSS, and vanilla JavaScript.

## Run locally

Because this project uses `localStorage`, serve it with a local HTTP server:

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000> in your browser.

## Controls

- Arrow keys or `W/A/S/D`: Move the snake
- Restart button: Reset the game

## Gameplay notes

- The snake starts longer for a slightly more challenging opening.
- Moving through a wall wraps your snake to the opposite side.
- Obstacles begin on the board and increase over time (every 3 food eaten), so the game gets harder as you score.
