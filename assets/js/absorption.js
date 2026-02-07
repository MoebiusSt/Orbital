/**
 * @file absorption.js
 * @description Sun absorption mechanics: player consumes the sun to win.
 *
 * WHAT'S HERE:
 * - checkSunAbsorption(dt) — called each physics tick to handle sun-player interaction
 *
 * ABSORPTION MECHANICS:
 * - Player needs ≥40% of SUN_GAME_MASS to start absorbing
 * - Absorption rate scales with proximity and mass advantage
 * - gravityBlendFactor smoothly transitions gravity from sun to player
 * - Win condition: sun game-mass drops below 2%
 *
 * DEPENDENCIES: state.js, constants.js
 * DEPENDENTS: physics.js (calls checkSunAbsorption)
 *
 * VERSION: 32
 */

function checkSunAbsorption(dt) {
    if (gameWon) return;

    const player = celestialBodies.find(b => b.isPlayer);
    const sun = celestialBodies.find(b => b.isSun);
    if (!player || !sun) return;

    const gameDt = dt * currentGameSpeed;

    // Player mass ratio relative to SUN_GAME_MASS (the reachable one!)
    const massRatio = player.mass / SUN_GAME_MASS;
    const canAbsorb = massRatio >= SUN_ABSORPTION_START_RATIO;

    // Distance check
    const dx = sun.x - player.x, dy = sun.y - player.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const touchDist = player.radius + sun.radius;
    const absorptionRange = touchDist * SUN_ABSORPTION_RANGE_MULTIPLIER;

    // Death collision if too small
    if (!canAbsorb) {
        if (dist < touchDist * 0.8) {
            console.log("Player hit the sun while too small! Resetting.");
            playerNeedsReset = true;
        }
        gravityBlendFactor = Math.max(0, gravityBlendFactor - 0.5 * dt);
        return;
    }

    // Not in range yet
    if (dist > absorptionRange) {
        gravityBlendFactor = Math.max(0, gravityBlendFactor - 0.3 * dt);
        return;
    }

    // --- ABSORBING! ---
    const proximity = Math.max(0, Math.min(1, 1 - (dist - touchDist * 0.5) / (absorptionRange - touchDist * 0.5)));
    const advantage = Math.min(2, (massRatio - SUN_ABSORPTION_START_RATIO) / (1 - SUN_ABSORPTION_START_RATIO));
    const rate = SUN_ABSORPTION_RATE * proximity * Math.max(0.2, advantage);

    // Transfer game-mass from sun to player
    let transfer = sunCurrentGameMass * rate * gameDt;
    transfer = Math.min(transfer, sunCurrentGameMass);
    transfer = Math.max(0, transfer);
    if (transfer <= 0) return;

    // Momentum conservation
    const totalAfter = player.mass + transfer;
    if (totalAfter > 1e-9) {
        player.vx = (player.mass * player.vx + transfer * sun.vx) / totalAfter;
        player.vy = (player.mass * player.vy + transfer * sun.vy) / totalAfter;
    }

    // Apply transfer
    player.mass += transfer;
    sunCurrentGameMass -= transfer;
    sun.mass = sunCurrentGameMass; // Keep sun's actual mass in sync with game mass

    // Update progress & gravity blend
    sunAbsorptionProgress = 1 - (sunCurrentGameMass / SUN_GAME_MASS);
    gravityBlendFactor = Math.min(1, sunAbsorptionProgress);

    // Win check
    if (sunCurrentGameMass < SUN_GAME_MASS * 0.02) {
        console.log("=== WIN! Sun absorbed! ===");
        console.log("Player mass:", player.mass.toExponential(3));
        gameWon = true;
        playerIsGravitationalCenter = true;
        gravityBlendFactor = 1;

        player.mass += sunCurrentGameMass;
        sunCurrentGameMass = 0;
        player.isGravitationalCenter = true;

        const sunIdx = celestialBodies.indexOf(sun);
        if (sunIdx !== -1) celestialBodies.splice(sunIdx, 1);

        celestialBodies.forEach(b => { if (b !== player) b.isGravitationalCenter = false; });
        orbitHistory = [];
    }
}
