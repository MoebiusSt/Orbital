/**
 * @file input.js
 * @description Input handlers: mouse, keyboard, zoom, canvas resize.
 *
 * WHAT'S HERE:
 * - resizeCanvas() — syncs all canvases to window size
 * - updateMousePosition(event) — screen-to-world mouse coords
 * - handleZoom(event) — wheel zoom with focus preservation
 * - handleKeyDown/Up(event) — space bar for fast mode
 *
 * DEPENDENCIES: state.js (camera, mouseX/Y, canvas refs, currentGameSpeed),
 *               constants.js (BASE_GAME_SPEED, FAST_GAME_SPEED),
 *               background.js (generateNebula — called on resize)
 * DEPENDENTS: main.js (registers these as event listeners)
 *
 * VERSION: 32
 */

function handleKeyDown(event) {
    if (event.code === 'Space') currentGameSpeed = FAST_GAME_SPEED;
}

function handleKeyUp(event) {
    if (event.code === 'Space') currentGameSpeed = BASE_GAME_SPEED;
}

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    if (coronaCanvas) {
        coronaCanvas.width = window.innerWidth;
        coronaCanvas.height = window.innerHeight;
    }
    if (sunCanvas) {
        sunCanvas.width = window.innerWidth;
        sunCanvas.height = window.innerHeight;
    }
    if (nebulaCanvas) generateNebula();
}

function updateMousePosition(event) {
    const rect = canvas.getBoundingClientRect();
    screenMouseX = event.clientX - rect.left;
    screenMouseY = event.clientY - rect.top;
    mouseX = (screenMouseX - canvas.width / 2) / camera.scale + camera.x;
    mouseY = (screenMouseY - canvas.height / 2) / camera.scale + camera.y;
}

function handleZoom(event) {
    event.preventDefault();
    const zoomFactor = event.deltaY > 0 ? 0.9 : 1.1;
    const wXBefore = (screenMouseX - canvas.width / 2) / camera.scale + camera.x;
    const wYBefore = (screenMouseY - canvas.height / 2) / camera.scale + camera.y;
    camera.scale = Math.max(0.05, Math.min(5, camera.scale * zoomFactor));
    camera.x += wXBefore - ((screenMouseX - canvas.width / 2) / camera.scale + camera.x);
    camera.y += wYBefore - ((screenMouseY - canvas.height / 2) / camera.scale + camera.y);
}
