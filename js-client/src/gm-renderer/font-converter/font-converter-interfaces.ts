export interface VlwGlyph {
  value: number;      // Unicode code point
  width: number;      // bitmap width
  height: number;     // bitmap height
  setWidth: number;   // horizontal advance
  topExtent: number;  // baseline to top of bitmap (positive = above)
  leftExtent: number; // pen origin to left of bitmap
  bitmap: Uint8Array; // width*height 8-bit alpha values
}









