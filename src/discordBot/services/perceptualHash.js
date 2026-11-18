const sharp = require("sharp");

const HASH_SIZE = 8;
const SAMPLE_SIZE = 32;
const MIN_PIXEL_STD_DEV = 5;
const CENTRE_CROP_RATIOS = [0.9, 0.8];

const COSINES = Array.from({ length: HASH_SIZE }, (_frequencySlot, frequency) =>
  Array.from({ length: SAMPLE_SIZE }, (_positionSlot, position) =>
    Math.cos(((2 * position + 1) * frequency * Math.PI) / (2 * SAMPLE_SIZE))
  )
);

const samplePixels = async (input) => {
  const { data, info } = await sharp(input)
    .rotate()
    .flatten({ background: "#ffffff" })
    .grayscale()
    .resize(SAMPLE_SIZE, SAMPLE_SIZE, { fit: "fill" })
    .raw()
    .toBuffer({ resolveWithObject: true });
  return Array.from({ length: SAMPLE_SIZE * SAMPLE_SIZE }, (_, index) => data[index * info.channels]);
};

const standardDeviation = (values) => {
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const variance = values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length;
  return Math.sqrt(variance);
};

const lowFrequencies = (pixels) => {
  const coefficients = [];
  for (let vertical = 0; vertical < HASH_SIZE; vertical++) {
    for (let horizontal = 0; horizontal < HASH_SIZE; horizontal++) {
      let sum = 0;
      for (let y = 0; y < SAMPLE_SIZE; y++) {
        const rowWeight = COSINES[vertical][y];
        for (let x = 0; x < SAMPLE_SIZE; x++) {
          sum += pixels[y * SAMPLE_SIZE + x] * COSINES[horizontal][x] * rowWeight;
        }
      }
      coefficients.push(sum);
    }
  }
  return coefficients;
};

const median = (values) => {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};

const bitsToHex = (bits) =>
  bits
    .reduce((hash, bit) => (hash << 1n) | (bit ? 1n : 0n), 0n)
    .toString(16)
    .padStart(HASH_SIZE * 2, "0");

const hashPixels = (pixels) => {
  if (standardDeviation(pixels) < MIN_PIXEL_STD_DEV) return null;
  const coefficients = lowFrequencies(pixels);
  const threshold = median(coefficients.slice(1));
  return bitsToHex(coefficients.map((coefficient) => coefficient > threshold));
};

const hashImage = async (input) => hashPixels(await samplePixels(input));

const cropCentre = async (input, ratio) => {
  const { width, height } = await sharp(input).metadata();
  const cropWidth = Math.round(width * ratio);
  const cropHeight = Math.round(height * ratio);
  return sharp(input)
    .extract({
      left: Math.floor((width - cropWidth) / 2),
      top: Math.floor((height - cropHeight) / 2),
      width: cropWidth,
      height: cropHeight
    })
    .toBuffer();
};

const hashReferenceImage = async (input) => {
  const upright = await sharp(input).rotate().toBuffer();
  const crops = await Promise.all(CENTRE_CROP_RATIOS.map((ratio) => cropCentre(upright, ratio)));
  const hashes = await Promise.all([upright, ...crops].map(hashImage));
  return [...new Set(hashes.filter(Boolean))];
};

const hammingDistance = (first, second) => {
  let difference = BigInt(`0x${first}`) ^ BigInt(`0x${second}`);
  let distance = 0;
  while (difference) {
    distance += Number(difference & 1n);
    difference >>= 1n;
  }
  return distance;
};

module.exports = { hashImage, hashReferenceImage, hammingDistance };
