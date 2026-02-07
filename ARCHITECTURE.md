# Orbital — Architecture Documentation

> **For AI Agents**: This document is your map. Read it first before making changes.
> Always update this file when adding/moving/renaming modules.

## Quick Navigation

| Need to change... | Go to... |
|-------------------|----------|
| Game constants/tuning | `assets/js/constants.js` |
| Global state variables | `assets/js/state.js` |
| Math/utility functions | `assets/js/utils.js` |
| Noise generation (simplex, FBM) | `assets/js/noise.js` |
| Background (nebula, stars, particles) | `assets/js/background.js` |
| Sun rendering (surface, corona, halo) | `assets/js/sun-visuals.js` |
| Body shading/glow | `assets/js/body-rendering.js` |
| CelestialBody class | `assets/js/celestial-body.js` |
| Mouse/keyboard/zoom input | `assets/js/input.js` |
| Initial body spawning | `assets/js/population.js` |
| Mass ejection mechanics | `assets/js/ejection.js` |
| Gravity & physics | `assets/js/physics.js` |
| Collision detection | `assets/js/collision.js` |
| Sun absorption/win logic | `assets/js/absorption.js` |
| Reset/warning/orbit history | `assets/js/game-state.js` |
| Main draw loop & HUD | `assets/js/renderer.js` |
| Entry point & game loop | `assets/js/main.js` |
| CSS styles | `assets/orbital.css` |

---

## File Structure

```
Orbital/
├── orbital.html              # Main entry point (modular) together with \assets\js\main.js
├── ARCHITECTURE.md           # This file — keep updated!
├── assets/
│   ├── orbital.css           # All styles
│   └── js/
│       ├── constants.js      # Config values, derived constants
│       ├── utils.js          # Pure math functions
│       ├── state.js          # Global mutable state
│       ├── noise.js          # PRNG, Simplex 2D, FBM
│       ├── background.js     # Nebula, starfield, drift particles
│       ├── sun-visuals.js    # Sun rendering pipeline
│       ├── body-rendering.js # Shaded body drawing
│       ├── celestial-body.js # CelestialBody class
│       ├── input.js          # Event handlers
│       ├── population.js     # System population
│       ├── ejection.js       # Mass ejection system
│       ├── physics.js        # Gravity, position updates
│       ├── collision.js      # Collision detection
│       ├── absorption.js     # Sun absorption mechanics
│       ├── game-state.js     # Reset, warning, orbit history
│       ├── renderer.js       # Main draw function
│       └── main.js           # Entry point, game loop
├── build/
│   └── assemble.js           # Builds monolithic HTML
├── dist/
│   └── orbital-mono.html     # Generated monolithic build
└── older versions/
    └── orbital_31.html       # Last monolithic version
```

---

## Module Dependencies
Each file header contains `DEPENDENCIES:` and `DEPENDENTS:` lines.
To find what a module needs: `grep "DEPENDENCIES:" assets/js/*.js`

---

## Script Load Order

**Critical**: Scripts must load in this exact order in `orbital.html`:

1. `constants.js` — All configuration (depends on nothing)
2. `utils.js` — Math helpers (no deps, but constants uses its functions)
3. `state.js` — Global variables (uses BASE_GAME_SPEED from constants)
4. `noise.js` — Pure noise functions
5. `background.js` — Uses noise, state
6. `sun-visuals.js` — Uses noise, state, constants, utils
7. `body-rendering.js` — Uses state, constants, utils
8. `celestial-body.js` — Uses state, constants, utils
9. `input.js` — Uses state, constants, background
10. `population.js` — Uses state, constants, celestial-body
11. `ejection.js` — Uses state, constants, utils, celestial-body
12. `physics.js` — Uses most modules
13. `collision.js` — Uses state, constants
14. `absorption.js` — Uses state, constants
15. `game-state.js` — Uses state, constants, celestial-body, population, physics
16. `renderer.js` — Uses all visual modules
17. `main.js` — Entry point, initializes everything

---

## Key Concepts

### Dual Mass System
The sun has **two separate mass values**:
- `SUN_GRAVITATIONAL_MASS` (1e20): Used only for F=Gm₁m₂/r². Never consumed.
- `SUN_GAME_MASS` (~2e10): Player's reachable goal. Tracks absorption progress.

See `constants.js` lines 29-45 for detailed comments.

### Gravity Crossover
During sun absorption, gravity transitions smoothly:
- `gravityBlendFactor` goes from 0 (sun is center) to 1 (player is center)
- Physics uses weighted sum of both gravity sources
- `GRAVITY_CROSSOVER_MULTIPLIER` scales player's mass for equivalent gravity

### Canvas Layers
Three overlapping canvases for visual effects:
1. `coronaCanvas` — Background + sun halo/corona (bottom layer)
2. `sunCanvas` — Sun surface (middle layer)
3. `gameCanvas` — Bodies, UI, trails (top layer)

Plus two CSS blur elements for soft glow effects.

---

## Making Changes

### Adding a New Feature
1. Identify which module(s) it touches
2. If it needs new state → add to `state.js`
3. If it needs new config → add to `constants.js`
4. Update this file's navigation table
5. Update the build script if adding new files

### Changing Game Balance
All tuning values are in `constants.js`:
- Ejection: `BASE_EJECTION_MASS_PERCENT`, `MAX_EJECTION_MULTIPLIER`, etc.
- Absorption: `SUN_ABSORPTION_RATE`, `SUN_ABSORPTION_START_RATIO`
- Collision: `MASS_TRANSFER_PERCENT_PER_SEC`

### Debugging
- Open browser console (F12)
- Game logs initialization values on start
- `logBodyChanges()` in renderer.js logs body states every 5s

---

## Building Monolithic Version

Run from project root:
```bash
node build/assemble.js
```

Output: `dist/orbital-mono.html` — single file, no dependencies.

---

## Agent Guidelines

**ALWAYS**:
- Update this file when changing module structure
- Keep file headers current with function lists

**NEVER**:
- Add inline JS/CSS to HTML
- Create new files without updating this doc
- Change load order without understanding dependencies

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 32 | 2024 | First modular version, split from monolithic |
| 31 | 2024 | Last monolithic version (in older versions/) |
