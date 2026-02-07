/**
 * @file population.js
 * @description System population: spawns initial orbital bodies around the center.
 *
 * WHAT'S HERE:
 * - populateSystem(numMasses) — creates N bodies in stable orbits around the
 *   gravitational center, with mass distribution (70% small, 20% medium, 10% large)
 *
 * ORBITAL SPEED CALCULATION:
 * Uses GRAVITATIONAL mass (not game mass) for orbital velocity: v = sqrt(G*M/r)
 * This keeps orbits realistic regardless of game-mass mechanics.
 *
 * DEPENDENCIES: state.js (celestialBodies), constants.js (G, SUN_GRAVITATIONAL_MASS,
 *               GRAVITY_CROSSOVER_MULTIPLIER, PLAYER_INITIAL_MASS, MIN_BODY_MASS),
 *               celestial-body.js (CelestialBody class)
 * DEPENDENTS: main.js (initial population), game-state.js (reset population)
 *
 * VERSION: 32
 */

function populateSystem(numMasses) {
    const centerBody = celestialBodies.find(b => b.isGravitationalCenter);
    if (!centerBody) { console.error("No gravitational center."); return; }

    let largerCount = 0;
    for (let i = 0; i < numMasses; i++) {
        const angle = Math.random() * Math.PI * 2;
        const baseDist = Math.max(centerBody.radius, SUN_DISPLAY_RADIUS);
        const distance = baseDist * 3.5 + Math.random() * baseDist * 15;
        const x = centerBody.x + Math.cos(angle) * distance;
        const y = centerBody.y + Math.sin(angle) * distance;

        // Orbital speed always based on GRAVITATIONAL mass
        const gravMass = centerBody.isSun ? SUN_GRAVITATIONAL_MASS : centerBody.mass * GRAVITY_CROSSOVER_MULTIPLIER;
        const orbitalSpeed = Math.sqrt((G * gravMass) / Math.max(1, distance));
        const sf = 0.9 + Math.random() * 0.2;
        const vx = centerBody.vx - Math.sin(angle) * orbitalSpeed * sf;
        const vy = centerBody.vy + Math.cos(angle) * orbitalSpeed * sf;

        const rand = Math.random();
        let mass;
        if (rand < 0.7) mass = PLAYER_INITIAL_MASS * (0.02 + Math.random() * 0.2);
        else if (rand < 0.9) mass = PLAYER_INITIAL_MASS * (0.4 + Math.random() * 0.5);
        else { mass = PLAYER_INITIAL_MASS * (1.1 + Math.random() * 1.4); largerCount++; }
        mass = Math.max(MIN_BODY_MASS, mass);

        celestialBodies.push(new CelestialBody(x, y, vx, vy, mass));
    }
    console.log(`Populated ${numMasses} bodies (${largerCount} larger than player).`);
}
