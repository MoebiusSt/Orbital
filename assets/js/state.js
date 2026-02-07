/**
 * @file state.js
 * @description All mutable global game state variables.
 *
 * WHAT'S HERE:
 * - Canvas & context references (game, corona, sun)
 * - Mouse & camera state
 * - Orbit history
 * - Ejection tracking
 * - Celestial body array
 * - Logging state
 * - Win / absorption state
 * - Flags (collision, reset)
 * - Background state (nebula, stars, drift)
 * - Sun visual canvases & permutation tables
 * - Game speed (mutable)
 *
 * PATTERN: This file only DECLARES variables. It does not import or
 * compute anything. Other modules read/write these variables directly
 * since they share a single global scope (no ES modules).
 *
 * DEPENDENCIES: None
 * DEPENDENTS: All other modules
 *
 * VERSION: 32
 */

// ── Canvas & Contexts ───────────────────────────────────────
let canvas, ctx;
let coronaCanvas, coronaCtx;
let sunCanvas, sunCtx;

// ── Mouse & Camera ──────────────────────────────────────────
let mouseX = 0, mouseY = 0;
let screenMouseX = 0, screenMouseY = 0;
let camera = { x: 0, y: 0, scale: 1 };

// ── Orbit History ───────────────────────────────────────────
let orbitHistory = [];

// ── Ejection Tracking ───────────────────────────────────────
let lastClickTime = 0;
let lastEjectionDecayTime = 0;
let currentEjectionMultiplier = 1;
let currentWarningIntensity = 0;

// ── Celestial Bodies ────────────────────────────────────────
let celestialBodies = [];

// ── Logging ─────────────────────────────────────────────────
let lastLogTime = 0;
const LOG_INTERVAL = 5000;
let bodyStates = new Map();

// ── Win / Absorption State ──────────────────────────────────
let gameWon = false;
let playerIsGravitationalCenter = false;
let sunAbsorptionProgress = 0;   // 0 to 1 (based on game-mass consumed)
let gravityBlendFactor = 0;      // 0 = sun gravity, 1 = player gravity
let sunCurrentGameMass;          // Initialized in main.js

// ── Flags ───────────────────────────────────────────────────
let collisionDetectedThisFrame = false;
let playerNeedsReset = false;

// ── Background State ────────────────────────────────────────
let nebulaCanvas = null;
let nebulaCtx = null;
let starLayers = [];
let driftLayers = [];   // "Plankton" particles in world space
let bgSeed = 0;

// ── Sun Visuals ─────────────────────────────────────────────
let sunNoiseCanvas = null;
let sunNoiseCtx = null;
let sunNoisePerm = null;
let sunNoiseMidCanvas = null;
let sunNoiseMidCtx = null;
let sunNoiseFineCanvas = null;
let sunNoiseFineCtx = null;
let sunLayerCanvas = null;
let sunLayerCtx = null;
let marbleCanvas = null;
let marbleCtx = null;
let sunRenderCanvas = null;
let sunRenderCtx = null;
let sunEdgePerm = null;
let sunCoronaPerm = null;
let sunBlurDiskEl = null;
let sunBlurCoronaEl = null;

// ── Game Speed (mutable) ────────────────────────────────────
let currentGameSpeed = BASE_GAME_SPEED;
