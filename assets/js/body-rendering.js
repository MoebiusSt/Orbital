/**
 * @file body-rendering.js
 * @description Celestial body rendering: shaded bodies, player glow, color logic.
 *
 * WHAT'S HERE:
 * - drawShadedBody(sx, sy, sr, base, sunScreen) — gradient lit/dark + glow
 * - drawPlayerAbsorptionGlow(sx, sy, sr, progress) — blue aura during absorption
 * - getPlayerBaseColor() — dynamic player color (warning / absorption states)
 *
 * DEPENDENCIES: state.js, constants.js, utils.js (clamp)
 * DEPENDENTS: renderer.js (calls these to draw bodies)
 *
 * VERSION: 32
 */

function drawShadedBody(sx, sy, sr, base, sunScreen) {
    if (!sunScreen) {
        ctx.fillStyle = `rgba(${base.r},${base.g},${base.b},${base.a})`;
        ctx.beginPath();
        ctx.arc(sx, sy, sr, 0, Math.PI * 2);
        ctx.fill();
        return;
    }

    const dx = sunScreen.x - sx;
    const dy = sunScreen.y - sy;
    const dist = Math.hypot(dx, dy) || 1;
    const ux = dx / dist;
    const uy = dy / dist;

    const light = {
        r: Math.round(clamp(base.r * BODY_LIGHT_BOOST, 0, 255)),
        g: Math.round(clamp(base.g * BODY_LIGHT_BOOST, 0, 255)),
        b: Math.round(clamp(base.b * BODY_LIGHT_BOOST, 0, 255))
    };
    const dark = {
        r: Math.round(clamp(base.r * BODY_SHADOW_FACTOR, 0, 255)),
        g: Math.round(clamp(base.g * BODY_SHADOW_FACTOR, 0, 255)),
        b: Math.round(clamp(base.b * BODY_SHADOW_FACTOR, 0, 255))
    };

    const grad = ctx.createLinearGradient(
        sx + ux * sr, sy + uy * sr,
        sx - ux * sr, sy - uy * sr
    );
    grad.addColorStop(0, `rgba(${light.r},${light.g},${light.b},${base.a})`);
    grad.addColorStop(0.46, `rgba(${light.r},${light.g},${light.b},${base.a})`);
    grad.addColorStop(0.54, `rgba(${dark.r},${dark.g},${dark.b},${base.a})`);
    grad.addColorStop(1, `rgba(${dark.r},${dark.g},${dark.b},${base.a})`);

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(sx, sy, sr, 0, Math.PI * 2);
    ctx.fill();

    if (sr > 1.2) {
        const glowR = sr * 1.6;
        const gx = sx + ux * sr * 0.6;
        const gy = sy + uy * sr * 0.6;
        const glow = ctx.createRadialGradient(gx, gy, sr * 0.2, gx, gy, glowR);
        glow.addColorStop(0, `rgba(255,220,160,${BODY_LIT_GLOW_ALPHA * base.a})`);
        glow.addColorStop(1, 'rgba(255,140,60,0)');
        ctx.fillStyle = glow;
        ctx.beginPath();
        ctx.arc(gx, gy, glowR, 0, Math.PI * 2);
        ctx.fill();
    }
}

function drawPlayerAbsorptionGlow(sx, sy, sr, p) {
    const gr = sr * (1.5 + p * 1.5);
    const grd = ctx.createRadialGradient(sx, sy, sr, sx, sy, gr);
    grd.addColorStop(0, `rgba(100,180,255,${0.25 * p})`);
    grd.addColorStop(1, 'rgba(100,180,255,0)');
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(sx, sy, gr, 0, Math.PI * 2);
    ctx.fill();
}

function getPlayerBaseColor() {
    if (sunAbsorptionProgress > 0) {
        const p = sunAbsorptionProgress;
        return {
            r: Math.round(180 + 75 * (1 - p)),
            g: Math.round(220 + 35 * p),
            b: 255,
            a: 1
        };
    }
    const w = currentWarningIntensity;
    return {
        r: Math.round(255 * (1 - w * 0.35)),
        g: Math.round(255 * (1 - w)),
        b: Math.round(255 * (1 - w)),
        a: 1
    };
}
