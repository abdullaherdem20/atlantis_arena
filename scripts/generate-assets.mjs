import { PNG } from 'pngjs';
import { mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'public', 'assets');

const characterSeeds = [
  ['abdullah', '#161616', '#a76849', '#ffd447', 0, 1, 0], ['gokhan', '#121212', '#a76849', '#f6a93b', 1, 1, 1],
  ['deniz-arda', '#111111', '#c88b65', '#7dd3fc', 0, 1, 0], ['duygu', '#151218', '#d39a7b', '#ff5e7d', 0, 0, 1],
  ['ikra', '#101116', '#d7a181', '#a5f3fc', 0, 0, 0], ['selen', '#171219', '#c48a6b', '#ff8a65', 0, 0, 0],
  ['yagmur', '#101010', '#8b563e', '#ef4444', 0, 0, 0], ['emirhan', '#111111', '#bd7e5c', '#84cc16', 1, 1, 0],
  ['meltem', '#3b2318', '#d49a78', '#fb7185', 0, 0, 0], ['sinejan', '#131313', '#c98d6f', '#38bdf8', 0, 0, 1],
  ['merve', '#121216', '#c78d70', '#c084fc', 0, 0, 1], ['gulnihal', '#18131b', '#d19a79', '#e879f9', 0, 0, 0],
  ['pinar', '#141216', '#c98c6c', '#f472b6', 0, 0, 0], ['can', '#181818', '#b97f60', '#f43f5e', 1, 0, 0],
  ['sude', '#65432c', '#e0ae8b', '#a78bfa', 0, 0, 0], ['yusuf', '#111111', '#ad7354', '#65a30d', 0, 0, 0],
  ['hazal', '#121214', '#c58d6d', '#22c55e', 0, 0, 0], ['aysegul', '#1881d5', '#d49b7b', '#3b82f6', 0, 0, 0],
  ['beyza', '#111116', '#d19a79', '#d946ef', 0, 0, 0], ['arda', '#151515', '#ba7b5b', '#06b6d4', 0, 2, 0],
  ['ozgur-sercan', '#141414', '#b97959', '#16a34a', 0, 0, 0],
];

const arenaSeeds = [
  ['hali-saha', '#062d22', '#19a15f', '#d5ffef', 'field'], ['basketbol', '#401b13', '#d26b2b', '#ffcf70', 'court'],
  ['voleybol', '#17234f', '#ef893c', '#f8e6a0', 'net'], ['scooter', '#171b36', '#5264c7', '#75f2ec', 'ramps'],
  ['paten', '#371650', '#ef45a7', '#44d7ff', 'ramps'], ['bisiklet', '#17351f', '#96623d', '#b7d45c', 'trail'],
  ['atletizm', '#2b1c34', '#c63d4f', '#ffd487', 'track'], ['avcilik', '#071f19', '#1c6948', '#d8be61', 'forest'],
  ['tenis', '#12286c', '#2e7bea', '#d8f368', 'net'], ['kamp', '#091c31', '#255640', '#ffaf44', 'camp'],
  ['dag', '#1f2940', '#74849a', '#cce8ff', 'mountain'], ['trekking', '#153524', '#637835', '#d2a35b', 'trail'],
  ['havuz', '#0b2750', '#0f92c9', '#8eeaff', 'pool'], ['kayak', '#26385f', '#6f91c5', '#eef8ff', 'snow'],
  ['gemi', '#081f43', '#166f9f', '#f2c46f', 'ship'], ['surf', '#065567', '#11a9bf', '#ffd479', 'beach'],
  ['fitness', '#171d2c', '#3d4a68', '#ed455b', 'gym'], ['boks', '#210e23', '#c32f45', '#ffd36b', 'ring'],
  ['self-kasa', '#111a45', '#3643ba', '#6fd6ff', 'checkout'], ['danisma', '#151d51', '#4154c7', '#f2f5ff', 'desk'],
  ['protein', '#34143f', '#9e3f93', '#f4c456', 'shelf'], ['atlantis-magaza', '#101840', '#3643ba', '#ffffff', 'store'],
  ['otopark', '#141a2e', '#434d67', '#f2c14e', 'parking'], ['mola', '#342743', '#5c758d', '#f7cf72', 'break'],
  ['depo', '#121a25', '#263c50', '#d95858', 'warehouse'],
];

const hex = (value) => {
  const clean = value.replace('#', '');
  return [Number.parseInt(clean.slice(0, 2), 16), Number.parseInt(clean.slice(2, 4), 16), Number.parseInt(clean.slice(4, 6), 16), 255];
};
const png = (width, height, color = '#000000') => {
  const image = new PNG({ width, height });
  const rgba = hex(color);
  for (let i = 0; i < width * height; i += 1) image.data.set(rgba, i * 4);
  return image;
};
const rect = (image, x, y, width, height, color) => {
  const rgba = Array.isArray(color) ? color : hex(color);
  for (let py = Math.max(0, y); py < Math.min(image.height, y + height); py += 1) {
    for (let px = Math.max(0, x); px < Math.min(image.width, x + width); px += 1) image.data.set(rgba, (py * image.width + px) * 4);
  }
};
const line = (image, x1, y1, x2, y2, color, size = 2) => {
  const steps = Math.max(Math.abs(x2 - x1), Math.abs(y2 - y1));
  for (let step = 0; step <= steps; step += 1) {
    const t = steps ? step / steps : 0;
    rect(image, Math.round(x1 + (x2 - x1) * t), Math.round(y1 + (y2 - y1) * t), size, size, color);
  }
};
const save = async (image, target) => {
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, PNG.sync.write(image, { colorType: 6 }));
};

const drawCharacter = (image, ox, oy, scale, seed, frame, animation) => {
  const [, hair, skin, accent, bulky, facial, badge] = seed;
  const bob = animation === 0 ? frame % 2 : animation === 1 ? (frame % 2) * 2 : 0;
  const lean = animation === 2 || animation === 3 ? frame * 2 : 0;
  const hit = animation === 4 ? (frame % 2) * -2 : 0;
  const vanish = animation === 8 ? frame * 3 : 0;
  const x = ox + hit + lean;
  const y = oy + bob + vanish;
  const bodyWidth = (bulky ? 18 : 14) * scale;
  const cx = x + 32 * scale;
  rect(image, cx - 7 * scale, y + 7 * scale, 14 * scale, 12 * scale, hair);
  rect(image, cx - 6 * scale, y + 13 * scale, 12 * scale, 12 * scale, skin);
  rect(image, cx - 5 * scale, y + 13 * scale, 2 * scale, 2 * scale, '#161a24');
  rect(image, cx + 3 * scale, y + 13 * scale, 2 * scale, 2 * scale, '#161a24');
  if (facial === 1) rect(image, cx - 5 * scale, y + 20 * scale, 10 * scale, 4 * scale, hair);
  if (facial === 2) rect(image, cx - 3 * scale, y + 19 * scale, 6 * scale, 2 * scale, hair);
  rect(image, cx - bodyWidth / 2, y + 25 * scale, bodyWidth, 22 * scale, '#3643ba');
  rect(image, cx - bodyWidth / 2, y + 25 * scale, 3 * scale, 22 * scale, '#637bff');
  rect(image, cx - 3 * scale, y + 27 * scale, 6 * scale, 4 * scale, '#f1f3f8');
  if (badge) rect(image, cx + 4 * scale, y + 28 * scale, 3 * scale, 3 * scale, '#ffd447');
  const arm = animation === 2 || animation === 3 ? 8 + frame * 3 : 8;
  rect(image, cx - bodyWidth / 2 - 4 * scale, y + 27 * scale, 5 * scale, arm * scale, skin);
  rect(image, cx + bodyWidth / 2 - scale, y + 27 * scale, 5 * scale, arm * scale, skin);
  if (seed[0] === 'arda' || seed[0] === 'ozgur-sercan') {
    rect(image, cx - bodyWidth / 2 - 3 * scale, y + 31 * scale, 2 * scale, 5 * scale, '#26314f');
    rect(image, cx + bodyWidth / 2 + scale, y + 31 * scale, 2 * scale, 5 * scale, '#26314f');
  }
  rect(image, cx - 8 * scale, y + 47 * scale, 7 * scale, 11 * scale, '#17213e');
  rect(image, cx + scale, y + 47 * scale, 7 * scale, 11 * scale, '#17213e');
  rect(image, cx - 9 * scale, y + 57 * scale, 9 * scale, 4 * scale, seed[0] === 'abdullah' ? '#ffffff' : accent);
  rect(image, cx + scale, y + 57 * scale, 9 * scale, 4 * scale, seed[0] === 'abdullah' ? '#ffffff' : accent);
  if (animation === 3) {
    rect(image, cx + 14 * scale, y + 25 * scale, (7 + frame * 2) * scale, 4 * scale, accent);
    rect(image, cx + 18 * scale, y + 20 * scale, 3 * scale, 3 * scale, '#ffffff');
  }
  if (animation === 5) for (let i = 0; i < 4; i += 1) rect(image, cx - 16 * scale + i * 11 * scale, y + (10 + (i + frame) % 3 * 8) * scale, 3 * scale, 3 * scale, '#4ade80');
  if (animation === 6) { rect(image, cx - 16 * scale, y + 18 * scale, 32 * scale, 30 * scale, [99, 123, 255, 70]); }
  if (animation === 9) { rect(image, cx - 20 * scale, y + 6 * scale, 4 * scale, 4 * scale, '#ffd447'); rect(image, cx + 16 * scale, y + 12 * scale, 4 * scale, 4 * scale, '#ffffff'); }
};

const makeSprites = async () => {
  for (const seed of characterSeeds) {
    const sheet = png(256, 640, '#000000');
    sheet.data.fill(0);
    for (let animation = 0; animation < 10; animation += 1) for (let frame = 0; frame < 4; frame += 1) drawCharacter(sheet, frame * 64, animation * 64, 1, seed, frame, animation);
    await save(sheet, path.join(out, 'characters', `${seed[0]}.png`));
    const portrait = png(128, 128, '#101840');
    for (let i = 0; i < 8; i += 1) rect(portrait, i * 16, 0, 8, 128, i % 2 ? '#151f55' : '#101840');
    rect(portrait, 6, 6, 116, 116, '#243184');
    rect(portrait, 10, 10, 108, 108, seed[3]);
    rect(portrait, 14, 14, 100, 100, '#101840');
    drawCharacter(portrait, 0, 2, 2, seed, 0, 0);
    await save(portrait, path.join(out, 'portraits', `${seed[0]}.png`));
  }
};

const drawBackdrop = (image, base, mid, accent, kind, variant = 0) => {
  rect(image, 0, 0, image.width, image.height, base);
  for (let y = 0; y < image.height; y += 8) rect(image, 0, y, image.width, 4, variant ? `${mid}cc` : mid);
  rect(image, 0, 215, image.width, 145, mid);
  for (let x = 0; x < image.width; x += 64) line(image, 320, 214, x, 360, '#0c1330', 2);
  rect(image, 0, 210, image.width, 6, accent);
  if (['mountain', 'snow', 'trail', 'forest', 'camp'].includes(kind)) {
    for (let x = -80; x < 720; x += 120) {
      const height = 80 + (x % 200 + 200) % 70;
      for (let row = 0; row < height; row += 4) rect(image, x + row / 2, 210 - height + row, 100 - row, 4, row % 12 ? mid : accent);
    }
  }
  if (['field', 'court', 'net', 'track', 'pool', 'ring'].includes(kind)) {
    rect(image, 70, 235, 500, 110, base);
    rect(image, 78, 243, 484, 94, mid);
    line(image, 320, 243, 320, 337, accent, 3);
    if (kind === 'net') { line(image, 130, 265, 510, 265, accent, 3); for (let x = 130; x < 510; x += 16) line(image, x, 265, x, 320, accent, 1); }
    if (kind === 'ring') { rect(image, 135, 250, 370, 75, base); for (let y = 250; y < 320; y += 20) line(image, 125, y, 515, y, accent, 2); }
    if (kind === 'pool') for (let y = 250; y < 338; y += 18) line(image, 80, y, 560, y, accent, 2);
  }
  if (['store', 'checkout', 'desk', 'shelf', 'warehouse', 'break'].includes(kind)) {
    for (let x = 36; x < 620; x += 112) {
      rect(image, x, 75, 76, 130, '#182454');
      for (let y = 85; y < 195; y += 28) { rect(image, x + 5, y, 66, 4, accent); rect(image, x + 10, y - 10, 12, 10, mid); rect(image, x + 30, y - 13, 14, 13, accent); }
    }
  }
  if (['beach', 'ship'].includes(kind)) {
    rect(image, 0, 150, 640, 210, '#0b6fa0');
    for (let y = 160; y < 360; y += 28) for (let x = -20; x < 640; x += 80) line(image, x, y, x + 38, y - 5, accent, 3);
    if (kind === 'ship') { rect(image, 160, 205, 320, 75, '#6d4830'); line(image, 320, 80, 320, 205, accent, 5); }
  }
  if (kind === 'ramps') { rect(image, 90, 270, 160, 60, accent); rect(image, 390, 250, 150, 80, accent); rect(image, 110, 250, 120, 20, base); rect(image, 410, 230, 110, 20, base); }
  if (kind === 'gym') for (let x = 80; x < 580; x += 110) { rect(image, x, 145, 10, 100, accent); rect(image, x - 25, 150, 60, 8, accent); rect(image, x - 18, 140, 8, 28, '#171d2c'); rect(image, x + 20, 140, 8, 28, '#171d2c'); }
  if (kind === 'parking') for (let x = 35; x < 600; x += 145) { rect(image, x, 210, 105, 46, mid); rect(image, x + 15, 194, 66, 22, accent); rect(image, x + 16, 250, 20, 20, '#111827'); rect(image, x + 72, 250, 20, 20, '#111827'); }
};

const makeArenas = async () => {
  for (const [id, base, mid, accent, kind] of arenaSeeds) {
    const image = png(640, 360, base);
    drawBackdrop(image, base, mid, accent, kind);
    await save(image, path.join(out, 'arenas', `${id}.png`));
  }
  const menu = png(960, 540, '#101840');
  drawBackdrop(menu, '#101840', '#3643ba', '#637bff', 'store', 1);
  rect(menu, 0, 360, 960, 180, '#0a102f');
  for (let x = 36; x < 940; x += 95) { rect(menu, x, 275, 26, 58, '#3643ba'); rect(menu, x + 5, 260, 16, 16, '#c98d6f'); rect(menu, x + 3, 333, 8, 20, '#17213e'); rect(menu, x + 15, 333, 8, 20, '#17213e'); }
  await save(menu, path.join(out, 'ui', 'store-menu.png'));
};

const makeEvents = async () => {
  const names = ['MF','AL','HF','LF','MŞ','YM','SG','KK','SA','ST','JE','PK','KS','BS','ÇK','KH','ÜA','RD','İİ','SB','RC','FZ','AD','TZ','KD','MM','MG','PA','BF','EK','SG','MZ','BM','TR','YE','GM','AK'];
  for (let index = 0; index < names.length; index += 1) {
    const image = png(32, 32, index < 20 ? '#243184' : index < 32 ? '#6e318d' : '#9b6815');
    rect(image, 2, 2, 28, 28, index < 20 ? '#3643ba' : index < 32 ? '#8d45b5' : '#d69b20');
    rect(image, 6, 6, 20, 20, '#101840');
    const bits = (index + 3).toString(2).padStart(8, '0');
    for (let bit = 0; bit < 8; bit += 1) if (bits[bit] === '1') rect(image, 7 + bit * 2, 9, 1, 14, '#ffffff');
    await save(image, path.join(out, 'events', `${index + 1}.png`));
  }
};

await mkdir(out, { recursive: true });
await Promise.all([makeSprites(), makeArenas(), makeEvents()]);
if (!existsSync(path.join(out, 'ui', 'store-menu.png'))) throw new Error('Asset üretimi tamamlanamadı.');
console.log(`Pixel-art varlıkları üretildi: ${out}`);
