import type { VlwGlyph } from "./font-converter-interfaces.js";
import { createCanvas, Path2D } from "@napi-rs/canvas";

/**
 * Rasterize one glyph;
 * returns null if the font has no glyph for this code point.
 */
export function RenderGlyph(
    font: opentype.Font,
    codepoint: number,
    size: number,
): VlwGlyph | null {
    const glyphIndex = font.charToGlyphIndex(String.fromCodePoint(codepoint));
    if (glyphIndex === 0) return null; // .notdef: character not in the font

    const glyph = font.glyphs.get(glyphIndex);
    const scale = size / font.unitsPerEm;
    const setWidth = Math.round((glyph.advanceWidth ?? 0) * scale);
    const empty: VlwGlyph = {
        value: codepoint,
        width: 0,
        height: 0,
        setWidth,
        topExtent: 0,
        leftExtent: 0,
        bitmap: new Uint8Array(0),
    };

    const bb = glyph.getPath(0, 0, size).getBoundingBox();
    if (!Number.isFinite(bb.x1) || bb.x2 <= bb.x1 || bb.y2 <= bb.y1) return empty;

    // Draw at an integer origin with some padding, then trim to the inked pixels
    const pad = 2;
    const ox = Math.floor(bb.x1) - pad;
    const oy = Math.floor(bb.y1) - pad;
    const cw = Math.ceil(bb.x2) - ox + pad;
    const ch = Math.ceil(bb.y2) - oy + pad;

    const canvas = createCanvas(cw, ch);
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#000";
    // Pen origin at canvas (-ox, -oy); opentype's y axis already points down
    ctx.fill(new Path2D(glyph.getPath(-ox, -oy, size).toPathData(4)));
    const alpha = ctx.getImageData(0, 0, cw, ch).data;

    let minX = cw,
        minY = ch,
        maxX = -1,
        maxY = -1;
    for (let y = 0; y < ch; y++) {
        for (let x = 0; x < cw; x++) {
            if (alpha[(y * cw + x) * 4 + 3] !== 0) {
                if (x < minX) minX = x;
                if (x > maxX) maxX = x;
                if (y < minY) minY = y;
                if (y > maxY) maxY = y;
            }
        }
    }
    if (maxX < 0) return empty;

    const width = maxX - minX + 1;
    const height = maxY - minY + 1;
    const bitmap = new Uint8Array(width * height);
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            bitmap[y * width + x] = alpha[((y + minY) * cw + (x + minX)) * 4 + 3]!;
        }
    }

    return {
        value: codepoint,
        width,
        height,
        setWidth,
        topExtent: -oy - minY, // baseline row minus top row
        leftExtent: minX + ox, // left column minus pen origin
        bitmap,
    };
}
