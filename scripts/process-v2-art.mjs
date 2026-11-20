import fs from 'node:fs';
import path from 'node:path';
import { PNG } from 'pngjs';

const root = process.cwd();
const sourceDir = path.join(root, 'tmp', 'v2-art');
const outputDir = path.join(root, 'public', 'assets', 'characters-v2');
const targetWidth = 384;
const targetHeight = 512;
const padding = 14;

fs.mkdirSync(outputDir, { recursive: true });

const resizeCutout = (source) => {
  let minX = source.width;
  let minY = source.height;
  let maxX = 0;
  let maxY = 0;
  for (let y = 0; y < source.height; y += 1) {
    for (let x = 0; x < source.width; x += 1) {
      if (source.data[(y * source.width + x) * 4 + 3] < 12) continue;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }
  const cropWidth = Math.max(1, maxX - minX + 1);
  const cropHeight = Math.max(1, maxY - minY + 1);
  const scale = Math.min((targetWidth - padding * 2) / cropWidth, (targetHeight - padding * 2) / cropHeight);
  const drawWidth = Math.max(1, Math.round(cropWidth * scale));
  const drawHeight = Math.max(1, Math.round(cropHeight * scale));
  const offsetX = Math.round((targetWidth - drawWidth) / 2);
  const offsetY = targetHeight - padding - drawHeight;
  const output = new PNG({ width: targetWidth, height: targetHeight, colorType: 6 });
  output.data.fill(0);
  for (let y = 0; y < drawHeight; y += 1) {
    const sourceY = Math.min(maxY, minY + Math.floor(y / scale));
    for (let x = 0; x < drawWidth; x += 1) {
      const sourceX = Math.min(maxX, minX + Math.floor(x / scale));
      const sourceIndex = (sourceY * source.width + sourceX) * 4;
      const outputIndex = ((offsetY + y) * targetWidth + offsetX + x) * 4;
      output.data[outputIndex] = source.data[sourceIndex];
      output.data[outputIndex + 1] = source.data[sourceIndex + 1];
      output.data[outputIndex + 2] = source.data[sourceIndex + 2];
      output.data[outputIndex + 3] = source.data[sourceIndex + 3];
    }
  }
  return output;
};

const files = fs.readdirSync(sourceDir).filter((file) => file.endsWith('.png')).sort();
for (const file of files) {
  const input = PNG.sync.read(fs.readFileSync(path.join(sourceDir, file)));
  const output = resizeCutout(input);
  fs.writeFileSync(path.join(outputDir, file), PNG.sync.write(output, { colorType: 6, inputColorType: 6 }));
}

const favicon = new PNG({ width: 96, height: 96, colorType: 6 });
const paint = (x, y, width, height, color) => {
  for (let py = y; py < y + height; py += 1) for (let px = x; px < x + width; px += 1) {
    const index = (py * favicon.width + px) * 4;
    favicon.data.set(color, index);
  }
};
paint(0, 0, 96, 96, [5, 13, 42, 255]);
paint(8, 8, 80, 80, [54, 67, 186, 255]);
paint(14, 14, 68, 68, [12, 25, 72, 255]);
paint(23, 65, 50, 10, [255, 212, 71, 255]);
paint(31, 25, 12, 42, [255, 255, 255, 255]);
paint(55, 25, 12, 42, [255, 255, 255, 255]);
paint(37, 18, 24, 12, [255, 255, 255, 255]);
paint(39, 45, 20, 10, [99, 123, 255, 255]);
fs.writeFileSync(path.join(root, 'public', 'favicon.png'), PNG.sync.write(favicon));

console.log(`Processed ${files.length} V2 character cutouts at ${targetWidth}x${targetHeight}.`);
