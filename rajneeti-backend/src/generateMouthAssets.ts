/**
 * generateMouthAssets.ts — Creates cartoon mouth + eye-blink overlay PNGs
 * 
 * Generates transparent PNG files using FFmpeg's geq (generic equation) filter:
 *   Mouth overlays (480px wide — sized for 3D CGI caricature faces):
 *     1. mouth_closed.png  — thin curved lips pressed together
 *     2. mouth_half.png    — small oval with teeth hint + pink tongue
 *     3. mouth_open.png    — large oval with teeth row + prominent tongue
 *   Eye-blink overlays (skin-colored eyelid patches):
 *     4. eyes_closed.png   — pair of closed eyelids for blink animation
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

console.log('🎨 Generating cartoon mouth & eye-blink assets...\n');

/**
 * Create a transparent PNG using FFmpeg's geq filter.
 * The geq expression is written to a temp filter script file
 * to avoid shell quoting issues on Windows.
 */
function createOverlayPNG(
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
        console.error(`     ${stderr.slice(0, 300)}`);
    }

    try { fs.unlinkSync(filterPath); } catch {}
}

// ════════════════════════════════════════════════════════════
// MOUTH OVERLAYS — 480px wide canvases for 3D CGI faces
// ════════════════════════════════════════════════════════════

console.log('── Mouth Overlays ──');

// ────────────────────────────────────────────────────────────
// 1. MOUTH CLOSED — thin dark-brown ellipse (lips pressed shut)
//    Canvas: 480×200. Center: (240, 100), rx=140, ry=18
//    Condition: (X-240)²/140² + (Y-100)²/18² < 1
//    → (X-240)²×324 + (Y-100)²×19600 < 6350400
// ────────────────────────────────────────────────────────────
const closedCond = 'lt((X-240)*(X-240)*324+(Y-100)*(Y-100)*19600,6350400)';

createOverlayPNG('mouth_closed.png', 480, 200,
    `if(${closedCond},107,0)`,   // R: dark brown
    `if(${closedCond},58,0)`,    // G
    `if(${closedCond},42,0)`,    // B
    `if(${closedCond},255,0)`    // A
);

// ────────────────────────────────────────────────────────────
// 2. MOUTH HALF-OPEN — dark oval cavity + white teeth strip + pink tongue
//    Canvas: 480×240.
//    Outer cavity: center (240,120), rx=125, ry=60
//    Condition: (X-240)²×3600 + (Y-120)²×15625 < 56250000
//    Teeth zone: Y ∈ [68, 98] inside cavity → white
//    Tongue: center (240,160), rx=80, ry=30
//    Condition: (X-240)²×900 + (Y-160)²×6400 < 5760000 → pink
//    Rest of cavity: very dark (#1A0808) 
// ────────────────────────────────────────────────────────────
const halfCavity  = 'lt((X-240)*(X-240)*3600+(Y-120)*(Y-120)*15625,56250000)';
const halfTeeth   = 'gt(Y,68)*lt(Y,98)';
const halfTongue  = 'lt((X-240)*(X-240)*900+(Y-160)*(Y-160)*6400,5760000)';

createOverlayPNG('mouth_half.png', 480, 240,
    `if(${halfCavity},if(${halfTeeth},240,if(${halfTongue},216,26)),0)`,
    `if(${halfCavity},if(${halfTeeth},240,if(${halfTongue},64,8)),0)`,
    `if(${halfCavity},if(${halfTeeth},245,if(${halfTongue},112,8)),0)`,
    `if(${halfCavity},255,0)`
);

// ────────────────────────────────────────────────────────────
// 3. MOUTH WIDE-OPEN — larger cavity + prominent teeth + big tongue
//    Canvas: 480×320.
//    Outer cavity: center (240,168), rx=160, ry=110
//    Condition: (X-240)²×12100 + (Y-168)²×25600 < 309760000
//    Teeth zone: Y ∈ [64, 110] inside cavity → white
//    Tongue: center (240,224), rx=110, ry=55
//    Condition: (X-240)²×3025 + (Y-224)²×12100 < 36602500 → pink
//    Rest of cavity: very dark (#1A0808)
// ────────────────────────────────────────────────────────────
const openCavity  = 'lt((X-240)*(X-240)*12100+(Y-168)*(Y-168)*25600,309760000)';
const openTeeth   = 'gt(Y,64)*lt(Y,110)';
const openTongue  = 'lt((X-240)*(X-240)*3025+(Y-224)*(Y-224)*12100,36602500)';

createOverlayPNG('mouth_open.png', 480, 320,
    `if(${openCavity},if(${openTeeth},240,if(${openTongue},216,26)),0)`,
    `if(${openCavity},if(${openTeeth},240,if(${openTongue},64,8)),0)`,
    `if(${openCavity},if(${openTeeth},245,if(${openTongue},112,8)),0)`,
    `if(${openCavity},255,0)`
);

// ════════════════════════════════════════════════════════════
// EYE-BLINK OVERLAYS — skin-toned eyelid patches
// ════════════════════════════════════════════════════════════

console.log('\n── Eye-Blink Overlays ──');

// ────────────────────────────────────────────────────────────
// 4. EYES CLOSED — Two horizontal ellipses (left & right eyelid)
//    representing closed eyes with subtle lash lines.
//    Canvas: 480×160
//    Left eye: center (150, 80), rx=70, ry=35
//    Right eye: center (330, 80), rx=70, ry=35
//    Lash line (darker): Y ∈ [78, 84] inside each ellipse
//    Eyelid (skin tone): rest of ellipse
//    Skin tone: ~#E8B08D (warm Indian skin), Lash: ~#2D1810 (dark brown)
// ────────────────────────────────────────────────────────────
const leftEye  = 'lt((X-150)*(X-150)*1225+(Y-80)*(Y-80)*4900,6002500)';
const rightEye = 'lt((X-330)*(X-330)*1225+(Y-80)*(Y-80)*4900,6002500)';
const eyeArea  = `(${leftEye}+${rightEye})`;
const lashZone = 'gt(Y,76)*lt(Y,86)';

createOverlayPNG('eyes_closed.png', 480, 160,
    // R: lash=45, skin=232
    `if(${eyeArea},if(${lashZone},45,232),0)`,
    // G: lash=24, skin=176
    `if(${eyeArea},if(${lashZone},24,176),0)`,
    // B: lash=16, skin=141
    `if(${eyeArea},if(${lashZone},16,141),0)`,
    // A: visible inside eye ellipses, transparent outside
    `if(${eyeArea},255,0)`
);

console.log(`\n🎉 All assets saved to: ${mouthsDir}`);
console.log('   Mouth: mouth_closed.png, mouth_half.png, mouth_open.png');
console.log('   Eyes:  eyes_closed.png');
