/**
 * @file noise.js
 * @description Procedural noise generation: Simplex 2D, FBM, seeded PRNG.
 *
 * WHAT'S HERE:
 * - mulberry32(seed) — seeded PRNG (Mulberry32 algorithm)
 * - Simplex 2D noise (global perm table via initSimplexPerm)
 * - simplex2D(x,y) — uses global simplexPerm
 * - fbm(x,y,octaves,lacunarity,gain) — fractal Brownian motion
 * - createSimplexPerm(seed) — creates an independent perm table
 * - simplex2DWithPerm(x,y,perm) — noise with explicit perm table
 * - fbmWithPerm(x,y,octaves,lacunarity,gain,perm)
 *
 * DESIGN: Two usage patterns exist:
 *   1. Global perm (initSimplexPerm → simplex2D/fbm) — used by background
 *   2. Per-instance perm (createSimplexPerm → simplex2DWithPerm/fbmWithPerm) — used by sun
 *
 * DEPENDENCIES: None (pure math)
 * DEPENDENTS: background.js, sun-visuals.js
 *
 * VERSION: 32
 */

// ── Seeded PRNG (Mulberry32) ────────────────────────────────
function mulberry32(seed) {
    return function () {
        seed |= 0; seed = seed + 0x6D2B79F5 | 0;
        let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
        t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
}

// ── 2D Simplex Noise ────────────────────────────────────────
const SIMPLEX_GRAD = [[1,1],[-1,1],[1,-1],[-1,-1],[1,0],[-1,0],[0,1],[0,-1]];
let simplexPerm = [];

function initSimplexPerm(rng) {
    const p = [];
    for (let i = 0; i < 256; i++) p[i] = i;
    for (let i = 255; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [p[i], p[j]] = [p[j], p[i]];
    }
    simplexPerm = new Array(512);
    for (let i = 0; i < 512; i++) simplexPerm[i] = p[i & 255];
}

function simplex2D(x, y) {
    const F2 = 0.5 * (Math.sqrt(3) - 1);
    const G2 = (3 - Math.sqrt(3)) / 6;
    const s = (x + y) * F2;
    const i = Math.floor(x + s), j = Math.floor(y + s);
    const t = (i + j) * G2;
    const x0 = x - (i - t), y0 = y - (j - t);
    const i1 = x0 > y0 ? 1 : 0, j1 = x0 > y0 ? 0 : 1;
    const x1 = x0 - i1 + G2, y1 = y0 - j1 + G2;
    const x2 = x0 - 1 + 2 * G2, y2 = y0 - 1 + 2 * G2;
    const ii = i & 255, jj = j & 255;

    function grad(hash, gx, gy) {
        const g = SIMPLEX_GRAD[hash & 7];
        return g[0] * gx + g[1] * gy;
    }

    let n0 = 0, n1 = 0, n2 = 0;
    let t0 = 0.5 - x0 * x0 - y0 * y0;
    if (t0 > 0) { t0 *= t0; n0 = t0 * t0 * grad(simplexPerm[ii + simplexPerm[jj]], x0, y0); }
    let t1 = 0.5 - x1 * x1 - y1 * y1;
    if (t1 > 0) { t1 *= t1; n1 = t1 * t1 * grad(simplexPerm[ii + i1 + simplexPerm[jj + j1]], x1, y1); }
    let t2 = 0.5 - x2 * x2 - y2 * y2;
    if (t2 > 0) { t2 *= t2; n2 = t2 * t2 * grad(simplexPerm[ii + 1 + simplexPerm[jj + 1]], x2, y2); }

    return 70 * (n0 + n1 + n2);
}

// Fractal Brownian Motion (multi-octave noise)
function fbm(x, y, octaves, lacunarity, gain) {
    let sum = 0, amp = 1, freq = 1, maxAmp = 0;
    for (let i = 0; i < octaves; i++) {
        sum += simplex2D(x * freq, y * freq) * amp;
        maxAmp += amp;
        amp *= gain;
        freq *= lacunarity;
    }
    return sum / maxAmp;
}

// ── Independent Simplex (for sun visuals etc.) ──────────────
function createSimplexPerm(seed) {
    const rng = mulberry32(seed);
    const p = [];
    for (let i = 0; i < 256; i++) p[i] = i;
    for (let i = 255; i > 0; i--) {
        const j = Math.floor(rng() * (i + 1));
        [p[i], p[j]] = [p[j], p[i]];
    }
    const perm = new Array(512);
    for (let i = 0; i < 512; i++) perm[i] = p[i & 255];
    return perm;
}

function simplex2DWithPerm(x, y, perm) {
    const F2 = 0.5 * (Math.sqrt(3) - 1);
    const G2 = (3 - Math.sqrt(3)) / 6;
    const s = (x + y) * F2;
    const i = Math.floor(x + s), j = Math.floor(y + s);
    const t = (i + j) * G2;
    const x0 = x - (i - t), y0 = y - (j - t);
    const i1 = x0 > y0 ? 1 : 0, j1 = x0 > y0 ? 0 : 1;
    const x1 = x0 - i1 + G2, y1 = y0 - j1 + G2;
    const x2 = x0 - 1 + 2 * G2, y2 = y0 - 1 + 2 * G2;
    const ii = i & 255, jj = j & 255;

    function grad(hash, gx, gy) {
        const g = SIMPLEX_GRAD[hash & 7];
        return g[0] * gx + g[1] * gy;
    }

    let n0 = 0, n1 = 0, n2 = 0;
    let t0 = 0.5 - x0 * x0 - y0 * y0;
    if (t0 > 0) { t0 *= t0; n0 = t0 * t0 * grad(perm[ii + perm[jj]], x0, y0); }
    let t1 = 0.5 - x1 * x1 - y1 * y1;
    if (t1 > 0) { t1 *= t1; n1 = t1 * t1 * grad(perm[ii + i1 + perm[jj + j1]], x1, y1); }
    let t2 = 0.5 - x2 * x2 - y2 * y2;
    if (t2 > 0) { t2 *= t2; n2 = t2 * t2 * grad(perm[ii + 1 + perm[jj + 1]], x2, y2); }

    return 70 * (n0 + n1 + n2);
}

function fbmWithPerm(x, y, octaves, lacunarity, gain, perm) {
    let sum = 0, amp = 1, freq = 1, maxAmp = 0;
    for (let i = 0; i < octaves; i++) {
        sum += simplex2DWithPerm(x * freq, y * freq, perm) * amp;
        maxAmp += amp;
        amp *= gain;
        freq *= lacunarity;
    }
    return sum / maxAmp;
}
