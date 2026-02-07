/**
 * @file collision.js
 * @description Collision detection and mass transfer between bodies.
 *
 * WHAT'S HERE:
 * - checkCollisions(dt) — iterates all body pairs, handles mass transfer/absorption
 *
 * COLLISION RULES:
 * - Bigger body absorbs smaller (partial mass transfer per second)
 * - Recently ejected bodies have collision immunity (EJECTION_COLLISION_DELAY)
 * - Sparks are absorbed instantly but don't collide with each other
 * - Player-Sun collisions handled separately (see absorption.js)
 *
 * DEPENDENCIES: state.js (celestialBodies, playerNeedsReset), constants.js
 * DEPENDENTS: physics.js (calls checkCollisions each tick)
 *
 * VERSION: 32
 */

function checkCollisions(dt) {
    const now = Date.now();
    for (let i = celestialBodies.length - 1; i >= 0; i--) {
        const b1 = celestialBodies[i];
        if (!b1) continue;
        for (let j = i - 1; j >= 0; j--) {
            const b2 = celestialBodies[j];
            if (!b2) continue;

            const age1 = now - b1.creationTime, age2 = now - b2.creationTime;
            const n1 = !b1.isSpark && !b1.isSun && !b1.isPlayer && age1 < EJECTION_COLLISION_DELAY;
            const n2 = !b2.isSpark && !b2.isSun && !b2.isPlayer && age2 < EJECTION_COLLISION_DELAY;

            if ((b1.isPlayer && b2.isSpark) || (b2.isPlayer && b1.isSpark)) continue;
            if (b1.isSpark && b2.isSpark) continue;
            if ((b1.isPlayer && n2) || (b2.isPlayer && n1)) continue;
            if ((b1.isSpark && n2) || (b2.isSpark && n1)) continue;
            if (n1 && n2) continue;
            if ((b1.isSpark && !b2.isSpark && !b2.isPlayer && !b2.isGravitationalCenter) ||
                (b2.isSpark && !b1.isSpark && !b1.isPlayer && !b1.isGravitationalCenter)) continue;
            if ((b1.isPlayer && b2.isSun) || (b2.isPlayer && b1.isSun)) continue;

            const dx = b2.x - b1.x, dy = b2.y - b1.y;
            const distSq = dx * dx + dy * dy;
            const cr = b1.radius + b2.radius;
            if (distSq >= cr * cr) continue;

            collisionDetectedThisFrame = true;
            let big, small, bigI, smallI;
            if (b1.mass >= b2.mass) { big = b1; bigI = i; small = b2; smallI = j; }
            else { big = b2; bigI = j; small = b1; smallI = i; }

            if (small.isGravitationalCenter || big.isSpark) continue;

            let transfer = small.isSpark ? small.mass
                : Math.min(small.mass, small.mass * MASS_TRANSFER_PERCENT_PER_SEC * dt);
            transfer = Math.max(0, transfer);

            if (big.isPlayer && transfer > 0) {
                const total = big.mass + transfer;
                if (total > 1e-9) {
                    big.vx = (big.mass * big.vx + transfer * small.vx) / total;
                    big.vy = (big.mass * big.vy + transfer * small.vy) / total;
                }
            }

            big.mass += transfer;
            small.mass -= transfer;

            if (small.isPlayer && small.mass < MIN_PLAYER_MASS) { playerNeedsReset = true; return; }

            if (small.mass <= MIN_BODY_MASS || (small.isSpark && transfer >= small.mass * 0.99)) {
                small.trailOpacity = 0;
                celestialBodies.splice(smallI, 1);
                if (bigI > smallI) bigI--;
                i = bigI;
                break;
            }
        }
        if (playerNeedsReset) return;
    }
}
