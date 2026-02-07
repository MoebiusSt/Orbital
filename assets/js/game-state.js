/**
 * @file game-state.js
 * @description Game state management: reset, warning, orbit history.
 *
 * WHAT'S HERE:
 * - resetPlayer() — respawns player and repopulates system
 * - calculateWarningIntensity() — low-mass warning indicator
 * - updateOrbitHistory() — tracks player orbit history for trail rendering
 *
 * DEPENDENCIES: state.js, constants.js, celestial-body.js, population.js, physics.js
 * DEPENDENTS: physics.js (calls resetPlayer, calculateWarningIntensity, updateOrbitHistory)
 *
 * VERSION: 32
 */

function resetPlayer() {
    console.log("Resetting player...");
    let sun = celestialBodies.find(b => b.isSun);
    if (!sun) {
        sun = new CelestialBody(0, 0, 0, 0, SUN_GAME_MASS, false, true);
        celestialBodies.push(sun);
    } else {
        sun.isGravitationalCenter = true;
        sun.mass = SUN_GAME_MASS;
    }
    sunCurrentGameMass = SUN_GAME_MASS;

    const orbitR = Math.max(sun.radius * 1.5, Math.min(canvas.width, canvas.height) * 0.35);
    const orbSpeed = Math.sqrt((G * SUN_GRAVITATIONAL_MASS) / orbitR);

    celestialBodies = [sun];
    const p = new CelestialBody(sun.x, sun.y - orbitR, sun.vx + orbSpeed, sun.vy, PLAYER_INITIAL_MASS, true);
    p.isGravitationalCenter = false;
    celestialBodies.push(p);

    gameWon = false;
    playerIsGravitationalCenter = false;
    sunAbsorptionProgress = 0;
    gravityBlendFactor = 0;
    sun.isGravitationalCenter = true;

    populateSystem(INIT_NUM_BODIES);

    orbitHistory = [];
    currentEjectionMultiplier = 1;
    lastClickTime = lastEjectionDecayTime = 0;
    currentWarningIntensity = 0;
    camera = { x: p.x, y: p.y, scale: 1 };
    playerNeedsReset = false;
}

function calculateWarningIntensity() {
    const player = celestialBodies.find(b => b.isPlayer);
    if (!player || gameWon || sunAbsorptionProgress > 0) return 0;
    const range = PLAYER_INITIAL_MASS - MIN_PLAYER_MASS;
    if (range <= 0) return 0;
    const ratio = (player.mass - MIN_PLAYER_MASS) / range;
    if (ratio > 0.5) return 0;
    return Math.max(0, Math.min(1, 1 - ratio / 0.5));
}

function updateOrbitHistory() {
    const player = celestialBodies.find(b => b.isPlayer);
    const sun = celestialBodies.find(b => b.isSun);
    const center = sun || (gameWon ? null : null);

    if (player && center && player !== center) {
        const p = calculateOrbitParameters(player, center);
        if (isFinite(p.a) && p.a > 0 && isFinite(p.b) && p.b > 0) {
            p.absorbing = sunAbsorptionProgress > 0;
            p.absorptionProgress = sunAbsorptionProgress;
            orbitHistory.unshift(p);
            if (orbitHistory.length > ORBIT_HISTORY_LENGTH) orbitHistory.pop();
        }
    } else {
        orbitHistory = [];
    }
}
