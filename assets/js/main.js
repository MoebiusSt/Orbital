/**
 * @file main.js
 * @description Entry point: initialization, game loop, event binding.
 *
 * WHAT'S HERE:
 * - initializeGame() — sets up canvases, creates initial bodies, binds events
 * - gameLoop() — requestAnimationFrame loop calling updatePhysics + draw
 * - Error handling wrapper
 *
 * LOAD ORDER (script tags in orbital.html):
 * 1. constants.js — all config values
 * 2. utils.js — math helpers (needed by constants for derived values)
 * 3. state.js — global mutable state
 * 4. noise.js — PRNG & simplex noise
 * 5. background.js — nebula, starfield, drift
 * 6. sun-visuals.js — sun rendering
 * 7. body-rendering.js — shaded bodies, glow
 * 8. celestial-body.js — CelestialBody class
 * 9. input.js — mouse, keyboard, zoom
 * 10. population.js — system population
 * 11. ejection.js — mass ejection
 * 12. physics.js — gravity, positions
 * 13. collision.js — collision detection
 * 14. absorption.js — sun absorption
 * 15. game-state.js — reset, warning, orbit history
 * 16. renderer.js — draw function
 * 17. main.js — this file (entry point)
 *
 * DEPENDENCIES: All other modules
 * DEPENDENTS: None (this is the entry point)
 *
 * VERSION: 32
 */

function initializeGame() {
    canvas = document.getElementById('gameCanvas');
    ctx = canvas.getContext('2d');
    coronaCanvas = document.getElementById('coronaCanvas');
    coronaCtx = coronaCanvas ? coronaCanvas.getContext('2d') : null;
    sunCanvas = document.getElementById('sunCanvas');
    sunCtx = sunCanvas ? sunCanvas.getContext('2d') : null;
    sunBlurDiskEl = document.querySelector('.sun-blur-disk');
    sunBlurCoronaEl = document.querySelector('.sun-blur-corona');
    resizeCanvas();

    // Initialize derived constants (requires utils.js)
    initDerivedConstants();
    initBodyMassConstant();
    initSparkMass();

    sunCurrentGameMass = SUN_GAME_MASS;

    celestialBodies = [
        new CelestialBody(0, 0, 0, 0, SUN_GAME_MASS, false, true),
    ];

    const sun = celestialBodies[0];
    const orbitRadius = Math.min(canvas.width, canvas.height) * 0.35;
    // Orbital speed uses the GRAVITATIONAL mass (the huge one), not the game mass
    const orbitalSpeed = Math.sqrt((G * SUN_GRAVITATIONAL_MASS) / orbitRadius);

    celestialBodies.push(
        new CelestialBody(0, -orbitRadius, orbitalSpeed, 0, PLAYER_INITIAL_MASS, true)
    );

    playerIsGravitationalCenter = false;
    sunAbsorptionProgress = 0;
    gravityBlendFactor = 0;

    populateSystem(INIT_NUM_BODIES);

    gameWon = false;
    playerNeedsReset = false;
    orbitHistory = [];
    currentEjectionMultiplier = 1;
    lastClickTime = 0;
    lastEjectionDecayTime = 0;
    currentWarningIntensity = 0;
    camera = {x: 0, y: 0, scale: 1};

    initializeBackground();
    initializeSunVisuals();

    window.addEventListener('resize', resizeCanvas);
    canvas.addEventListener('mousemove', updateMousePosition);
    canvas.addEventListener('click', ejectMass);
    canvas.addEventListener('wheel', handleZoom);
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    console.log("=== Game Initialized ===");
    console.log("Player initial mass:", PLAYER_INITIAL_MASS.toExponential(2));
    console.log("Sun GAME mass:", SUN_GAME_MASS.toExponential(2), "(reachable!)");
    console.log("Sun GRAVITATIONAL mass:", SUN_GRAVITATIONAL_MASS.toExponential(2), "(for orbits only)");
    console.log("Ratio player/sun-game:", (PLAYER_INITIAL_MASS / SUN_GAME_MASS * 100).toFixed(2) + "%");
    console.log("Sun display radius:", sun.radius.toFixed(1));
    console.log("Gravity crossover multiplier:", GRAVITY_CROSSOVER_MULTIPLIER.toExponential(2));
}

// ── Game Loop ─────────────────────────────────────────────────
let lastTime = 0, animFrameId = null;

function gameLoop() {
    animFrameId = requestAnimationFrame(gameLoop);
    try {
        const now = performance.now();
        const dt = Math.min((now - lastTime) / 1000, 0.1);
        lastTime = now;
        if (dt <= 0) return;
        updatePhysics(dt);
        if (!playerNeedsReset) draw();
    } catch (e) {
        console.error("Loop error:", e);
        if (animFrameId) cancelAnimationFrame(animFrameId);
        if (ctx) { ctx.fillStyle='red'; ctx.font='16px Arial'; ctx.textAlign='center';
            ctx.fillText('Fehler! F12.', canvas.width/2, canvas.height/2); }
    }
}

// ── Start ─────────────────────────────────────────────────────
try {
    initializeGame();
    lastTime = performance.now();
    animFrameId = requestAnimationFrame(gameLoop);
} catch(e) {
    console.error("Init:", e);
    const c = document.getElementById('gameCanvas'), x = c?.getContext('2d');
    if (x) { x.fillStyle='red'; x.font='16px Arial'; x.textAlign='center';
        x.fillText('Init-Fehler.', c.width/2, c.height/2); }
}
