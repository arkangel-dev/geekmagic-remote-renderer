import type { VlwGlyph } from "./font-converter-interfaces.js";
import { JavaUTF } from "./utils.js";

export function EncodeVlw(
    glyphs: VlwGlyph[],
    size: number,
    ascent: number,
    descent: number,
    name: string,
    psname: string,
): Buffer {
    const ints = (...vals: number[]) => {
        const b = Buffer.alloc(vals.length * 4);
        vals.forEach((v, i) => b.writeInt32BE(v, i * 4));
        return b;
    };

    const parts: Buffer[] = [];
    parts.push(ints(glyphs.length, 11, size, 0, ascent, descent));
    for (const g of glyphs) {
        parts.push(
            ints(
                g.value,
                g.height,
                g.width,
                g.setWidth,
                g.topExtent,
                g.leftExtent,
                0,
            ),
        );
    }
    for (const g of glyphs) parts.push(Buffer.from(g.bitmap));
    parts.push(JavaUTF(name), JavaUTF(psname), Buffer.from([1])); // smooth = true
    return Buffer.concat(parts);
}