/**
 * @file celestial-body.js
 * @description CelestialBody class — the core entity for all game objects.
 *
 * WHAT'S HERE:
 * - CelestialBody class with position, velocity, mass, radius, flags
 * - Radius auto-calculation from mass (volume-based sphere)
 * - Sun radius scales with game-mass fraction
 * - Orbit parameter storage (a, b, e, periapsisAngle, collidesCenter)
 * - Trail opacity for proximity-based fade
 *
 * DEPENDENCIES: state.js (sunCurrentGameMass), constants.js (SUN_GAME_MASS),
 *               utils.js (calculateRadiusFromMass, getSunDisplayRadius)
 * DEPENDENTS: main.js, physics.js, collision.js, renderer.js, ejection.js
 *
 * VERSION: 32
 */

class CelestialBody {
    constructor(x, y, vx, vy, mass, isPlayer = false, isSun = false, isSpark = false) {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this._mass = mass;
        this.isPlayer = isPlayer;
        this.isSun = isSun;
        this.isSpark = isSpark;
        this.isGravitationalCenter = isSun;
        this.creationTime = Date.now();
        this.angle = 0;
        this._radius = this._calculateRadius(mass);
        this.id = (isPlayer ? 'P' : isSun ? 'S' : isSpark ? 'K' : 'M')
                  + this.creationTime.toString(36)
                  + Math.random().toString(36).substring(2, 8);

        this.orbitA = 0;
        this.orbitB = 0;
        this.orbitE = 0;
        this.orbitPeriapsisAngle = 0;
        this.orbitCollidesCenter = false;
        this.trailOpacity = 0;
    }

    _calculateRadius(mass) {
        if (this.isSun) {
            // Sun radius is based on game-mass fraction, not actual mass
            const fraction = sunCurrentGameMass / SUN_GAME_MASS;
            return getSunDisplayRadius(fraction);
        }
        return calculateRadiusFromMass(mass);
    }

    get mass() { return this._mass; }

    set mass(newMass) {
        this._mass = Math.max(0, newMass);
        this._radius = this._calculateRadius(this._mass);
        if (this._mass < 1e-9 && !this.isSun && !this.isPlayer) {
            this._radius = 0.1;
        }
    }

    get radius() {
        if (this.isSun) {
            const fraction = sunCurrentGameMass / SUN_GAME_MASS;
            return Math.max(1, getSunDisplayRadius(fraction));
        }
        return Math.max(0.5, this._radius);
    }
}
