/** 官方宫殿目录入口，聚合各 presets-* 数据包。 */
import { worldPalaces } from './presets-worlds.js';
import { SPAWN } from './palace.js';

export { add, box, disk, door, kit, palace, room, SOUTH } from './presets-lib.js';

export const PALACE_PRESETS = worldPalaces();

export function palaceById(id) {
  return PALACE_PRESETS.find((item) => item.id === id) || null;
}

export const DEFAULT_SPAWN = SPAWN;
