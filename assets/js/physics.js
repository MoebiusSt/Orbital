/**
 * @file physics.js
 * @description Gravity, position updates, orbit parameter calculation.
 *
 * WHAT'S HERE:
 * - updatePhysics(dt) — main physics tick (gravity, positions, orbit params)
 * - calculateOrbitParameters(body, center) — Keplerian elements (a, b, e, periapsisAngle)
 *
 * GRAVITY SYSTEM:
 * Uses dual-source gravity with crossover blend:
 * - Sun gravity weighted by (1 - gravityBlendFactor)
 * - Player gravity weighted by gravityBlendFactor
 * This allows smooth transition when player absorbs the sun.
 *
 * DEPENDENCIES: state.js, constants.js (G, SUN_GRAVITATIONAL_MASS, etc.),
 *               collision.js (checkCollisions), absorption.js (checkSunAbsorption),
 *               game-state.js (resetPlayer), ejection.js (decayEjectionMultiplier)
 * DEPENDENTS: main.js (game loop calls updatePhysics)
 *
 * VERSION: 32
 */

function updatePhysics(dt) {
    const gameDt = dt * currentGameSpeed;
    collisionDetectedThisFrame = false;

    // --- Cleanup ---
    const now = Date.now();
    celestialBodies = celestialBodies.filter(body => {
        if (!body) return false;
        if (body.isSpark && (now - body.creationTime) >= SPARK_LIFESPAN) return false;
        if (!body.isPlayer && !body.isGravitationalCenter && !body.isSun && !body.isSpark) {
            if (body.mass < MIN_BODY_MASS) return false;
        }
        return true;
    });

    // --- GRAVITY: Dual-source with crossover blend ---
    const sun = celestialBodies.find(b => b.isSun);
    const player = celestialBodies.find(b => b.isPlayer);

    // Sun gravity (uses the FIXED gravitational mass, weighted by 1-blend)
    if (gravityBlendFactor < 1 && sun) {
        const sunWeight = 1 - gravityBlendFactor;
        const effectiveGravMass = SUN_GRAVITATIONAL_MASS * sunWeight;
        for (let i = 0; i < celestialBodies.length; i++) {
            const body = celestialBodies[i];
            if (!body || body === sun || body.mass <= 0) continue;
            const dx = sun.x - body.x, dy = sun.y - body.y;
            const distSq = dx * dx + dy * dy;
            const dist = Math.sqrt(distSq + 1e-6);
            if (dist > 0) {
                const acc = G * effectiveGravMass / distSq;
                body.vx += acc * dx / dist * gameDt;
                body.vy += acc * dy / dist * gameDt;
            }
        }
    }

    // Player gravity (weighted by blend, uses crossover multiplier)
    if (gravityBlendFactor > 0 && player && player.mass > 0) {
        const playerWeight = gravityBlendFactor;
        const effectivePlayerGravMass = player.mass * GRAVITY_CROSSOVER_MULTIPLIER * playerWeight;
        for (let i = 0; i < celestialBodies.length; i++) {
            const body = celestialBodies[i];
            if (!body || body === player || body.mass <= 0 || body.isSun) continue;
            const dx = player.x - body.x, dy = player.y - body.y;
            const distSq = dx * dx + dy * dy;
            const dist = Math.sqrt(distSq + 1e-6);
            if (dist > 0) {
                const acc = G * effectivePlayerGravMass / distSq;
                body.vx += acc * dx / dist * gameDt;
                body.vy += acc * dy / dist * gameDt;
            }
        }
    }

    // Post-win: player is sole gravity source
    if (!sun && gameWon && player) {
        const gm = player.mass * GRAVITY_CROSSOVER_MULTIPLIER;
        for (let i = 0; i < celestialBodies.length; i++) {
            const body = celestialBodies[i];
            if (!body || body === player || body.mass <= 0) continue;
            const dx = player.x - body.x, dy = player.y - body.y;
            const distSq = dx * dx + dy * dy;
            const dist = Math.sqrt(distSq + 1e-6);
            if (dist > 0) {
                const acc = G * gm / distSq;
                body.vx += acc * dx / dist * gameDt;
                body.vy += acc * dy / dist * gameDt;
            }
        }
    }

    if (!sun && !player && !gameWon) {
        playerNeedsReset = true;
    }

    // --- Update Positions ---
    for (let body of celestialBodies) {
        if (!body) continue;
        const MAX_V = 15000;
        const sSq = body.vx * body.vx + body.vy * body.vy;
        if (sSq > MAX_V * MAX_V) {
            const f = MAX_V / Math.sqrt(sSq);
            body.vx *= f; body.vy *= f;
        }
        body.x += body.vx * gameDt;
        body.y += body.vy * gameDt;

        if (body.isPlayer) {
            const px = (body.x - camera.x) * camera.scale + canvas.width / 2;
            const py = (body.y - camera.y) * camera.scale + canvas.height / 2;
            body.angle = Math.atan2(screenMouseY - py, screenMouseX - px);
        }
    }

    // --- Collisions ---
    checkCollisions(dt);
    if (playerNeedsReset) { resetPlayer(); return; }

    // --- Sun Absorption ---
    checkSunAbsorption(dt);

    // --- Orbit Parameters ---
    const effectiveCenter = sun || (gameWon ? player : null);
    if (effectiveCenter) {
        const proxPlayer = celestialBodies.find(b => b.isPlayer);
        const maxDistSq = proxPlayer
            ? Math.pow(proxPlayer.radius * 1.25 * TRAIL_PROXIMITY_FACTOR, 2)
            : -1;

        for (let body of celestialBodies) {
            if (!body || body === effectiveCenter || body.isSpark || body.mass <= 0) continue;
            if (body === proxPlayer && effectiveCenter === proxPlayer) continue;

            if (body.radius * camera.scale < MIN_TRAIL_RADIUS_PX && !body.isPlayer) {
                body.trailOpacity = 0;
                continue;
            }

            const params = calculateOrbitParameters(body, effectiveCenter);
            body.orbitA = params.a;
            body.orbitB = params.b;
            body.orbitE = params.e;
            body.orbitPeriapsisAngle = params.periapsisAngle;
            body.orbitCollidesCenter = params.collidesCenter;

            if (!body.isPlayer) {
                let targetOp = 0;
                if (gravityBlendFactor > 0.5) {
                    // Player is becoming/is the gravitational center — show all trails
                    targetOp = 1;
                } else if (proxPlayer && maxDistSq > 0) {
                    const dx = body.x - proxPlayer.x, dy = body.y - proxPlayer.y;
                    if (dx*dx + dy*dy <= maxDistSq) targetOp = 1;
                }
                const rate = (targetOp > body.trailOpacity) ? TRAIL_FADE_IN_RATE : TRAIL_FADE_OUT_RATE;
                if (targetOp > body.trailOpacity) body.trailOpacity = Math.min(targetOp, body.trailOpacity + rate * dt);
                else body.trailOpacity = Math.max(targetOp, body.trailOpacity - rate * dt);
                body.trailOpacity = Math.max(0, Math.min(1, body.trailOpacity));
            }
        }
    }

    // Camera
    if (player) { camera.x = player.x; camera.y = player.y; }

    // Warning
    const tw = calculateWarningIntensity();
    currentWarningIntensity += (tw - currentWarningIntensity) * 5 * dt;
    currentWarningIntensity = Math.max(0, Math.min(1, currentWarningIntensity));

    updateOrbitHistory();
    decayEjectionMultiplier();
}

function calculateOrbitParameters(body, center) {
    if (!center || body.mass <= 0 || body.isSpark || body === center)
        return { a: 0, b: 0, e: 0, periapsisAngle: 0, collidesCenter: false };

    const rx = body.x - center.x, ry = body.y - center.y;
    const r = Math.sqrt(rx * rx + ry * ry + 1e-9);
    // When the player IS the gravitational center, treat its velocity as zero
    const cvx = (center.isPlayer && center.isGravitationalCenter) ? 0 : center.vx;
    const cvy = (center.isPlayer && center.isGravitationalCenter) ? 0 : center.vy;
    const vx = body.vx - cvx, vy = body.vy - cvy;
    const vSq = vx * vx + vy * vy;
    const rdotv = rx * vx + ry * vy;

    // Effective mu: use the blended gravitational mass
    let effectiveGravMass;
    if (center.isSun) {
        effectiveGravMass = SUN_GRAVITATIONAL_MASS * (1 - gravityBlendFactor);
        const pl = celestialBodies.find(b => b.isPlayer);
        if (pl && gravityBlendFactor > 0) {
            effectiveGravMass += pl.mass * GRAVITY_CROSSOVER_MULTIPLIER * gravityBlendFactor;
        }
    } else if (center.isPlayer && center.isGravitationalCenter) {
        effectiveGravMass = center.mass * GRAVITY_CROSSOVER_MULTIPLIER;
    } else {
        effectiveGravMass = center.mass;
    }

    const mu = G * (effectiveGravMass + body.mass);
    const E = vSq / 2 - mu / r;
    if (E >= -1e-9 || !isFinite(E))
        return { a: Infinity, b: Infinity, e: 1, periapsisAngle: 0, collidesCenter: false };

    const a = -mu / (2 * E);
    if (!isFinite(a) || a <= 0)
        return { a: Infinity, b: Infinity, e: 1, periapsisAngle: 0, collidesCenter: false };

    const h = rx * vy - ry * vx;
    const eSq = 1 + (2 * E * h * h) / (mu * mu);
    const e = eSq > 1e-9 ? Math.sqrt(eSq) : 0;
    const b = a * Math.sqrt(Math.max(0, 1 - e * e));

    const muInv = 1/mu, rInv = 1/r;
    const fac = vSq * muInv - rInv;
    const ex = fac * rx - rdotv * vx * muInv;
    const ey = fac * ry - rdotv * vy * muInv;
    const periapsisAngle = Math.atan2(ey, ex);
    const collidesCenter = a * (1 - e) <= (center.radius + body.radius);

    return { a, b, e, periapsisAngle, collidesCenter };
}
