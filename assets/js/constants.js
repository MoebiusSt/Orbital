/**
 * @file constants.js
 * @description All game constants and configuration values.
 *
 * WHAT'S HERE:
 * - Player dimensions & density
 * - Sun mass system (gravitational vs game mass — KEY DESIGN, read comments!)
 * - Sun visual parameters (noise, marble, edge, corona, blur)
 * - Planet shading constants
 * - Body/trail thresholds
 * - Ejection parameters
 * - Collision parameters
 * - Sun absorption parameters
 * - Spark parameters
 * - Game speed settings
 * - Trail fading settings
 * - HUD/UI constants (crosshair, orbit history)
 *
 * DEPENDENCIES: utils.js (calculateMassFromRadius)
 * DEPENDENTS: Nearly every other module reads from here.
 *
 * VERSION: 32 (first modular version)
 */

// ── Player ──────────────────────────────────────────────────
const PLAYER_RADIUS = 30;
const DENSITY = 1000;

// ── Mass System (KEY DESIGN) ────────────────────────────────
// The sun has TWO separate mass concepts:
//
// 1) GRAVITATIONAL MASS: Huge (1e20), used ONLY for gravity calculation.
//    This stays constant and keeps all orbits at the right speed.
//    It is NOT something the player "consumes" or competes against.
//
// 2) GAME MASS: Reachable (~3e10), determines win-condition, visual size,
//    and what % the HUD shows. When the player's mass exceeds this,
//    they can absorb the sun.
//
// The gravity felt by all bodies is:  G * SUN_GRAVITATIONAL_MASS
// But the "progress" shown is:        player.mass / SUN_GAME_MASS
//
// During absorption, the GRAVITATIONAL pull of the sun fades out via
// gravityBlendFactor, while the player's pull fades in, keeping orbits stable.

const SUN_GRAVITATIONAL_MASS = 1e20;  // Only for F = G*m1*m2/r² — never shown, never consumed
const G = 6.67430e-11 * 0.1;

// PLAYER_INITIAL_MASS is computed after utils.js loads (see main.js)
// We declare it as let so main.js can assign it.
let PLAYER_INITIAL_MASS;
let MIN_PLAYER_MASS;
let SUN_GAME_MASS;
let GRAVITY_CROSSOVER_MULTIPLIER;

function initDerivedConstants() {
    PLAYER_INITIAL_MASS = calculateMassFromRadius(PLAYER_RADIUS);
    MIN_PLAYER_MASS = PLAYER_INITIAL_MASS * 0.1;

    // Game mass: set so that eating all ~400 bodies (avg ~0.3 * player mass each)
    // gets you to about 60-70% of this value. Total eatable mass ≈ 1.37e10.
    // So SUN_GAME_MASS ≈ 2e10 means eating everything gets you ~68%.
    SUN_GAME_MASS = PLAYER_INITIAL_MASS * 180;

    // For gravity during crossover: when sun loses game-mass, its gravitational
    // contribution fades and player's grows.
    GRAVITY_CROSSOVER_MULTIPLIER = SUN_GRAVITATIONAL_MASS / SUN_GAME_MASS;
}

// ── Sun Display ─────────────────────────────────────────────
const SUN_DISPLAY_RADIUS = 120;

// Sun visuals
const SUN_NOISE_TEXTURE_SIZE = 256;
const SUN_SURFACE_LAYER_SCALE = 1.4;
const SUN_SURFACE_BASE_COLOR = { r: 252, g: 206, b: 96, a: 1 };
const SUN_SURFACE_LAYERS = [
    { freq: 2.0, power: 1.45, alpha: 0.45, inner: 0.0, outer: 0.65, blur: 0.8 },
    { freq: 4.2, power: 1.30, alpha: 0.38, inner: 0.2, outer: 0.9, blur: 2.0 },
    { freq: 7.8, power: 1.15, alpha: 0.32, inner: 0.45, outer: 1.08, blur: 1.2 }
];

const SUN_EDGE_POINTS = 100;
const SUN_EDGE_NOISE_SCALE = 8.4;
const SUN_EDGE_AMPLITUDE = 0.015;
const SUN_EDGE_WAVE_AMPLITUDE = 0.005;
const SUN_EDGE_WAVE_FREQ = 5.5;
const SUN_EDGE_TIME_SPEED = 0.00035;

const SUN_CORONA_SEGMENTS = 240;
const SUN_CORONA_ROT_SPEED = 0.00012;
const SUN_CORONA_NOISE_SCALE = 1.2;
const SUN_CORONA_BASE_R = 0.70;
const SUN_CORONA_MAX_R = 1.4;

const SUN_MARBLE_SIZE = 156;
const SUN_MARBLE_FREQ = 8.5;
const SUN_MARBLE_NOISE_FACTOR = 3.0;
const SUN_MARBLE_SHARPNESS = 7.8;
const SUN_MARBLE_SPEED = 0.0016;

const SUN_BLUR_DISK_SCALE = 1.53;
const SUN_BLUR_CORONA_SCALE = 2.24;

// ── Planet Shading ──────────────────────────────────────────
const BODY_LIGHT_BOOST = 1.12;
const BODY_SHADOW_FACTOR = 0.01;
const BODY_LIT_GLOW_ALPHA = 0.18;

// ── Body Count & Orbit ──────────────────────────────────────
const INIT_NUM_BODIES = 400;
const CROSSHAIR_SIZE = 40;
const CROSSHAIR_LONG_LINE = 25;
const ORBIT_HISTORY_LENGTH = 90;

// ── Minimum Mass Thresholds ─────────────────────────────────
// MIN_BODY_MASS is derived — initialized in initDerivedConstants
let MIN_BODY_MASS;
const MIN_TRAIL_RADIUS_PX = 1.5;

function initBodyMassConstant() {
    MIN_BODY_MASS = PLAYER_INITIAL_MASS * 0.005;
}

// ── Ejection ────────────────────────────────────────────────
const BASE_EJECTION_MASS_PERCENT = 0.0005;
const MAX_EJECTION_MULTIPLIER = 85;
const EJECTION_GROWTH_RATE = 3;
const QUICK_CLICK_THRESHOLD = 260;
const MAX_EJECTION_PERCENTAGE = 0.5;
const EJECTION_BASE_SPEED = 1200;
const EJECTION_PROPULSION_MULTIPLIER = 45;
const EJECTION_DECAY_RATE = 0.97;
const EJECTION_DECAY_INTERVAL = 300;

// ── Collision ───────────────────────────────────────────────
const MASS_TRANSFER_PERCENT_PER_SEC = 4.0;
const EJECTION_COLLISION_DELAY = 300;

// ── Sun Absorption ──────────────────────────────────────────
const SUN_ABSORPTION_RATE = 1.5;
const SUN_ABSORPTION_START_RATIO = 0.4;
const SUN_ABSORPTION_RANGE_MULTIPLIER = 2.5;

// ── Sparks ──────────────────────────────────────────────────
const MIN_SPARKS = 2;
const MAX_SPARKS = 20;
let SPARK_MASS;
function initSparkMass() { SPARK_MASS = PLAYER_INITIAL_MASS * 0.00001; }
const MIN_SPARK_SPEED_MULTIPLIER = 0.8;
const MAX_SPARK_SPEED_MULTIPLIER = 2.2;
const SPARK_SPEED_RANDOMNESS = 0.2;
const MAX_SPARK_SPREAD_ANGLE = Math.PI / 6;
const MIN_SPARK_SPREAD_ANGLE = Math.PI / 18;
const SPARK_LIFESPAN = 1600;
const SPARK_MIN_DRAW_RADIUS = 0.8;

// ── Game Speed ──────────────────────────────────────────────
const BASE_GAME_SPEED = 0.1;
const FAST_GAME_SPEED = 1.0;

// ── Trail Fading ────────────────────────────────────────────
const TRAIL_FADE_IN_RATE = 0.6;
const TRAIL_FADE_OUT_RATE = 0.4;
const TRAIL_PROXIMITY_FACTOR = 5.2;
