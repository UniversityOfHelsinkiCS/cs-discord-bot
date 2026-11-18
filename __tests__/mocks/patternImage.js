const sharp = require("sharp");

const PATTERNS = [
  { horizontal: 1.5, vertical: 0.7, phase: 0 },
  { horizontal: 0.4, vertical: 2.2, phase: 1.3 },
  { horizontal: 3.1, vertical: 1.8, phase: 2.6 },
  { horizontal: 0.9, vertical: 3.4, phase: 4.1 }
];

const patternPixels = ({ horizontal, vertical, phase }, width, height) => {
  const pixels = Buffer.alloc(width * height * 3);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const wave =
        Math.sin((x / width) * horizontal * 2 * Math.PI + phase) * Math.cos((y / height) * vertical * Math.PI) +
        Math.sin(((x + y) / (width + height)) * 2 * Math.PI * (horizontal + vertical) + phase * 2) * 0.5;
      const value = Math.max(0, Math.min(255, Math.round(128 + wave * 80)));
      const offset = (y * width + x) * 3;
      pixels[offset] = value;
      pixels[offset + 1] = 255 - value;
      pixels[offset + 2] = (value * 3) % 256;
    }
  }
  return pixels;
};

const patternImage = (patternIndex, width = 640, height = 800) =>
  sharp(patternPixels(PATTERNS[patternIndex], width, height), { raw: { width, height, channels: 3 } })
    .png()
    .toBuffer();

const blankImage = (width = 400, height = 400) =>
  sharp({ create: { width, height, channels: 3, background: "#f4f4f4" } })
    .png()
    .toBuffer();

module.exports = { patternImage, blankImage, PATTERN_COUNT: PATTERNS.length };
