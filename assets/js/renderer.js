/**
 * @file renderer.js
 * @description Main rendering: draw(), HUD, crosshair, orbit trails, ellipse helpers.
 *
 * WHAT'S HERE:
 * - draw() — main render function called each frame
 * - drawEllipse() — draws orbit ellipse with camera transform
 * - drawCrosshair() — aiming crosshair at mouse position
 * - drawOrbitHistory() — player's past orbit trail
 * - logBodyChanges() — periodic debug logging
 *
 * RENDER ORDER:
 * 1. Background (nebula, stars, drift) on coronaCanvas
 * 2. Clear gameCanvas
 * 3. Orbit history (player trail)
 * 4. Mass orbit trails (nearby bodies)
 * 5. Bodies (sun → masses → sparks → player)
 * 6. UI: crosshair, warnings, HUD
 *
 * DEPENDENCIES: state.js, constants.js, background.js, sun-visuals.js,
 *               body-rendering.js, utils.js (clamp, getSunDisplayRadius)
 * DEPENDENTS: main.js (game loop calls draw)
 *
 * VERSION: 32
 */

function drawEllipse(ctx, cx, cy, a, b, e, pa) {
    if (!isFinite(a) || !isFinite(b) || a <= 0 || b <= 0 || !isFinite(e) || !isFinite(pa)) return false;
    ctx.save();
    const sx = (cx - camera.x) * camera.scale + canvas.width / 2;
    const sy = (cy - camera.y) * camera.scale + canvas.height / 2;
    ctx.translate(sx, sy); ctx.rotate(pa);
    const sa = a * camera.scale, sb = b * camera.scale, sf = sa * e;
    const maxD = Math.max(canvas.width, canvas.height) * 15;
    if (sa > maxD || sb > maxD || sa < 0.1 || sb < 0.1) { ctx.restore(); return false; }
    ctx.beginPath();
    try { ctx.ellipse(-sf, 0, sa, sb, 0, 0, 2 * Math.PI); }
    catch(err) { ctx.restore(); return false; }
    ctx.restore();
    return true;
}

function drawCrosshair() {
    const player = celestialBodies.find(b => b.isPlayer);
    if (!player) return;
    const px = (player.x - camera.x) * camera.scale + canvas.width / 2;
    const py = (player.y - camera.y) * camera.scale + canvas.height / 2;
    const ang = Math.atan2(screenMouseY - py, screenMouseX - px);
    ctx.save();
    ctx.translate(screenMouseX, screenMouseY);
    ctx.rotate(ang + Math.PI / 2);
    ctx.lineWidth = 2;
    for (let i = 0; i < 4; i++) {
        ctx.rotate(Math.PI / 2);
        ctx.beginPath(); ctx.moveTo(5, 0);
        const len = (i === 0) ? CROSSHAIR_LONG_LINE : CROSSHAIR_SIZE / 2.5;
        const g = ctx.createLinearGradient(5, 0, len, 0);
        g.addColorStop(0, 'rgba(255,255,255,1)');
        g.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.strokeStyle = g;
        ctx.lineTo(len, 0); ctx.stroke();
    }
    ctx.restore();
}

function drawOrbitHistory() {
    const sun = celestialBodies.find(b => b.isSun);
    const center = sun || (gameWon ? celestialBodies.find(b => b.isPlayer && b.isGravitationalCenter) : null);
    if (!center || orbitHistory.length === 0) return;

    ctx.save(); ctx.lineWidth = 1;
    orbitHistory.forEach((o, idx) => {
        if (!o || !isFinite(o.a) || o.a <= 0 || !isFinite(o.b) || o.b <= 0) return;
        const alpha = 0.1 * (ORBIT_HISTORY_LENGTH - idx) / ORBIT_HISTORY_LENGTH;
        let color;
        if (o.absorbing) {
            const p = o.absorptionProgress || 0;
            color = `rgba(${Math.round(50*(1-p))}, ${Math.round(150+105*p)}, 255, ${alpha*(1+p)})`;
        } else if (o.collidesCenter) {
            color = `rgba(255, 0, 0, ${alpha})`;
        } else {
            color = `rgba(173, 216, 230, ${alpha})`;
        }
        if (drawEllipse(ctx, center.x, center.y, o.a, o.b, o.e, o.periapsisAngle)) {
            ctx.strokeStyle = color;
            ctx.stroke();
        }
    });
    ctx.restore();
}

function draw() {
    const frameTime = performance.now();
    if (coronaCtx) {
        coronaCtx.fillStyle = 'black';
        coronaCtx.fillRect(0, 0, coronaCanvas.width, coronaCanvas.height);
        const mainCtx = ctx;
        ctx = coronaCtx;
        drawBackground(frameTime);
        ctx = mainCtx;
    } else {
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        drawBackground(frameTime);
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (sunCtx) {
        sunCtx.clearRect(0, 0, sunCanvas.width, sunCanvas.height);
    }

    drawOrbitHistory();

    // Mass orbit trails
    ctx.save(); ctx.lineWidth = 1.5;
    const sun = celestialBodies.find(b => b.isSun);
    const tc = sun || (gameWon ? celestialBodies.find(b => b.isGravitationalCenter) : null);
    if (tc) {
        for (const body of celestialBodies) {
            if (!body || body.isPlayer || body.isSpark || body === tc || body.mass < MIN_BODY_MASS
                || body.trailOpacity <= 0 || !isFinite(body.orbitA) || body.orbitA <= 0
                || !isFinite(body.orbitB) || body.orbitB <= 0) continue;
            if (body.orbitA * camera.scale < 1 || body.orbitB * camera.scale < 1) continue;
            ctx.strokeStyle = `rgba(100,100,100,${0.38 * body.trailOpacity})`;
            if (drawEllipse(ctx, tc.x, tc.y, body.orbitA, body.orbitB, body.orbitE, body.orbitPeriapsisAngle))
                ctx.stroke();
        }
    }
    ctx.restore();

    // Bodies
    const valid = celestialBodies.filter(b => b && (b.mass > MIN_BODY_MASS || b.isPlayer || b.isSun || b.isSpark));
    valid.sort((a, b) => {
        if (a.isGravitationalCenter) return -1;
        if (b.isGravitationalCenter) return 1;
        if (a.isPlayer) return 1;
        if (b.isPlayer) return -1;
        return a.mass - b.mass;
    });

    const now = Date.now();
    const sunScreen = sun ? {
        x: (sun.x - camera.x) * camera.scale + canvas.width / 2,
        y: (sun.y - camera.y) * camera.scale + canvas.height / 2
    } : null;

    if (sunBlurDiskEl && sunBlurCoronaEl) {
        if (sunScreen) {
            const srScreen = sun.radius * camera.scale;
            const diskSize = srScreen * 2 * SUN_BLUR_DISK_SCALE;
            const coronaSize = srScreen * 2 * SUN_BLUR_CORONA_SCALE;

            sunBlurDiskEl.style.left = `${sunScreen.x}px`;
            sunBlurDiskEl.style.top = `${sunScreen.y}px`;
            sunBlurCoronaEl.style.left = `${sunScreen.x}px`;
            sunBlurCoronaEl.style.top = `${sunScreen.y}px`;
            sunBlurDiskEl.style.width = `${diskSize}px`;
            sunBlurDiskEl.style.height = `${diskSize}px`;
            sunBlurDiskEl.style.marginLeft = `${-diskSize / 2}px`;
            sunBlurDiskEl.style.marginTop = `${-diskSize / 2}px`;
            sunBlurCoronaEl.style.width = `${coronaSize}px`;
            sunBlurCoronaEl.style.height = `${coronaSize}px`;
            sunBlurCoronaEl.style.marginLeft = `${-coronaSize / 2}px`;
            sunBlurCoronaEl.style.marginTop = `${-coronaSize / 2}px`;
            sunBlurDiskEl.style.display = 'block';
            sunBlurCoronaEl.style.display = 'block';
        } else {
            sunBlurDiskEl.style.display = 'none';
            sunBlurCoronaEl.style.display = 'none';
        }
    }

    for (const body of valid) {
        const sx = (body.x - camera.x) * camera.scale + canvas.width / 2;
        const sy = (body.y - camera.y) * camera.scale + canvas.height / 2;
        let sr = body.radius * camera.scale;
        
        // Special handling for sun: check extended halo radius for culling
        if (body.isSun) {
            const haloRadius = sr * 7.0;
            const fadeMargin = sr * 3.0;
            
            const distToLeft = sx + haloRadius;
            const distToRight = canvas.width - sx + haloRadius;
            const distToTop = sy + haloRadius;
            const distToBottom = canvas.height - sy + haloRadius;
            const minDist = Math.min(distToLeft, distToRight, distToTop, distToBottom);
            
            let fadeFactor = 1.0;
            if (minDist < haloRadius) {
                const fadeStart = haloRadius;
                const fadeEnd = haloRadius - fadeMargin;
                fadeFactor = clamp((minDist - fadeEnd) / (fadeStart - fadeEnd), 0, 1);
                fadeFactor = fadeFactor * fadeFactor * (3 - 2 * fadeFactor);
            }
            
            if (fadeFactor <= 0.001) continue;
            
            sr = Math.max(0.5, sr);
            
            if (coronaCtx) {
                drawSunHalo(coronaCtx, sx, sy, sr, fadeFactor);
                drawSunCorona(coronaCtx, sx, sy, sr, frameTime);
            }
            if (sunCtx) {
                drawSunSurface(sunCtx, sx, sy, sr, frameTime);
            }
            continue;
        }
        
        // Normal frustum culling for other bodies
        if (sx + sr*2 < 0 || sx - sr*2 > canvas.width || sy + sr*2 < 0 || sy - sr*2 > canvas.height) continue;
        sr = body.isSpark ? Math.max(SPARK_MIN_DRAW_RADIUS, sr) : Math.max(0.5, sr);

        if (body.isSpark) {
            const f = Math.min(1, Math.max(0, (now - body.creationTime) / SPARK_LIFESPAN));
            const a = 1 - f*f;
            let r=255, g=255, b=255;
            if (f < 0.25) b = Math.round(255*(1-f/0.25));
            else if (f < 0.5) { b=0; g = Math.round(255-90*((f-0.25)/0.25)); }
            else if (f < 0.75) { b=0; g = Math.round(165*(1-(f-0.5)/0.25)); }
            else { b=0; g=0; r = Math.round(255-116*((f-0.75)/0.25)); }
            ctx.fillStyle = `rgba(${r},${g},${b},${a})`;
            ctx.beginPath();
            ctx.arc(sx, sy, sr, 0, Math.PI*2);
            ctx.fill();
            continue;
        }

        if (body.isPlayer && sunAbsorptionProgress > 0) {
            drawPlayerAbsorptionGlow(sx, sy, sr, sunAbsorptionProgress);
        }

        const base = body.isPlayer
            ? getPlayerBaseColor()
            : { r: 255, g: 255, b: 255, a: 0.6 };
        drawShadedBody(sx, sy, sr, base, sunScreen);

        // Player direction
        if (body.isPlayer) {
            ctx.strokeStyle = sunAbsorptionProgress > 0 ? 'rgba(100,200,255,0.8)'
                            : body.isGravitationalCenter ? 'gold' : 'red';
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(sx, sy);
            ctx.lineTo(sx + Math.cos(body.angle)*sr*1.4, sy + Math.sin(body.angle)*sr*1.4);
            ctx.stroke();
        }
    }

    // UI
    drawCrosshair();

    // Warning
    if (currentWarningIntensity > 0.75 && !gameWon && sunAbsorptionProgress <= 0) {
        ctx.fillStyle = `rgba(255,0,0,${currentWarningIntensity})`;
        ctx.font = '24px Arial'; ctx.textAlign = 'center';
        ctx.fillText('KRITISCHE MASSE!', canvas.width/2, 30);
    }

    // Absorption UI
    if (sunAbsorptionProgress > 0 && !gameWon) {
        const pulse = 0.7 + 0.3 * Math.sin(now/400);
        ctx.fillStyle = `rgba(100,200,255,${pulse*0.8})`;
        ctx.font = '20px Arial'; ctx.textAlign = 'center';
        if (sunAbsorptionProgress < 0.3) ctx.fillText('Die Sonne wird schwächer...', canvas.width/2, 35);
        else if (sunAbsorptionProgress < 0.7) ctx.fillText('Du wirst zum neuen Zentrum!', canvas.width/2, 35);
        else ctx.fillText('Fast geschafft!', canvas.width/2, 35);

        const bW=200, bH=8, bX=canvas.width/2-100, bY=canvas.height-50;
        ctx.fillStyle = 'rgba(50,50,50,0.7)';
        ctx.fillRect(bX, bY, bW, bH);
        const gr = ctx.createLinearGradient(bX, bY, bX+bW*sunAbsorptionProgress, bY);
        gr.addColorStop(0, 'rgba(80,160,255,0.9)');
        gr.addColorStop(1, 'rgba(150,220,255,0.9)');
        ctx.fillStyle = gr;
        ctx.fillRect(bX, bY, bW*sunAbsorptionProgress, bH);
        ctx.fillStyle = 'rgba(150,210,255,0.7)';
        ctx.font = '12px Arial';
        ctx.fillText(`Sonne: ${Math.round((1-sunAbsorptionProgress)*100)}%`, canvas.width/2, bY-6);
    }

    // Win
    if (gameWon) {
        const pulse = 0.7 + 0.3 * Math.sin(now/500);
        ctx.fillStyle = `rgba(255,215,0,${pulse})`;
        ctx.font = '48px Arial'; ctx.textAlign = 'center';
        ctx.fillText('GEWONNEN!', canvas.width/2, canvas.height/2-20);
        ctx.fillStyle = `rgba(255,215,0,${pulse*0.7})`;
        ctx.font = '20px Arial';
        ctx.fillText('Du bist das neue Zentrum des Systems!', canvas.width/2, canvas.height/2+20);
    }

    // HUD
    const player = celestialBodies.find(b => b.isPlayer);
    if (player) {
        ctx.fillStyle = 'rgba(255,255,255,0.4)';
        ctx.font = '11px monospace'; ctx.textAlign = 'left';
        const count = celestialBodies.filter(b => !b.isSpark).length;
        const massPercent = (player.mass / SUN_GAME_MASS * 100);

        ctx.fillText(`Körper: ${count}`, 10, canvas.height-60);
        ctx.fillText(`Spieler-Radius: ${player.radius.toFixed(1)}`, 10, canvas.height-45);

        if (!gameWon) {
            ctx.fillText(`Masse: ${massPercent.toFixed(1)}% der Sonne`, 10, canvas.height-30);

            if (massPercent < SUN_ABSORPTION_START_RATIO * 100) {
                ctx.fillStyle = 'rgba(255,150,50,0.5)';
                ctx.fillText(`Ziel: ${(SUN_ABSORPTION_START_RATIO*100).toFixed(0)}% → Sonne absorbieren`, 10, canvas.height-15);
            } else {
                ctx.fillStyle = 'rgba(100,200,255,0.6)';
                ctx.fillText(`✦ Bereit die Sonne zu absorbieren!`, 10, canvas.height-15);
            }
        } else {
            ctx.fillText(`Masse: ${player.mass.toExponential(1)}`, 10, canvas.height-30);
        }

        if (gravityBlendFactor > 0 && gravityBlendFactor < 1) {
            ctx.fillStyle = 'rgba(100,200,255,0.5)';
            ctx.fillText(`Gravity-Übergang: ${Math.round(gravityBlendFactor*100)}%`, 10, canvas.height-75);
        }
    }

    logBodyChanges();
}

function logBodyChanges() {
    const t = performance.now();
    if (t - lastLogTime < LOG_INTERVAL) return;
    lastLogTime = t;
    const s = new Map();
    celestialBodies.forEach(b => { if (!b) return; s.set(b.id, JSON.stringify({
        x: b.x.toFixed(2), y: b.y.toFixed(2), mass: b.mass.toExponential(2),
        radius: b.radius.toFixed(2), isPlayer: b.isPlayer, isSun: b.isSun
    })); });
    bodyStates = s;
}
