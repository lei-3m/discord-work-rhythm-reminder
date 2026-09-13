import {writeFileSync} from "node:fs";
import {fileURLToPath} from "node:url";
import path from "node:path";
import zlib from "node:zlib";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const outPath = path.join(root, "src/icons.js");

const ACCENT = [0x1f, 0x7a, 0x6d]; // #1F7A6D
const WHITE = [0xff, 0xff, 0xff];

// ---- minimal PNG encoder (no deps): RGBA8, single IDAT, CRC32 per spec ----

const CRC_TABLE = (() => {
    const table = new Uint32Array(256);
    for (let n = 0; n < 256; n++) {
        let c = n;
        for (let k = 0; k < 8; k++) {
            c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
        }
        table[n] = c >>> 0;
    }
    return table;
})();

function crc32(buf) {
    let c = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
        c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
    }
    return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
    const typeBuf = Buffer.from(type, "ascii");
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
    return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function encodePNG(width, height, rgba) {
    const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

    const ihdrData = Buffer.alloc(13);
    ihdrData.writeUInt32BE(width, 0);
    ihdrData.writeUInt32BE(height, 4);
    ihdrData[8] = 8; // bit depth
    ihdrData[9] = 6; // color type: RGBA
    ihdrData[10] = 0;
    ihdrData[11] = 0;
    ihdrData[12] = 0;
    const ihdr = chunk("IHDR", ihdrData);

    const stride = width * 4;
    const raw = Buffer.alloc((stride + 1) * height);
    for (let y = 0; y < height; y++) {
        raw[y * (stride + 1)] = 0; // filter: none
        rgba.copy(raw, y * (stride + 1) + 1, y * stride, y * stride + stride);
    }
    const idat = chunk("IDAT", zlib.deflateSync(raw, {level: 9}));
    const iend = chunk("IEND", Buffer.alloc(0));

    return Buffer.concat([sig, ihdr, idat, iend]);
}

// ---- draw a simple accent-bg / white-circle / clock-hands glyph ----
//
// The white clock face is always confined to a circle of radius
// `faceFraction * size`, centered on the canvas. Every icon uses the same
// 0.4 fraction (80% diameter) — the maskable-icon safe zone — so the glyph
// survives being cropped into a circle/squircle/rounded-square by an OS
// launcher, AND so every icon (favicon, home-screen, splash) reads as the
// same design instead of some being a tighter/looser fill than others.
//
// mode:
//   "square" - background fills the full canvas edge-to-edge with ACCENT
//              (opaque). Used for manifest/apple-touch-icon assets, which
//              the OS itself is responsible for masking (or not, for splash).
//   "circle" - background is ACCENT only inside an outer disk near the
//              canvas edge; everything outside that disk is transparent.
//              Used for the favicon, since browsers never mask favicons —
//              the round shape has to be baked into the pixels themselves.

const FACE_FRACTION = 0.4;

function drawClockIcon(size, mode) {
    const rgba = Buffer.alloc(size * size * 4);
    const cx = size / 2;
    const cy = size / 2;
    const R = size * FACE_FRACTION;
    const outerR = size * 0.49; // circle mode only: edge-to-edge disk, tiny margin to avoid AA clipping

    const handHalfWidthV = size * 0.035;
    const handTopY = -R * 0.68; // minute hand: center -> up
    const handHalfWidthH = size * 0.03;
    const handRightX = R * 0.5; // hour hand: center -> right
    const dotR = size * 0.05;

    for (let y = 0; y < size; y++) {
        for (let x = 0; x < size; x++) {
            const dx = x + 0.5 - cx;
            const dy = y + 0.5 - cy;
            const distSq = dx * dx + dy * dy;

            let color = ACCENT;
            let alpha = 0xff;

            if (distSq <= R * R) {
                color = WHITE;

                const inVerticalHand = Math.abs(dx) <= handHalfWidthV && dy <= 0 && dy >= handTopY;
                const inHorizontalHand = Math.abs(dy) <= handHalfWidthH && dx >= 0 && dx <= handRightX;
                const inDot = distSq <= dotR * dotR;

                if (inVerticalHand || inHorizontalHand || inDot) {
                    color = ACCENT;
                }
            } else if (mode === "circle") {
                if (distSq <= outerR * outerR) {
                    color = ACCENT;
                } else {
                    color = [0, 0, 0];
                    alpha = 0;
                }
            }

            const i = (y * size + x) * 4;
            rgba[i] = color[0];
            rgba[i + 1] = color[1];
            rgba[i + 2] = color[2];
            rgba[i + 3] = alpha;
        }
    }

    return rgba;
}

const ICON_SPECS = {
    // Square, opaque, edge-to-edge accent background — the OS applies (or
    // deliberately doesn't apply, e.g. splash) its own crop on top of these.
    "apple-touch-icon.png": {size: 180, mode: "square"},
    "icon-192.png": {size: 192, mode: "square"},
    "icon-512.png": {size: 512, mode: "square"}, // referenced twice in manifest.json: purpose "any" and "maskable"
    // Genuinely circular, transparent outside the disk — browsers never mask
    // favicons themselves, so the round shape has to be baked in here.
    "favicon.png": {size: 64, mode: "circle"},
    // Same circular treatment at a much higher resolution — for embedding in
    // README.md, where GitHub strips `style` attributes so a CSS
    // border-radius can't fake it; the round shape has to be real pixels.
    "icon-circle-512.png": {size: 512, mode: "circle"},
};

const icons = {};
for (const [name, spec] of Object.entries(ICON_SPECS)) {
    const rgba = drawClockIcon(spec.size, spec.mode);
    const png = encodePNG(spec.size, spec.size, rgba);
    icons[name] = png.toString("base64");
    console.log(`[generate-icons] ${name} (${spec.size}x${spec.size}, ${spec.mode}, ${png.length} bytes)`);
}

const out = `// Auto-generated by scripts/generate-icons.mjs — do not edit directly.
export const ICONS = ${JSON.stringify(icons, null, 2)};
`;

writeFileSync(outPath, out, "utf8");
console.log(`[generate-icons] -> src/icons.js`);
