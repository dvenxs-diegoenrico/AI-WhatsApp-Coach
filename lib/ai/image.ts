import sharp from "sharp";

/**
 * Shrinks a food photo before sending it to Claude.
 * Image tokens grow with pixel count (≈ width × height / 750), so a 1600×1200 WhatsApp
 * photo (~2,560 tokens) becomes 1024×768 (~1,050 tokens): about 60% cheaper,
 * with plenty of detail to recognise food. Also fixes rotation and converts to JPEG.
 */
export const MAX_IMAGE_SIDE = 1024;

export async function prepareImage(input: Buffer): Promise<Buffer> {
  return sharp(input)
    .rotate() // apply EXIF orientation
    .resize({ width: MAX_IMAGE_SIDE, height: MAX_IMAGE_SIDE, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 80, mozjpeg: true })
    .toBuffer();
}
