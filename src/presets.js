import { civicPalace, gothicWater, longCorridor, tajExcerpt } from './presets-landmark.js';
import { nationPalaces } from './presets-nations.js';
import { SPAWN } from './palace.js';

export { add, box, disk, door, kit, palace, room, SOUTH } from './presets-lib.js';

export const PALACE_PRESETS = [
  gothicWater(),
  civicPalace(),
  tajExcerpt(),
  longCorridor(),
  ...nationPalaces(),
];

export function palaceById(id) {
  return PALACE_PRESETS.find((item) => item.id === id) || null;
}

export const DEFAULT_SPAWN = SPAWN;
