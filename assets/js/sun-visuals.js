/**
 * @file sun-visuals.js
 * @description Sun rendering: noise textures, marble animation, surface, corona, halo, edge.
 *
 * WHAT'S HERE:
 * - initializeSunVisuals() — creates noise perm tables & textures
 * - generateSunNoiseTexture(freq, power) — per-layer noise canvas
 * - ensureSunLayerCanvas(sr) / ensureSunRenderCanvas(sr) — lazy canvas allocation
 * - drawMaskedSunNoiseLayer() — composites a noise layer into the sun disk
 * - updateSunMarbleTexture(timeMs) — animated marble veins
 * - buildSunPath() — wobbling edge path
 * - drawSunHalo() — outer glow
 * - drawSunSurface() — full sun disk composite
 * - drawSunCorona() — animated corona arcs
 *
 * DEPENDENCIES: state.js, constants.js, utils.js (clamp), noise.js
 * DEPENDENTS: renderer.js (calls draw functions)
 *
 * VERSION: 32
 */

function initializeSunVisuals() {
    sunNoisePerm = createSimplexPerm(bgSeed + 4242);
    sunEdgePerm = createSimplexPerm(bgSeed + 4517);
    sunCoronaPerm = createSimplexPerm(bgSeed + 9876);

    sunNoiseCanvas = generateSunNoiseTexture(2.0, 1.45);
    sunNoiseCtx = sunNoiseCanvas.getContext('2d');
    sunNoiseMidCanvas = generateSunNoiseTexture(4.2, 1.3);
    sunNoiseMidCtx = sunNoiseMidCanvas.getContext('2d');
    sunNoiseFineCanvas = generateSunNoiseTexture(7.8, 1.15);
    sunNoiseFineCtx = sunNoiseFineCanvas.getContext('2d');

    if (!marbleCanvas) {
        marbleCanvas = document.createElement('canvas');
        marbleCtx = marbleCanvas.getContext('2d');
    }
    marbleCanvas.width = SUN_MARBLE_SIZE;
    marbleCanvas.height = SUN_MARBLE_SIZE;
}

function generateSunNoiseTexture(freq, power) {
    const canvas = document.createElement('canvas');
    canvas.width = SUN_NOISE_TEXTURE_SIZE;
    canvas.height = SUN_NOISE_TEXTURE_SIZE;
    const nctx = canvas.getContext('2d');

    const img = nctx.createImageData(SUN_NOISE_TEXTURE_SIZE, SUN_NOISE_TEXTURE_SIZE);
    const data = img.data;
    const f = freq / SUN_NOISE_TEXTURE_SIZE;

    for (let y = 0; y < SUN_NOISE_TEXTURE_SIZE; y++) {
        for (let x = 0; x < SUN_NOISE_TEXTURE_SIZE; x++) {
            let val = fbmWithPerm(x * f, y * f, 4, 2.1, 0.5, sunNoisePerm);
            val = (val + 1) * 0.5;
            val = Math.pow(val, power);

            const heat = 0.45 + val * 0.55;
            const r = Math.round(255 * heat);
            const g = Math.round(205 * heat + 25);
            const b = Math.round(70 * heat + 15);
            const a = Math.round(40 + val * 120);

            const idx = (y * SUN_NOISE_TEXTURE_SIZE + x) * 4;
            data[idx] = r;
            data[idx + 1] = g;
            data[idx + 2] = b;
            data[idx + 3] = a;
        }
    }

    nctx.putImageData(img, 0, 0);
    return canvas;
}

function ensureSunLayerCanvas(sr) {
    const size = Math.ceil(sr * SUN_SURFACE_LAYER_SCALE * 2);
    if (!sunLayerCanvas || sunLayerCanvas.width !== size) {
        sunLayerCanvas = document.createElement('canvas');
        sunLayerCanvas.width = size;
        sunLayerCanvas.height = size;
        sunLayerCtx = sunLayerCanvas.getContext('2d');
    }
    return size;
}

function ensureSunRenderCanvas(sr) {
    const size = Math.ceil(sr * 3.4 * 2);
    if (!sunRenderCanvas || sunRenderCanvas.width !== size) {
        sunRenderCanvas = document.createElement('canvas');
        sunRenderCanvas.width = size;
        sunRenderCanvas.height = size;
        sunRenderCtx = sunRenderCanvas.getContext('2d');
    }
    return size;
}

function drawMaskedSunNoiseLayer(targetCtx, sx, sy, sr, noiseCanvas, layer) {
    if (!sunLayerCanvas || !sunLayerCtx) return;
    const size = ensureSunLayerCanvas(sr);
    const scale = size / (sr * SUN_SURFACE_LAYER_SCALE * 2);
    const innerR = sr * layer.inner * scale;
    const outerR = sr * layer.outer * scale;

    sunLayerCtx.clearRect(0, 0, size, size);
    sunLayerCtx.globalCompositeOperation = 'source-over';
    sunLayerCtx.globalAlpha = layer.alpha;
    sunLayerCtx.filter = `blur(${layer.blur || 0}px)`;
    sunLayerCtx.drawImage(noiseCanvas, 0, 0, size, size);
    sunLayerCtx.filter = 'none';

    sunLayerCtx.globalCompositeOperation = 'destination-in';
    const grad = sunLayerCtx.createRadialGradient(size / 2, size / 2, innerR, size / 2, size / 2, outerR);
    grad.addColorStop(0, 'rgba(0,0,0,1)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    sunLayerCtx.fillStyle = grad;
    sunLayerCtx.fillRect(0, 0, size, size);

    targetCtx.save();
    targetCtx.globalCompositeOperation = 'screen';
    targetCtx.drawImage(sunLayerCanvas, sx - size / 2, sy - size / 2);
    targetCtx.restore();
}

function updateSunMarbleTexture(timeMs) {
    if (!marbleCtx) return;
    const img = marbleCtx.createImageData(SUN_MARBLE_SIZE, SUN_MARBLE_SIZE);
    const data = img.data;
    const t = timeMs * SUN_MARBLE_SPEED;

    for (let y = 0; y < SUN_MARBLE_SIZE; y++) {
        for (let x = 0; x < SUN_MARBLE_SIZE; x++) {
            const nx = (x / SUN_MARBLE_SIZE) * SUN_MARBLE_FREQ;
            const ny = (y / SUN_MARBLE_SIZE) * SUN_MARBLE_FREQ;
            const n = fbmWithPerm(nx, ny, 3, 2.2, 0.5, sunEdgePerm);
            const m = Math.sin((nx + ny) * SUN_MARBLE_NOISE_FACTOR + n * SUN_MARBLE_SHARPNESS + t);
            const val = (m + 1) * 0.5;

            const r = Math.round(255 * (0.6 + val * 0.4));
            const g = Math.round(140 + val * 80);
            const b = Math.round(60 + val * 30);
            const a = Math.round(40 + val * 140);

            const idx = (y * SUN_MARBLE_SIZE + x) * 4;
            data[idx] = r;
            data[idx + 1] = g;
            data[idx + 2] = b;
            data[idx + 3] = a;
        }
    }

    marbleCtx.putImageData(img, 0, 0);
}

function buildSunPath(targetCtx, sx, sy, sr, timeMs) {
    const time = timeMs * SUN_EDGE_TIME_SPEED;
    targetCtx.beginPath();

    for (let i = 0; i <= SUN_EDGE_POINTS; i++) {
        const t = i / SUN_EDGE_POINTS;
        const a = t * Math.PI * 2;
        const nx = Math.cos(a) * SUN_EDGE_NOISE_SCALE + time * 0.2;
        const ny = Math.sin(a) * SUN_EDGE_NOISE_SCALE - time * 0.2;
        let n = simplex2DWithPerm(nx, ny, sunEdgePerm);
        n = clamp((n + 1) * 0.5, 0, 1);
        const wave = Math.sin(a * SUN_EDGE_WAVE_FREQ + time * 5.0) * SUN_EDGE_WAVE_AMPLITUDE;
        const r = sr * (1 + SUN_EDGE_AMPLITUDE * (n - 0.5) * 2 + wave);
        const px = sx + Math.cos(a) * r;
        const py = sy + Math.sin(a) * r;
        if (i === 0) targetCtx.moveTo(px, py);
        else targetCtx.lineTo(px, py);
    }

    targetCtx.closePath();
}

function drawSunHalo(targetCtx, sx, sy, sr, fadeFactor) {
    if (fadeFactor === undefined) fadeFactor = 1.0;
    if (fadeFactor <= 0) return;
    
    const haloR = sr * 4.2;
    const innerR = sr * 1.1;
    targetCtx.save();
    targetCtx.globalCompositeOperation = 'screen';
    targetCtx.globalAlpha = fadeFactor;
    
    const grad = targetCtx.createRadialGradient(sx, sy, innerR, sx, sy, haloR);
    grad.addColorStop(0, 'rgba(255,220,120,0.45)');
    grad.addColorStop(0.5, 'rgba(255,160,60,0.22)');
    grad.addColorStop(1, 'rgba(255,80,20,0)');
    targetCtx.fillStyle = grad;
    targetCtx.beginPath();
    targetCtx.arc(sx, sy, haloR, 0, Math.PI * 2);
    targetCtx.fill();
    
    const softR = sr * 7.0;
    const softGrad = targetCtx.createRadialGradient(sx, sy, haloR * 0.6, sx, sy, softR);
    softGrad.addColorStop(0, 'rgba(255,170,90,0.12)');
    softGrad.addColorStop(1, 'rgba(255,120,50,0)');
    targetCtx.fillStyle = softGrad;
    targetCtx.beginPath();
    targetCtx.arc(sx, sy, softR, 0, Math.PI * 2);
    targetCtx.fill();
    targetCtx.restore();
}

function drawSunSurface(targetCtx, sx, sy, sr, timeMs) {
    const size = ensureSunRenderCanvas(sr);
    const cx = size / 2;
    const cy = size / 2;

    sunRenderCtx.clearRect(0, 0, size, size);
    sunRenderCtx.save();
    sunRenderCtx.translate(cx - sx, cy - sy);

    buildSunPath(sunRenderCtx, sx, sy, sr, timeMs);
    sunRenderCtx.fillStyle = `rgba(${SUN_SURFACE_BASE_COLOR.r},${SUN_SURFACE_BASE_COLOR.g},${SUN_SURFACE_BASE_COLOR.b},${SUN_SURFACE_BASE_COLOR.a})`;
    sunRenderCtx.fill();

    sunRenderCtx.save();
    sunRenderCtx.clip();
    if (sunNoiseCanvas && sunNoiseMidCanvas && sunNoiseFineCanvas) {
        drawMaskedSunNoiseLayer(sunRenderCtx, sx, sy, sr, sunNoiseCanvas, SUN_SURFACE_LAYERS[0]);
        drawMaskedSunNoiseLayer(sunRenderCtx, sx, sy, sr, sunNoiseMidCanvas, SUN_SURFACE_LAYERS[1]);
        drawMaskedSunNoiseLayer(sunRenderCtx, sx, sy, sr, sunNoiseFineCanvas, SUN_SURFACE_LAYERS[2]);
    }
    sunRenderCtx.restore();

    if (marbleCanvas) {
        updateSunMarbleTexture(timeMs);
        sunRenderCtx.save();
        sunRenderCtx.globalCompositeOperation = 'screen';
        buildSunPath(sunRenderCtx, sx, sy, sr * 1.07, timeMs);
        sunRenderCtx.clip();
        sunRenderCtx.globalAlpha = 0.6;
        sunRenderCtx.filter = 'blur(1.5px)';
        sunRenderCtx.drawImage(marbleCanvas, sx - sr * 1.2, sy - sr * 1.2, sr * 2.4, sr * 2.4);
        sunRenderCtx.filter = 'none';
        sunRenderCtx.restore();
    }

    sunRenderCtx.save();
    sunRenderCtx.globalCompositeOperation = 'screen';
    sunRenderCtx.strokeStyle = 'rgba(255,160,70,0.35)';
    sunRenderCtx.lineWidth = Math.max(1.5, sr * 0.05);
    buildSunPath(sunRenderCtx, sx, sy, sr * 1.02, timeMs + 200);
    sunRenderCtx.stroke();
    sunRenderCtx.restore();

    sunRenderCtx.restore();

    targetCtx.drawImage(sunRenderCanvas, sx - cx, sy - cy);
}

function drawSunCorona(targetCtx, sx, sy, sr, timeMs) {
    if (!sunCoronaPerm) return;
    const time = timeMs * SUN_CORONA_ROT_SPEED;
    const baseR = sr * SUN_CORONA_BASE_R;
    const maxR = sr * SUN_CORONA_MAX_R;

    targetCtx.save();
    targetCtx.globalCompositeOperation = 'screen';

    for (let i = 0; i < SUN_CORONA_SEGMENTS; i++) {
        const a0 = (i / SUN_CORONA_SEGMENTS) * Math.PI * 2 + time;
        const a1 = ((i + 1) / SUN_CORONA_SEGMENTS) * Math.PI * 2 + time;
        const nx = Math.cos(a0) * SUN_CORONA_NOISE_SCALE;
        const ny = Math.sin(a0) * SUN_CORONA_NOISE_SCALE;
        let n = simplex2DWithPerm(nx + time * 0.6, ny - time * 0.6, sunCoronaPerm);
        n = clamp((n + 1) * 0.5, 0, 1);
        const flare = Math.pow(n, 2.0);
        const r = baseR + flare * (maxR - baseR);
        const thickness = sr * (0.012 + flare * 0.06);
        const alpha = 0.22 * (0.3 + flare);

        targetCtx.strokeStyle = `rgba(255,80,30,${alpha})`;
        targetCtx.lineWidth = thickness;
        targetCtx.beginPath();
        targetCtx.arc(sx, sy, r, a0, a1);
        targetCtx.stroke();
    }

    const ringR = sr * 1.6;
    const ringGrad = targetCtx.createRadialGradient(sx, sy, sr * 1.1, sx, sy, ringR);
    ringGrad.addColorStop(0, 'rgba(255,110,50,0.12)');
    ringGrad.addColorStop(1, 'rgba(255,40,10,0)');
    targetCtx.fillStyle = ringGrad;
    targetCtx.beginPath();
    targetCtx.arc(sx, sy, ringR, 0, Math.PI * 2);
    targetCtx.fill();

    targetCtx.restore();
}
