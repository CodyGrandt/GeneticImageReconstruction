export function calculateRMSE(
  targetPixels: Uint8ClampedArray,
  currentPixels: Uint8ClampedArray
): number {
  let sumSquaredError = 0;
  const pixelCount = targetPixels.length / 4;

  for (let i = 0; i < targetPixels.length; i += 4) {
    const dr = targetPixels[i]     - currentPixels[i];
    const dg = targetPixels[i + 1] - currentPixels[i + 1];
    const db = targetPixels[i + 2] - currentPixels[i + 2];
    sumSquaredError += dr * dr + dg * dg + db * db;
  }

  return Math.sqrt(sumSquaredError / (pixelCount * 3));
}
