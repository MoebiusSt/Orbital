/**
 * @file ejection.js
 * @description Mass ejection system: player click → eject mass + sparks + propulsion.
 *
 * WHAT'S HERE:
 * - ejectMass() — main click handler for ejecting mass
 * - decayEjectionMultiplier() — reduces combo multiplier over time
 *
 * MECHANICS:
 * - Quick clicks (< QUICK_CLICK_THRESHOLD ms) build up ejection multiplier
 * - Larger ejections produce more sparks at higher speeds
 * - Ejected mass imparts momentum to player (propulsion)
 * - Sparks are short-lived decorative particles
 *
 * DEPENDENCIES: state.js, constants.js, utils.js (calculateRadiusFromMass),
 *               celestial-body.js (CelestialBody)
 * DEPENDENTS: main.js (registers click listener), physics.js (calls decayEjectionMultiplier)
 *
 * VERSION: 32
 */

function ejectMass() {
    const player = celestialBodies.find(b => b.isPlayer);
    if (!player || player.mass <= MIN_PLAYER_MASS) return;

    const currentTime = Date.now();
    const timeSince = currentTime - lastClickTime;
    const initMass = player.mass;

    if (timeSince <= QUICK_CLICK_THRESHOLD)
        currentEjectionMultiplier = Math.min(currentEjectionMultiplier * EJECTION_GROWTH_RATE, MAX_EJECTION_MULTIPLIER);
    else currentEjectionMultiplier = 1;

    let ejectedMass = Math.min(initMass * BASE_EJECTION_MASS_PERCENT * currentEjectionMultiplier, initMass * MAX_EJECTION_PERCENTAGE);
    if (initMass - ejectedMass < MIN_PLAYER_MASS) {
        ejectedMass = initMass - MIN_PLAYER_MASS;
        if (ejectedMass <= 1e-9) return;
    }

    const intRange = MAX_EJECTION_PERCENTAGE - BASE_EJECTION_MASS_PERCENT;
    let normInt = intRange > 1e-9 ? ((ejectedMass / initMass) - BASE_EJECTION_MASS_PERCENT) / intRange : 0;
    normInt = Math.max(0, Math.min(1, normInt));

    const numSparks = Math.round(MIN_SPARKS + (MAX_SPARKS - MIN_SPARKS) * normInt);
    const sparkSpeedMult = MIN_SPARK_SPEED_MULTIPLIER + (MAX_SPARK_SPEED_MULTIPLIER - MIN_SPARK_SPEED_MULTIPLIER) * normInt * 170;
    const sparkSpreadAngle = MAX_SPARK_SPREAD_ANGLE - (MAX_SPARK_SPREAD_ANGLE - MIN_SPARK_SPREAD_ANGLE) * normInt * 15;

    const speedF = ejectedMass > 1e-9 ? Math.sqrt((initMass * BASE_EJECTION_MASS_PERCENT) / ejectedMass) : 1;
    const mainSpeed = EJECTION_BASE_SPEED * speedF;

    player.mass -= ejectedMass;

    const px = (player.x - camera.x) * camera.scale + canvas.width / 2;
    const py = (player.y - camera.y) * camera.scale + canvas.height / 2;
    const angle = Math.atan2(screenMouseY - py, screenMouseX - px);

    if (ejectedMass >= MIN_BODY_MASS) {
        const er = calculateRadiusFromMass(ejectedMass);
        const sd = player.radius + er * 1.1;
        celestialBodies.push(new CelestialBody(
            player.x + Math.cos(angle) * sd, player.y + Math.sin(angle) * sd,
            player.vx + Math.cos(angle) * mainSpeed, player.vy + Math.sin(angle) * mainSpeed,
            ejectedMass
        ));
    }

    if (numSparks > 0) {
        const sr = calculateRadiusFromMass(SPARK_MASS);
        const sd = player.radius + sr * 1.5;
        for (let i = 0; i < numSparks; i++) {
            const sa = angle + (Math.random() - 0.5) * sparkSpreadAngle;
            const ss = mainSpeed * sparkSpeedMult * (1 + (Math.random() - 0.5) * 2 * SPARK_SPEED_RANDOMNESS);
            celestialBodies.push(new CelestialBody(
                player.x + Math.cos(angle) * sd, player.y + Math.sin(angle) * sd,
                player.vx + Math.cos(sa) * ss, player.vy + Math.sin(sa) * ss,
                SPARK_MASS, false, false, true
            ));
        }
    }

    if (player.mass > 1e-9) {
        const imp = (ejectedMass * mainSpeed / player.mass) * EJECTION_PROPULSION_MULTIPLIER;
        player.vx -= Math.cos(angle) * imp;
        player.vy -= Math.sin(angle) * imp;
    }

    lastClickTime = currentTime;
}

function decayEjectionMultiplier() {
    const now = Date.now();
    if (now - lastClickTime > QUICK_CLICK_THRESHOLD && now - lastEjectionDecayTime > EJECTION_DECAY_INTERVAL) {
        currentEjectionMultiplier = Math.max(1, currentEjectionMultiplier * EJECTION_DECAY_RATE);
        lastEjectionDecayTime = now;
    }
}
