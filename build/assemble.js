/**
 * @file assemble.js
 * @description Builds a monolithic HTML file from the modular Orbital project.
 * 
 * USAGE:
 *   node build/assemble.js
 * 
 * OUTPUT:
 *   dist/orbital-mono.html — standalone HTML with all CSS and JS inlined.
 * 
 * This script:
 * 1. Reads orbital.html as template
 * 2. Inlines orbital.css into a <style> tag
 * 3. Concatenates all JS modules in correct order into a single <script>
 * 4. Writes the result to dist/orbital-mono.html
 * 
 * The output file requires no external assets and can run from any location.
 */

const fs = require('fs');
const path = require('path');

// Paths
const projectRoot = path.join(__dirname, '..');
const assetsDir = path.join(projectRoot, 'assets');
const jsDir = path.join(assetsDir, 'js');
const distDir = path.join(projectRoot, 'dist');

// JS files in load order (must match orbital.html)
const jsFiles = [
    'constants.js',
    'utils.js',
    'state.js',
    'noise.js',
    'background.js',
    'sun-visuals.js',
    'body-rendering.js',
    'celestial-body.js',
    'input.js',
    'population.js',
    'ejection.js',
    'physics.js',
    'collision.js',
    'absorption.js',
    'game-state.js',
    'renderer.js',
    'main.js'
];

console.log('=== Orbital Monolithic Build ===\n');

// Read CSS
const cssPath = path.join(assetsDir, 'orbital.css');
let css = '';
try {
    css = fs.readFileSync(cssPath, 'utf8');
    console.log(`✓ Read CSS: ${cssPath} (${css.length} chars)`);
} catch (e) {
    console.error(`✗ Failed to read CSS: ${e.message}`);
    process.exit(1);
}

// Read and concatenate JS
let js = '';
const separator = '\n\n// ' + '='.repeat(70) + '\n';
for (const file of jsFiles) {
    const filePath = path.join(jsDir, file);
    try {
        const content = fs.readFileSync(filePath, 'utf8');
        js += `${separator}// FILE: ${file}\n// ${'='.repeat(70)}\n\n${content}\n`;
        console.log(`✓ Read JS: ${file} (${content.length} chars)`);
    } catch (e) {
        console.error(`✗ Failed to read JS: ${file} — ${e.message}`);
        process.exit(1);
    }
}

// Build HTML
const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const html = `<!DOCTYPE html>
<html lang="de">
<!--
    ORBITAL — Monolithic Build
    Generated: ${timestamp}
    
    This is an auto-generated standalone version.
    For development, use the modular version (orbital.html).
    To regenerate, run: node build/assemble.js
-->
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Orbitales Mechanik-Spiel</title>
    <style>
${css}
    </style>
</head>
<body>
    <canvas id="coronaCanvas"></canvas>
    <div class="sun-blur sun-blur-corona" aria-hidden="true"></div>
    <canvas id="sunCanvas"></canvas>
    <div class="sun-blur sun-blur-disk" aria-hidden="true"></div>
    <canvas id="gameCanvas"></canvas>
    <script>
${js}
    </script>
</body>
</html>
`;

// Write output
const outputPath = path.join(distDir, 'orbital-mono.html');
try {
    fs.writeFileSync(outputPath, html, 'utf8');
    console.log(`\n✓ Built: ${outputPath}`);
    console.log(`  Total size: ${html.length} chars (${(html.length / 1024).toFixed(1)} KB)`);
} catch (e) {
    console.error(`\n✗ Failed to write output: ${e.message}`);
    process.exit(1);
}

console.log('\n=== Build Complete ===');
