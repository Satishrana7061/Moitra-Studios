/**
 * generateMouthAssets.ts — Creates cartoon mouth overlay PNGs for lip-sync
 * 
 * Generates 3 transparent PNG files using FFmpeg's geq (generic equation) filter:
 *   1. mouth_closed.png  — thin curved lips pressed together
 *   2. mouth_half.png    — small oval with teeth hint + pink tongue
 *   3. mouth_open.png    — large oval with teeth row + prominent tongue
 * 
 * Output: rajneeti-backend/assets/avatars/mouths/
 * 
 * Run: npx tsx src/generateMouthAssets.ts
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const mouthsDir = path.resolve(__dirname, '..', 'assets', 'avatars', 'mouths');
fs.mkdirSync(mouthsDir, { recursive: true });

console.log('🎨 Generating cartoon mouth assets...\n');

/**
 * Create a transparent PNG using FFmpeg's geq filter.
 * The geq expression is written to a temp filter script file
 * to avoid shell quoting issues on Windows.
 */
function createMouthPNG(
    filename: string,
    width: number,
    height: number,
    rExpr: string,
    gExpr: string,
    bExpr: string,
    aExpr: string
) {
    const outPath = path.join(mouthsDir, filename);
    const filterPath = path.join(mouthsDir, '_tmp_geq_filter.txt');

    // Build the geq filter — single quotes protect expressions from FFmpeg's parser
    const geqFilter = `geq=r='${rExpr}':g='${gExpr}':b='${bExpr}':a='${aExpr}'`;
    fs.writeFileSync(filterPath, geqFilter, 'utf-8');

    const cmd = [
        'ffmpeg', '-y',
        '-f', 'lavfi',
        '-i', `color=c=black@0:s=${width}x${height}:d=1,format=rgba`,
        '-filter_script:v', `"${filterPath}"`,
        '-frames:v', '1',
        `"${outPath}"`
    ].join(' ');

    try {
        execSync(cmd, { stdio: 'pipe' });
        console.log(`  ✅ ${filename} (${width}×${height})`);
    } catch (err: any) {
        const stderr = err.stderr?.toString() || '';
        console.error(`  ❌ Failed: ${filename}`);
        console.error(`     ${stderr.slice(0, 200)}`);
    }

    try { fs.unlinkSync(filterPath); } catch {}
}

// ────────────────────────────────────────────────────────────
// 1. MOUTH CLOSED — thin dark-brown ellipse (lips pressed shut)
//    Ellipse center: (60, 30), radii: rx=35, ry=5
//    Condition: (X-60)²/35² + (Y-30)²/5² < 1
//    Multiply through: (X-60)²×25 + (Y-30)²×1225 < 30625
// ────────────────────────────────────────────────────────────
const closedCond = 'lt((X-60)*(X-60)*25+(Y-30)*(Y-30)*1225,30625)';

createMouthPNG('mouth_closed.png', 120, 60,
    `if(${closedCond},107,0)`,   // R: dark brown
    `if(${closedCond},58,0)`,    // G
    `if(${closedCond},42,0)`,    // B
    `if(${closedCond},255,0)`    // A: opaque inside, transparent outside
);

// ────────────────────────────────────────────────────────────
// 2. MOUTH HALF-OPEN — dark oval cavity + white teeth strip + pink tongue
//    Outer cavity: center (60,32), rx=32, ry=16
//    Condition: (X-60)²×256 + (Y-32)²×1024 < 262144
//    Teeth zone: Y ∈ [18, 26] inside cavity → white
//    Tongue: center (60,42), rx=20, ry=8
//    Condition: (X-60)²×64 + (Y-42)²×400 < 25600 → pink
//    Rest of cavity: very dark (#1A0808) 
// ────────────────────────────────────────────────────────────
const halfCavity  = 'lt((X-60)*(X-60)*256+(Y-32)*(Y-32)*1024,262144)';
const halfTeeth   = 'gt(Y,18)*lt(Y,26)';
const halfTongue  = 'lt((X-60)*(X-60)*64+(Y-42)*(Y-42)*400,25600)';

createMouthPNG('mouth_half.png', 120, 60,
    `if(${halfCavity},if(${halfTeeth},240,if(${halfTongue},216,26)),0)`,
    `if(${halfCavity},if(${halfTeeth},240,if(${halfTongue},64,8)),0)`,
    `if(${halfCavity},if(${halfTeeth},245,if(${halfTongue},112,8)),0)`,
    `if(${halfCavity},255,0)`
);

// ────────────────────────────────────────────────────────────
// 3. MOUTH WIDE-OPEN — larger cavity + prominent teeth + big tongue
//    Outer cavity: center (60,42), rx=42, ry=28
//    Condition: (X-60)²×784 + (Y-42)²×1764 < 1382976
//    Teeth zone: Y ∈ [16, 28] inside cavity → white
//    Tongue: center (60,56), rx=28, ry=14
//    Condition: (X-60)²×196 + (Y-56)²×784 < 153664 → pink
//    Rest of cavity: very dark (#1A0808)
// ────────────────────────────────────────────────────────────
const openCavity  = 'lt((X-60)*(X-60)*784+(Y-42)*(Y-42)*1764,1382976)';
const openTeeth   = 'gt(Y,16)*lt(Y,28)';
const openTongue  = 'lt((X-60)*(X-60)*196+(Y-56)*(Y-56)*784,153664)';

createMouthPNG('mouth_open.png', 120, 80,
    `if(${openCavity},if(${openTeeth},240,if(${openTongue},216,26)),0)`,
    `if(${openCavity},if(${openTeeth},240,if(${openTongue},64,8)),0)`,
    `if(${openCavity},if(${openTeeth},245,if(${openTongue},112,8)),0)`,
    `if(${openCavity},255,0)`
);

console.log(`\n🎉 All mouth assets saved to: ${mouthsDir}`);
console.log('   Files: mouth_closed.png, mouth_half.png, mouth_open.png');
