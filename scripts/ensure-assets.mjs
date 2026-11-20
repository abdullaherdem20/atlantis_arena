import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';

const required = [
  'public/assets/ui/store-menu.png',
  'public/assets/arenas/atlantis-magaza.png',
  'public/assets/characters-v2/abdullah.png',
  'public/assets/events/37.png',
].map((file) => path.join(process.cwd(), file));

if (required.every(existsSync)) {
  console.log('Tracked Atlantis Arena assets are present; generation skipped.');
} else {
  const result = spawnSync(process.execPath, ['scripts/generate-assets.mjs'], { stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
