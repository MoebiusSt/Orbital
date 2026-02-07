/**
 * @file utils.js
 * @description Pure utility/math functions with no side effects.
 *
 * WHAT'S HERE:
 * - calculateRadiusFromMass(mass)  — volume-based sphere radius
 * - calculateMassFromRadius(radius) — inverse of above
 * - clamp(value, min, max)
 * - getSunDisplayRadius(gameMassFraction) — cube-root visual scaling
 *
 * DEPENDENCIES: constants.js (DENSITY, SUN_DISPLAY_RADIUS)
 * DEPENDENTS: constants.js (derived constants), celestial-body.js, ejection.js,
 *             physics.js, renderer.js, sun-visuals.js
 *
 * VERSION: 32
 */

function calculateRadiusFromMass(mass) {
    if (mass <= 0) return 0.1;
    const volume = mass / DENSITY;
    return Math.cbrt((3 * volume) / (4 * Math.PI));
}

function calculateMassFromRadius(radius) {
    return (4 / 3) * Math.PI * Math.pow(Math.max(0.1, radius), 3) * DENSITY;
}

function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
}

// Sun display radius scales with its remaining GAME mass (not gravitational mass)
function getSunDisplayRadius(gameMassFraction) {
    // gameMassFraction: 0 (absorbed) to 1 (full)
    // Cube root scaling so it shrinks visibly but not too fast
    return SUN_DISPLAY_RADIUS * Math.cbrt(Math.max(0, gameMassFraction));
}
