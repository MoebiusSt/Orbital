/**
 * @file background.js
 * @description Procedural background: nebula generation, parallax starfield, drift particles.
 *
 * WHAT'S HERE:
 * - generateNebula() — 1024px noise nebula with filaments, absorption patches, specks
 * - generateStarfield() — polar-projected stars with depth-based parallax
 * - generateDriftParticles() — "plankton" particles for motion parallax
 * - initializeBackground() — seeds & generates all background layers
 * - drawBackground(time) — renders nebula, stars, drift each frame
 *
 * RENDERING LAYERS (back to front):
 * 1. Nebula (very slow parallax, 0.002)
 * 2. Star bands (5 depth layers, radial zoom parallax)
 * 3. Drift particles (6 layers, 0.02–16.0 parallax)
 *
 * DEPENDENCIES: state.js, constants.js, noise.js (mulberry32, initSimplexPerm, fbm, simplex2D)
 * DEPENDENTS: renderer.js (calls drawBackground), main.js (calls initializeBackground)
 *
 * VERSION: 32
 */

// ── Nebula Generation ─────────────────────────────────────────
function generateNebula() {
    const SIZE = 1024;
    if (!nebulaCanvas) {
        nebulaCanvas = document.createElement('canvas');
        nebulaCtx = nebulaCanvas.getContext('2d');
    }
    nebulaCanvas.width = SIZE;
    nebulaCanvas.height = SIZE;

    const rng = mulberry32(bgSeed);
    initSimplexPerm(rng);

    // Black base
    nebulaCtx.fillStyle = '#000';
    nebulaCtx.fillRect(0, 0, SIZE, SIZE);

    // Generate 3-4 color noise layers
    const numLayers = 4 + Math.floor(rng() * 2);
    const palette = [];
    // Generate a subtle, muted color palette
    const baseHue = rng() * 360;
    for (let i = 0; i < numLayers; i++) {
        const hue = (baseHue + i * (60 + rng() * 80)) % 360;
        const sat = 22 + rng() * 45; // 22-52% saturation — muted but visible
        const lit = 1 + rng() * 20; // 10-26% lightness — dark but present
        palette.push({hue, sat, lit});
    }

    // HSL to RGB conversion (shared by all layers)
    const hslToRgb = (h, s, l) => {
        s /= 100; l /= 100;
        const c = (1 - Math.abs(2 * l - 1)) * s;
        const x = c * (1 - Math.abs((h / 60) % 2 - 1));
        const m = l - c / 2;
        let r, g, b;
        if (h < 60) { r = c; g = x; b = 0; }
        else if (h < 120) { r = x; g = c; b = 0; }
        else if (h < 180) { r = 0; g = c; b = x; }
        else if (h < 240) { r = 0; g = x; b = c; }
        else if (h < 300) { r = x; g = 0; b = c; }
        else { r = c; g = 0; b = x; }
        return [(r + m) * 255, (g + m) * 255, (b + m) * 255];
    };

    // Render each noise layer via ImageData
    for (let layerIdx = 0; layerIdx < numLayers; layerIdx++) {
        const layerCanvas = document.createElement('canvas');
        layerCanvas.width = SIZE;
        layerCanvas.height = SIZE;
        const layerCtx = layerCanvas.getContext('2d');
        const imgData = layerCtx.createImageData(SIZE, SIZE);
        const data = imgData.data;

        const freq = 0.002 + rng() * 0.005;
        const offsetX = rng() * 1000;
        const offsetY = rng() * 1000;
        const col = palette[layerIdx];

        const [lr, lg, lb] = hslToRgb(col.hue, col.sat, col.lit);

        // Use 2x downsampled noise for performance, then scale up
        const HALF = SIZE >> 1;
        const noiseMap = new Float32Array(HALF * HALF);
        for (let hy = 0; hy < HALF; hy++) {
            for (let hx = 0; hx < HALF; hx++) {
                const nx = (hx * 2) * freq + offsetX;
                const ny = (hy * 2) * freq + offsetY;
                // Use fbm for richer texture
                let val = fbm(nx, ny, 6, 4.2, 0.5);
                // Remap from [-1,1] to [0,1] with power curve for sparseness
                val = (val + 1) * 0.5;
                val = Math.pow(val, 2 + rng() * 0.9);
                noiseMap[hy * HALF + hx] = val;
            }
        }

        // Bilinear upsample to full size
        for (let py = 0; py < SIZE; py++) {
            for (let px = 0; px < SIZE; px++) {
                const hx = px * 0.5, hy = py * 0.5;
                const ix = Math.floor(hx), iy = Math.floor(hy);
                const fx = hx - ix, fy = hy - iy;
                const ix1 = Math.min(ix + 1, HALF - 1), iy1 = Math.min(iy + 1, HALF - 1);
                const v00 = noiseMap[iy * HALF + ix];
                const v10 = noiseMap[iy * HALF + ix1];
                const v01 = noiseMap[iy1 * HALF + ix];
                const v11 = noiseMap[iy1 * HALF + ix1];
                const val = v00 * (1 - fx) * (1 - fy) + v10 * fx * (1 - fy) + v01 * (1 - fx) * fy + v11 * fx * fy;

                const alpha = val * (0.4 + rng() * 0.3); // Subtle but visible
                const idx = (py * SIZE + px) * 4;
                data[idx]     = lr * alpha;
                data[idx + 1] = lg * alpha;
                data[idx + 2] = lb * alpha;
                data[idx + 3] = alpha * 255;
            }
        }

        layerCtx.putImageData(imgData, 0, 0);

        // Composite onto nebula with 'screen' blending for additive glow
        nebulaCtx.globalCompositeOperation = 'screen';
        nebulaCtx.drawImage(layerCanvas, 0, 0);
    }

    // --- Turbulente Filamente (wie in echten Nebeln) ---
    for (let f = 0; f < 8; f++) {
        const filCanvas = document.createElement('canvas');
        filCanvas.width = SIZE;
        filCanvas.height = SIZE;
        const filCtx = filCanvas.getContext('2d');
        const filData = filCtx.createImageData(SIZE, SIZE);
        
        const angle = rng() * Math.PI;
        const turb = 0.003 + rng() * 0.016;
        
        for (let y = 0; y < SIZE; y++) {
            for (let x = 0; x < SIZE; x++) {
                // Rotierte Koordinaten für Filament-Richtung
                const rx = (x - SIZE/2) * Math.cos(angle) - (y - SIZE/2) * Math.sin(angle);
                const ry = (x - SIZE/2) * Math.sin(angle) + (y - SIZE/2) * Math.cos(angle);
                
                // Turbulenz quer zur Filament-Richtung
                const n1 = fbm(rx * turb, ry * 0.02, 5, 2.5, 0.6);
                const n2 = fbm(rx * 0.01, ry * turb * 2, 3, 2.0, 0.5);
                
                // Schmales Band mit scharfen Kanten
                const dist = Math.abs(n1 * 50);
                let intensity = Math.max(0, 1 - dist / 15) * (n2 * 0.5 + 0.5);
                intensity = Math.pow(intensity, 3);  // scharfe Kanten
                
                const idx = (y * SIZE + x) * 4;
                const col = palette[Math.floor(rng() * palette.length)];
                const [r, g, b] = hslToRgb(col.hue, col.sat * 1.5, col.lit * 2);
                filData.data[idx] = r * intensity;
                filData.data[idx + 1] = g * intensity;
                filData.data[idx + 2] = b * intensity;
                filData.data[idx + 3] = intensity * 255 * 0.3;
            }
        }
        
        filCtx.putImageData(filData, 0, 0);
        nebulaCtx.globalCompositeOperation = 'screen';
        nebulaCtx.drawImage(filCanvas, 0, 0);
    }

    // --- Dunkle Absorptionsnebel (wie Hubble Horsehead etc.) ---
    nebulaCtx.globalCompositeOperation = 'multiply';  // abdunkeln statt aufhellen
    for (let i = 0; i < 3; i++) {
        const cx = rng() * SIZE;
        const cy = rng() * SIZE;
        const radius = 50 + rng() * 600;
        const grad = nebulaCtx.createRadialGradient(cx, cy, 0, cx, cy, radius);
        grad.addColorStop(0, `rgba(0,0,0,0.6)`);
        grad.addColorStop(0.7, `rgba(0,0,0,0.2)`);
        grad.addColorStop(1, `rgba(0,0,0,0)`);
        nebulaCtx.fillStyle = grad;
        nebulaCtx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);
    }

    // --- Gaussian Cloud Patches ---
    nebulaCtx.globalCompositeOperation = 'screen';
    const numClouds = 3 + Math.floor(rng() * 4);
    for (let i = 0; i < numClouds; i++) {
        const cx = rng() * SIZE;
        const cy = rng() * SIZE;
        const radius = 150 + rng() * 800;
        const hue = palette[Math.floor(rng() * palette.length)].hue;
        const alpha = 0.10 + rng() * 0.20;

        const grad = nebulaCtx.createRadialGradient(cx, cy, 0, cx, cy, radius);
        grad.addColorStop(0, `hsla(${hue}, 35%, 20%, ${alpha})`);
        grad.addColorStop(0.5, `hsla(${hue}, 30%, 14%, ${alpha * 0.4})`);
        grad.addColorStop(1, `hsla(${hue}, 20%, 5%, 0)`);
        nebulaCtx.fillStyle = grad;
        nebulaCtx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);
    }

    // --- Large Red/Crimson Nebula Patch (occasional) ---
    nebulaCtx.globalCompositeOperation = 'screen';
    const numRedClouds = 1 + Math.floor(rng() * 2); // 1-2 red nebulae
    for (let i = 0; i < numRedClouds; i++) {
        const rcx = rng() * SIZE;
        const rcy = rng() * SIZE;
        const rRadius = 250 + rng() * 450; // Large and diffuse
        const redHue = 345 + rng() * 30;   // 345-375 (wraps to 0-15) — deep red to crimson
        const rAlpha = 0.425 + rng() * 0.04;

        // Multi-stop gradient for soft, organic feel
        const rGrad = nebulaCtx.createRadialGradient(rcx, rcy, 0, rcx, rcy, rRadius);
        rGrad.addColorStop(0,   `hsla(${redHue % 360}, 45%, 18%, ${rAlpha * 1.2})`);
        rGrad.addColorStop(0.3, `hsla(${redHue % 360}, 40%, 14%, ${rAlpha})`);
        rGrad.addColorStop(0.6, `hsla(${(redHue + 10) % 360}, 35%, 10%, ${rAlpha * 0.5})`);
        rGrad.addColorStop(1,   `hsla(${(redHue + 15) % 360}, 25%, 5%, 0)`);
        nebulaCtx.fillStyle = rGrad;
        nebulaCtx.fillRect(rcx - rRadius, rcy - rRadius, rRadius * 2, rRadius * 2);

        // Overlay a noise-distorted smaller blob inside for texture
        if (rng() > 0.3) {
            const innerR = rRadius * (0.3 + rng() * 0.3);
            const innerX = rcx + (rng() - 0.5) * rRadius * 0.4;
            const innerY = rcy + (rng() - 0.5) * rRadius * 0.4;
            const iGrad = nebulaCtx.createRadialGradient(innerX, innerY, 0, innerX, innerY, innerR);
            iGrad.addColorStop(0, `hsla(${(redHue + 5) % 360}, 50%, 22%, ${rAlpha * 1.5})`);
            iGrad.addColorStop(0.5, `hsla(${redHue % 360}, 40%, 15%, ${rAlpha * 0.6})`);
            iGrad.addColorStop(1, `hsla(${redHue % 360}, 30%, 8%, 0)`);
            nebulaCtx.fillStyle = iGrad;
            nebulaCtx.fillRect(innerX - innerR, innerY - innerR, innerR * 2, innerR * 2);
        }
    }

    // --- Subtle Specks with Lens-Flare Glow ---
    nebulaCtx.globalCompositeOperation = 'screen';
    const numSpecks = 15 + Math.floor(rng() * 20);
    for (let i = 0; i < numSpecks; i++) {
        const sx = rng() * SIZE;
        const sy = rng() * SIZE;
        const coreSize = 0.5 + rng() * 1;
        const glowSize = 4 + rng() * 10;
        const brightness = 0.2 + rng() * 0.25;

        // Soft glow
        const grad = nebulaCtx.createRadialGradient(sx, sy, 0, sx, sy, glowSize);
        const warmth = rng();
        let r, g, b;
        if (warmth < 0.3) { r = 180; g = 200; b = 255; }      // Blueish
        else if (warmth < 0.6) { r = 255; g = 240; b = 220; }  // Warm white
        else { r = 255; g = 200; b = 160; }                     // Golden
        grad.addColorStop(0, `rgba(${r},${g},${b},${brightness})`);
        grad.addColorStop(0.3, `rgba(${r},${g},${b},${brightness * 0.3})`);
        grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
        nebulaCtx.fillStyle = grad;
        nebulaCtx.beginPath();
        nebulaCtx.arc(sx, sy, glowSize, 0, Math.PI * 2);
        nebulaCtx.fill();

        // Bright core
        nebulaCtx.fillStyle = `rgba(${r},${g},${b},${brightness * 1.5})`;
        nebulaCtx.beginPath();
        nebulaCtx.arc(sx, sy, coreSize, 0, Math.PI * 2);
        nebulaCtx.fill();

        // Occasional cross-flare on brighter specks
        if (brightness > 0.18 && rng() > 0.5) {
            nebulaCtx.strokeStyle = `rgba(${r},${g},${b},${brightness * 0.55})`;
            nebulaCtx.lineWidth = 0.45;
            const len = glowSize * 1.2;
            nebulaCtx.beginPath();
            nebulaCtx.moveTo(sx - len, sy); nebulaCtx.lineTo(sx + len, sy);
            nebulaCtx.moveTo(sx, sy - len); nebulaCtx.lineTo(sx, sy + len);
            nebulaCtx.stroke();
        }
    }

    nebulaCtx.globalCompositeOperation = 'source-over';
}

// ── Starfield Generation ──────────────────────────────────────
// Each star has a fixed angle + base radius from screen center, plus a depth.
// Zoom changes push stars RADIALLY (along their angle from center):
//   near stars move outward fast, far stars barely move.
// Camera.x/y movement adds a small lateral offset (near stars more).
// Result: all motion vectors point away from / toward center — no chaos.
function generateStarfield() {
    const rng = mulberry32(bgSeed + 7919);

    const bandDefs = [
        { count: 800, depth: 0.1, minSize: 1.3, maxSize: 2.8, minBright: 0.2, maxBright: 0.3  },
        { count: 250, depth: 0.15, minSize: 0.5, maxSize: 1.0, minBright: 0.05,  maxBright: 0.2 },
        { count: 150, depth: 0.2, minSize: 0.7, maxSize: 1.5, minBright: 0.05, maxBright: 0.5 },
        { count: 170,  depth: 0.25, minSize: 1.0, maxSize: 2.2, minBright: 0.7,  maxBright: 0.9 },
        { count: 130,  depth: 0.7,  minSize: 1.8, maxSize: 3.5, minBright: 0.10, maxBright: 0.4 },
    ];

    starLayers = [];
    for (const band of bandDefs) {
        const stars = [];
        for (let i = 0; i < band.count; i++) {
            const warmth = rng();
            let r, g, b;
            if (warmth < 0.2) { r = 160 + rng()*40; g = 180 + rng()*40; b = 255; }
            else if (warmth < 0.6) { r = 240 + rng()*15; g = 240 + rng()*15; b = 240 + rng()*15; }
            else if (warmth < 0.85) { r = 255; g = 220 + rng()*30; b = 180 + rng()*40; }
            else { r = 255; g = 180 + rng()*40; b = 140 + rng()*30; }

            // Fixed polar position relative to screen center
            const angle = rng() * Math.PI * 2;
            // Base radius: 0 to 1 (fraction of screen diagonal), sqrt for uniform area distribution
            const baseRadius = Math.sqrt(rng()) * 0.90;

            stars.push({
                angle,
                baseRadius,
                depth: band.depth * (0.7 + rng() * 0.6),
                baseSize: band.minSize + rng() * (band.maxSize - band.minSize),
                brightness: band.minBright + rng() * (band.maxBright - band.minBright),
                r: Math.round(r), g: Math.round(g), b: Math.round(b),
                twinklePhase: rng() * Math.PI * 2,
                twinkleSpeed: 0.5 + rng() * 2,
            });
        }
        starLayers.push({ stars, hasGlow: band.depth >= 0.3 });
    }
}

// ── Drift Particle Generation ("Plankton") ────────────────────
// These particles create the illusion of drifting through space.
// They are stored in NORMALIZED coordinates (0-1) and rendered relative to
// the screen, with parallax offset based on camera position.
// As the player moves, particles drift across the screen at different speeds
// depending on their "depth layer" — making lateral movement tangible.
function generateDriftParticles() {
    const rng = mulberry32(bgSeed + 31337);

    // Layers from furthest (small parallax) to closest to camera (large parallax)
    // parallax: how fast the layer drifts OPPOSITE to camera movement
    //   Higher = closer to camera = faster drift = "whooshing past"
    //   The feeling: tiny particles very close to your eye, drifting past as you move
    const layerDefs = [
        { count: 180, parallax: 0.02,  minSize: 1.3, maxSize: 4.0, minAlpha: 0.10, maxAlpha: 0.95 },  // Distant dust
        { count: 100,  parallax: 0.4,  minSize: 1.2, maxSize: 2.5, minAlpha: 0.3, maxAlpha: 0.9 },  // Mid-far
        { count: 30,  parallax: 1.1,  minSize: 1.4, maxSize: 4, minAlpha: 0.10, maxAlpha: 0.23 },  // Mid-far
        { count: 15,  parallax: 3.8,  minSize: 1.6, maxSize: 8.0, minAlpha: 0.1, maxAlpha: 0.17 },  // Mid
        { count: 2,  parallax: 7.0,  minSize: 2, maxSize: 20.0, minAlpha: 0.07, maxAlpha: 0.12 },  // Close
        { count: 1,  parallax: 16.0,  minSize: 2, maxSize: 42.0, minAlpha: 0.02, maxAlpha: 0.07 },  // Very close — whoosh!
    ];
    driftLayers = [];
    for (const def of layerDefs) {
        const particles = [];

        for (let i = 0; i < def.count; i++) {
            const warmth = rng();
            let r, g, b;
            // Muted, very soft colors — more "organic" than the sharp starfield
            if (warmth < 0.3) { r = 140 + rng()*40; g = 160 + rng()*40; b = 200 + rng()*55; }  // Soft blue
            else if (warmth < 0.6) { r = 200 + rng()*30; g = 200 + rng()*30; b = 210 + rng()*30; } // Pale grey-white
            else if (warmth < 0.8) { r = 200 + rng()*40; g = 180 + rng()*30; b = 150 + rng()*30; } // Warm beige
            else { r = 180 + rng()*40; g = 150 + rng()*30; b = 140 + rng()*30; }                    // Dusty rose

            particles.push({
                // Normalized position (0-1), will be scaled to screen size during rendering
                nx: rng(),
                ny: rng(),
                size: def.minSize + rng() * (def.maxSize - def.minSize),
                alpha: def.minAlpha + rng() * (def.maxAlpha - def.minAlpha),
                r: Math.round(r), g: Math.round(g), b: Math.round(b),
                // Soft pulsing (slower than star twinkle)
                pulsePhase: rng() * Math.PI * 2,
                pulseSpeed: 0.2 + rng() * 0.8,
            });
        }
        driftLayers.push({ particles, parallax: def.parallax });
    }
}

// ── Background Initialization ─────────────────────────────────
function initializeBackground() {
    bgSeed = Math.floor(Math.random() * 2147483647);
    generateNebula();
    generateStarfield();
    generateDriftParticles();
}

// ── Background Rendering ──────────────────────────────────────
function drawBackground(time) {
    // --- Nebula Layer ---
    if (nebulaCanvas) {
        const parallaxNebula = 0.002;
        const offsetX = camera.x * parallaxNebula;
        const offsetY = camera.y * parallaxNebula;
        // Subtle zoom response
        const zoomShift = (camera.scale - 1) * 0.008;
        const nebulaScale = 1 + zoomShift;

        ctx.save();
        ctx.globalAlpha = 1.0; // Full opacity — nebula itself is already subtle
        const w = canvas.width * nebulaScale;
        const h = canvas.height * nebulaScale;
        const dx = (canvas.width - w) / 2 - (offsetX % canvas.width);
        const dy = (canvas.height - h) / 2 - (offsetY % canvas.height);
        ctx.drawImage(nebulaCanvas, dx, dy, w, h);
        // Tile edges if needed for large parallax shifts
        if (dx > 0) ctx.drawImage(nebulaCanvas, dx - w, dy, w, h);
        if (dy > 0) ctx.drawImage(nebulaCanvas, dx, dy - h, w, h);
        if (dx + w < canvas.width) ctx.drawImage(nebulaCanvas, dx + w, dy, w, h);
        if (dy + h < canvas.height) ctx.drawImage(nebulaCanvas, dx, dy + h, w, h);
        ctx.restore();
    }

    // --- Starfield (polar projection, radial zoom parallax) ---
    const timeSeconds = time * 0.001;
    const cw = canvas.width, ch = canvas.height;
    const halfW = cw * 0.5, halfH = ch * 0.5;
    const screenDiag = Math.sqrt(cw * cw + ch * ch) * 0.5;

    // Zoom factor: log-based, so each scroll tick shifts by a consistent fraction.
    const zoomFactor = Math.log(camera.scale);

    for (const layer of starLayers) {
        for (const star of layer.stars) {
            const d = star.depth;

            // Base pixel radius from center
            let radius = star.baseRadius * screenDiag;

            // Radial zoom: near stars (high d) expand outward more when zooming in.
            radius *= (1 + d * zoomFactor * 0.8);

            // Clamp radius to a ring between minR and maxR.
            const minR = screenDiag * 0.04; // ~20-40px dead zone around center
            const maxR = screenDiag * 1.15;
            const range = maxR - minR;
            if (range > 0) {
                radius = ((radius - minR) % range + range) % range + minR;
            }

            // Lateral nudge from camera.x/y movement
            const latStrength = d * 0.0006;
            const latNudge = (camera.x * Math.cos(star.angle + 1.57) + camera.y * Math.sin(star.angle + 1.57)) * latStrength;
            const radNudge = (camera.x * Math.cos(star.angle) + camera.y * Math.sin(star.angle)) * latStrength * 0.5;
            radius += radNudge;

            // Final screen position
            let sx = halfW + Math.cos(star.angle) * radius + Math.cos(star.angle + 1.57) * latNudge;
            let sy = halfH + Math.sin(star.angle) * radius + Math.sin(star.angle + 1.57) * latNudge;

            // Frustum cull (with margin for glow)
            const margin = layer.hasGlow ? 20 : 8;
            if (sx < -margin || sx > cw + margin || sy < -margin || sy > ch + margin) continue;

            // Twinkle
            const twinkle = 0.75 + 0.25 * Math.sin(timeSeconds * star.twinkleSpeed + star.twinklePhase);
            const alpha = star.brightness * twinkle;
            if (alpha < 0.03) continue;

            const drawSize = star.baseSize;

            // Glow for near/large stars
            if (layer.hasGlow && drawSize > 1.5) {
                const glowRadius = drawSize * 3;
                const grad = ctx.createRadialGradient(sx, sy, 0, sx, sy, glowRadius);
                grad.addColorStop(0, `rgba(${star.r},${star.g},${star.b},${alpha * 0.5})`);
                grad.addColorStop(0.5, `rgba(${star.r},${star.g},${star.b},${alpha * 0.15})`);
                grad.addColorStop(1, `rgba(${star.r},${star.g},${star.b},0)`);
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.arc(sx, sy, glowRadius, 0, Math.PI * 2);
                ctx.fill();
            }

            // Star core
            ctx.fillStyle = `rgba(${star.r},${star.g},${star.b},${alpha})`;
            if (drawSize <= 1.2) {
                const s = Math.max(0.5, drawSize);
                ctx.fillRect(sx - s * 0.5, sy - s * 0.5, s, s);
            } else {
                ctx.beginPath();
                ctx.arc(sx, sy, drawSize * 0.5, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }

    // --- Drift Particles ("Plankton") ---
    for (const layer of driftLayers) {
        const pf = layer.parallax;

        for (const p of layer.particles) {
            // Particles drift OPPOSITE to camera movement (negative parallax)
            let sx = p.nx * cw - camera.x * pf;
            let sy = p.ny * ch - camera.y * pf;

            // Tile wrapping: keep particles on screen (seamless scrolling)
            sx = ((sx % cw) + cw) % cw;
            sy = ((sy % ch) + ch) % ch;

            // Soft pulse
            const pulse = 0.7 + 0.3 * Math.sin(timeSeconds * p.pulseSpeed + p.pulsePhase);
            const alpha = p.alpha * pulse;
            if (alpha < 0.02) continue;

            // Draw as soft blurred dot (radial gradient for softness)
            if (p.size > 1.5) {
                const glowR = p.size * 2;
                const grad = ctx.createRadialGradient(sx, sy, 0, sx, sy, glowR);
                grad.addColorStop(0, `rgba(${p.r},${p.g},${p.b},${alpha})`);
                grad.addColorStop(0.4, `rgba(${p.r},${p.g},${p.b},${alpha * 0.4})`);
                grad.addColorStop(1, `rgba(${p.r},${p.g},${p.b},0)`);
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.arc(sx, sy, glowR, 0, Math.PI * 2);
                ctx.fill();
            } else {
                // Small particles: simple soft rect
                ctx.fillStyle = `rgba(${p.r},${p.g},${p.b},${alpha})`;
                const s = Math.max(0.5, p.size);
                ctx.fillRect(sx - s * 0.5, sy - s * 0.5, s, s);
            }
        }
    }
}
