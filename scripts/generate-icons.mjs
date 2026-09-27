// Genera le icone PNG della PWA (incluso apple-touch-icon per iOS) da scripts/icon.svg
import sharp from 'sharp';
import { readFileSync } from 'node:fs';

const svg = readFileSync(new URL('./icon.svg', import.meta.url));
const out = (name) => new URL(`../public/icons/${name}`, import.meta.url).pathname;

const targets = [
  ['icon-192.png', 192],
  ['icon-512.png', 512],
  ['apple-touch-icon.png', 180],
];
for (const [name, size] of targets) {
  await sharp(svg).resize(size, size).png().toFile(out(name));
}
// Maskable: il logo occupa l'80% centrale, con margine di sicurezza
const inner = await sharp(svg).resize(410, 410).png().toBuffer();
await sharp({ create: { width: 512, height: 512, channels: 4, background: '#0b0f14' } })
  .composite([{ input: inner, gravity: 'center' }])
  .png()
  .toFile(out('icon-maskable-512.png'));
console.log('Icone generate in public/icons');
