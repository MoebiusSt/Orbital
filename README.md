# Orbital

> The core principle of the game OSMOSE recreated in HTML/Javascript in a vibe coding playground.

![Orbital Gameplay](assets/images/screenshot.png)

## About

An orbital mechanics game where you control a celestial body orbiting a sun. Eject mass to maneuver, absorb other bodies to grow, and eventually consume the sun itself to become the new gravitational center.

## Play

Open `orbital.html` in a browser or try the standalone version at `dist/orbital-mono.html`.

**Controls:**
- Click to eject mass toward cursor (hold for combo multiplier)
- Scroll to zoom
- Space to speed up time

## Development

Modular architecture with separated concerns. See [`ARCHITECTURE.md`](ARCHITECTURE.md) for the full structure.

**Build monolithic version:**
```bash
node _build/assemble.js
```

## Tech Stack

- Pure HTML5 Canvas
- Vanilla JavaScript (no frameworks)
- Procedural generation (simplex noise, FBM)
- Keplerian orbit mechanics with dual-mass gravity system
