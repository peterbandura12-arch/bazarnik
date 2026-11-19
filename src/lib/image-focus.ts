import sharp from "sharp";

export interface FocalPoint {
  x: number;
  y: number;
}

/**
 * Výpočet bodu zájmu (focus point) fotky na serveri – bez externej AI služby.
 * Analyzuje kontrast a hrany v zmenšenine fotky (Sobel-like detekcia) a vráti
 * ťažisko obsahu ako súradnice 0–1. Používa sa na inteligentné centrovanie
 * pri oreze na kartu (object-position), čím foto získa „AI zaostrenie“.
 */
export async function computeFocalPoint(buffer: Buffer): Promise<FocalPoint | null> {
  try {
    const { data, info } = await sharp(buffer)
      .resize(64, 64, { fit: "inside" })
      .grayscale()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const { width, height } = info;
    if (width < 3 || height < 3) return null;

    const at = (x: number, y: number) => data[y * width + x];
    const columnWeights = new Array<number>(width).fill(0);
    const rowWeights = new Array<number>(height).fill(0);

    for (let y = 1; y < height - 1; y += 1) {
      for (let x = 1; x < width - 1; x += 1) {
        const energy =
          Math.abs(at(x + 1, y) - at(x - 1, y)) + Math.abs(at(x, y + 1) - at(x, y - 1));
        columnWeights[x] += energy;
        rowWeights[y] += energy;
      }
    }

    const centroid = (weights: number[]): number => {
      const total = weights.reduce((acc, value) => acc + value, 0);
      if (total <= 0) return 0.5;
      let weighted = 0;
      for (let j = 0; j < weights.length; j += 1) weighted += weights[j] * (j + 0.5);
      return Math.min(0.9, Math.max(0.1, weighted / total / weights.length));
    };

    return { x: centroid(columnWeights), y: centroid(rowWeights) };
  } catch {
    return null;
  }
}
