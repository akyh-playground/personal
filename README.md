# Snake Whale Game

A simple browser-based Snake game made with HTML, CSS, and vanilla JavaScript.

## Run locally

Because this project uses `localStorage`, serve it with a local HTTP server:

```bash
python3 -m http.server 8000
```

Then open <http://localhost:8000> in your browser.

## Controls

- Arrow keys or `W/A/S/D`: Move the whale-snake
- Any key after game-over: Instantly restart
- Restart button: Reset the game

## Gameplay notes

- The snake starts longer and is rendered as a whale-inspired creature.
- Moving through a wall wraps your whale-snake to the opposite side.
- Obstacles start at zero and progressively appear as your score increases.
- Snake speed increases as the game continues.
