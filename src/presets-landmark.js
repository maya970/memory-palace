/** 地标类官方宫殿几何。 */
import { disk } from './presets-lib.js';
import {
  band, capital, chamber, checker, cornice, finish, grid, lancetX, lancetZ, portalZ, shaft, study, teaRoom,
} from './presets-ornament.js';

function pinnacle(g, x, z, y0, h, stone) {
  for (let y = 0; y < h; y += 1) {
    const s = y > h - 3 ? 0 : y > h - 6 ? 1 : 1;
    g.box(x - s, y0 + y, z - s, x + s, y0 + y, z + s, stone);
    if (y % 3 === 0) g.set(x, y0 + y, z + s + 1, 'gold');
  }
  g.set(x, y0 + h, z, 'gold');
}

export function gothicWater() {
  const g = grid();
  g.box(-42, -1, -34, 42, -1, 34, 'dirt');
  g.box(-44, 0, -36, 44, 1, 36, 'water');
  g.box(-18, -1, -26, 18, 3, 18, 'stone_bricks');
  checker(g, -12, 3, -20, 12, 12, 'stone_bricks', 'deepslate');
  g.box(-12, 4, -20, 12, 28, 12, 'stone_bricks', (x, y, z) => x > -12 && x < 12 && z > -20 && z < 12);
  band(g, -12, 10, -20, 12, 12, 'gold');
  band(g, -12, 20, -20, 12, 12, 'gold');
  cornice(g, -12, 28, -20, 12, 12, 'cobblestone');
  for (let z = -16; z <= 8; z += 5) {
    lancetX(g, -12, z, 8, 'stone_bricks', 'glass');
    lancetX(g, 12, z, 8, 'stone_bricks', 'glass');
  }
  for (let x = -8; x <= 8; x += 5) {
    if (Math.abs(x) < 3) continue;
    lancetZ(g, x, -20, 8, 'stone_bricks', 'glass');
  }
  portalZ(g, 0, 12, 4, 'stone_bricks');
  g.carve(-1, 4, 10, 1, 10, 12);
  for (let z = 13; z <= 32; z += 1) {
    g.box(-3, 3, z, 3, 3, z, 'stone_bricks');
    if (z % 2 === 0) {
      g.set(-3, 4, z, 'cobblestone');
      g.set(3, 4, z, 'cobblestone');
    }
    if (z % 6 === 0) {
      g.box(-3, -1, z, -3, 2, z, 'stone_bricks');
      g.box(3, -1, z, 3, 2, z, 'stone_bricks');
      g.set(-3, 5, z, 'gold');
      g.set(3, 5, z, 'gold');
    }
  }
  for (let z = -16; z <= 6; z += 6) {
    shaft(g, -6, z, 4, 22, 'cobblestone');
    shaft(g, 6, z, 4, 22, 'deepslate');
  }
  for (let z = -16; z <= 6; z += 6) {
    for (const side of [-1, 1]) {
      const x = 12 * side;
      g.box(x, 12, z, x + 5 * side, 12, z, 'stone_bricks');
      g.box(x + 5 * side, 12, z, x + 5 * side, 24, z, 'stone_bricks');
      g.box(x + 2 * side, 18, z, x + 5 * side, 18, z, 'cobblestone');
      pinnacle(g, x + 5 * side, z, 25, 10, 'cobblestone');
    }
  }
  for (let x = -10; x <= 10; x += 1) {
    for (let z = -18; z <= 10; z += 1) {
      const ridge = 29 + Math.max(0, 4 - Math.abs(x) / 2);
      g.set(x, Math.floor(ridge), z, Math.abs(x) < 2 ? 'dark_oak_planks' : 'stone_bricks');
      if ((x + z) % 5 === 0) g.set(x, Math.floor(ridge) + 1, z, 'moss');
    }
  }
  pinnacle(g, -10, -20, 29, 16, 'stone_bricks');
  pinnacle(g, 10, -20, 29, 16, 'stone_bricks');
  pinnacle(g, 0, -20, 31, 20, 'deepslate');
  for (let z = -14; z <= 6; z += 3) {
    g.set(-8, 4, z, 'bench');
    g.set(8, 4, z, 'bench');
    g.cover(-8, 4, z, 'cushion');
    g.set(-8, 5, z, 'candle');
  }
  g.set(0, 4, -16, 'sideboard');
  g.cover(0, 4, -16, 'candle');
  g.set(-2, 4, -16, 'gold');
  g.set(2, 4, -16, 'gold');
  g.box(13, 3, -8, 22, 12, 4, 'stone_bricks', (x, y, z) => x > 13 && x < 22 && z > -8 && z < 4);
  checker(g, 14, 3, -7, 21, 3, 'stone_bricks', 'wool_red');
  g.carve(12, 4, -2, 13, 8, 0);
  study(g, 18, 4, -4);
  g.set(16, 4, 1, 'bookshelf');
  g.set(16, 5, 1, 'bookshelf');
  g.set(20, 4, 1, 'chalkboard');
  g.box(-22, 3, -8, -13, 12, 4, 'stone_bricks', (x, y, z) => x > -22 && x < -13 && z > -8 && z < 4);
  checker(g, -21, 3, -7, -14, 3, 'deepslate', 'wool_purple');
  g.carve(-13, 4, -2, -12, 8, 0);
  chamber(g, -18, 4, -4);
  return finish(
    'gothic_water',
    '法国·哥特中厅',
    '从桥走进中厅。两侧有长凳和蜡烛，东厢是圣器室书桌，西厢是有床柜的小室。',
    g,
    { x: 0.5, y: 4, z: 26.5, yaw: Math.PI, pitch: -0.1 },
    '仿法国哥特大教堂中厅与厢房，不是空壳。',
    '法国',
  );
}

export function civicPalace() {
  const g = grid();
  g.box(-32, 0, -12, 32, 0, 36, 'stone');
  g.box(-26, 1, 6, 26, 3, 26, 'stone_bricks');
  for (let s = 0; s < 10; s += 1) {
    const y = 1 + Math.floor(s / 2);
    g.box(-8 + Math.floor(s / 2), y, 26 - s, 8 - Math.floor(s / 2), y, 26 - s, 'quartz');
    if (s % 2 === 0) {
      g.set(-8 + Math.floor(s / 2), y + 1, 26 - s, 'gold');
      g.set(8 - Math.floor(s / 2), y + 1, 26 - s, 'gold');
    }
  }
  checker(g, -22, 3, -16, 22, 10, 'quartz', 'wool_white');
  g.box(-22, 4, -16, 22, 18, 10, 'quartz', (x, y, z) => x > -22 && x < 22 && z > -16 && z < 10);
  band(g, -22, 9, -16, 22, 10, 'gold');
  band(g, -22, 15, -16, 22, 10, 'gold');
  cornice(g, -22, 18, -16, 22, 10, 'quartz');
  for (const x of [-16, -10, -4, 3, 9, 15]) {
    shaft(g, x, 10, 5, 16, 'quartz');
  }
  for (let x = -18; x <= 18; x += 4) {
    if (Math.abs(x) < 3) continue;
    for (let y = 7; y <= 14; y += 5) {
      g.box(x - 1, y - 1, 10, x + 1, y + 2, 10, 'quartz');
      g.set(x, y, 10, 'glass');
      g.set(x, y + 1, 10, 'glass');
      g.set(x, y - 1, 10, 'gold');
    }
  }
  for (let x = -20; x <= 20; x += 1) {
    const rise = 19 + Math.max(0, 7 - Math.abs(x) / 3);
    g.set(x, Math.floor(rise), 11, 'quartz');
    if (x % 2 === 0) g.set(x, Math.floor(rise) - 1, 12, 'wool_green');
    if (x % 4 === 0) g.set(x, Math.floor(rise) + 1, 11, 'gold');
  }
  portalZ(g, 0, 10, 4, 'quartz');
  g.carve(-1, 4, 8, 1, 10, 10);
  for (let z = -12; z <= 6; z += 6) {
    shaft(g, -10, z, 5, 16, 'quartz');
    shaft(g, 10, z, 5, 16, 'quartz');
  }
  study(g, -14, 4, -8);
  study(g, 14, 4, -8);
  g.set(-6, 4, 2, 'oak_table');
  g.cover(-6, 4, 2, 'cloth_red');
  g.set(-4, 4, 2, 'oak_chair');
  g.set(-8, 4, 2, 'oak_chair');
  g.set(6, 4, 2, 'sofa');
  g.cover(6, 4, 2, 'pillow_blue');
  g.set(10, 4, -4, 'chalkboard');
  chamber(g, -18, 4, 4);
  return finish(
    'civic_palace',
    '意大利·柱廊宫殿',
    '台阶进门廊。大厅有长桌、沙发和两侧书房，西翼有卧房。',
    g,
    { x: 0.5, y: 4, z: 22.5, yaw: Math.PI, pitch: -0.12 },
    '仿意大利宫殿门面与一层厅室。',
    '意大利',
  );
}

export function tajExcerpt() {
  const g = grid();
  g.box(-26, -1, -26, 26, -1, 26, 'sand');
  g.box(-28, 0, -28, 28, 0, 28, 'water');
  g.box(-4, 1, 16, 4, 1, 28, 'quartz');
  g.box(-18, 1, -18, 18, 1, 18, 'quartz');
  checker(g, -16, 2, -16, 16, 16, 'quartz', 'wool_white');
  g.box(-16, 3, -16, 16, 16, 16, 'quartz', (x, y, z) => x > -16 && x < 16 && z > -16 && z < 16);
  for (const y of [6, 11, 15]) band(g, -16, y, -16, 16, 16, 'lapis');
  band(g, -16, 8, -16, 16, 16, 'gold');
  cornice(g, -16, 16, -16, 16, 16, 'quartz');
  for (let z = -12; z <= 12; z += 8) {
    lancetX(g, -16, z, 4, 'quartz', 'glass');
    lancetX(g, 16, z, 4, 'quartz', 'glass');
  }
  for (let x = -12; x <= 12; x += 8) {
    if (Math.abs(x) < 4) continue;
    lancetX(g, x, -16, 4, 'quartz', 'glass');
  }
  portalZ(g, 0, 16, 3, 'quartz');
  g.carve(-1, 3, 14, 1, 9, 16);
  for (const [x, z] of [[-16, -16], [16, -16], [-16, 16], [16, 16]]) {
    for (let y = 2; y <= 28; y += 1) {
      g.box(x - 1, y, z - 1, x + 1, y, z + 1, 'quartz');
      if (y % 4 === 0) g.box(x - 2, y, z - 2, x + 2, y, z + 2, 'gold');
    }
    g.set(x, 29, z, 'gold');
  }
  for (let y = 17; y <= 34; y += 1) {
    const t = (y - 17) / 17;
    const r = Math.max(2, Math.round(10 * Math.cos(t * 1.2)));
    const parts = [];
    disk(parts, 0, 0, y, r, y % 3 === 0 ? 'gold' : 'quartz', y === 17 ? 0 : Math.max(0, r - 1));
    for (const row of parts) g.set(row[0], row[1], row[2], row[3]);
  }
  g.set(0, 35, 0, 'gold');
  shaft(g, -6, 0, 3, 14, 'quartz');
  shaft(g, 6, 0, 3, 14, 'quartz');
  g.box(-3, 3, -3, 3, 6, 3, 'quartz', (x, y, z) => Math.abs(x) < 2 && Math.abs(z) < 2 && y > 3);
  g.set(0, 3, 0, 'gold');
  g.set(0, 4, 0, 'lapis');
  g.set(-1, 3, 0, 'gold');
  g.set(1, 3, 0, 'gold');
  for (const z of [-8, 8]) {
    for (let x = -10; x <= 10; x += 4) g.set(x, 3, z, 'wool_white');
  }
  g.set(-10, 3, -10, 'glowstone');
  g.set(10, 3, -10, 'glowstone');
  g.set(-10, 3, 10, 'glowstone');
  g.set(10, 3, 10, 'glowstone');
  study(g, -10, 3, 0);
  chamber(g, 8, 3, 0);
  g.set(4, 3, -10, 'screen');
  g.set(-4, 3, -10, 'screen');
  return finish(
    'taj_excerpt',
    '印度·白石陵墓',
    '石道进门。中央是贴金青金石棺台，两侧有书房和卧房，角上有灯。',
    g,
    { x: 0.5, y: 2, z: 24.5, yaw: Math.PI, pitch: -0.14 },
    '仿印度白石陵的一层厅室，不是空穹顶。',
    '印度',
  );
}

export function longCorridor() {
  const g = grid();
  const x0 = -40;
  const x1 = 40;
  g.box(x0, 0, -2, x1, 0, 8, 'planks');
  checker(g, x0, 1, 0, x1, 6, 'planks', 'dark_oak_planks');
  for (let x = x0; x <= x1; x += 4) {
    for (const z of [0, 6]) {
      g.box(x, 2, z, x, 8, z, 'wool_red');
      g.box(x - 1, 2, z, x + 1, 2, z, 'wool_red');
      capital(g, x, z, 8, 'gold');
    }
    g.box(x, 9, 0, x, 9, 6, 'wool_green');
    g.set(x, 9, 3, 'gold');
    for (let z = 1; z <= 5; z += 1) {
      const paint = ['wool_yellow', 'wool_green', 'wool_blue', 'wool_red', 'wool_yellow'][z];
      g.set(x + 1, 10, z, paint);
      g.set(x - 1, 10, z, paint);
    }
    g.box(x - 1, 11, 0, x + 1, 11, 6, 'dark_oak_planks');
    g.set(x, 12, 3, 'dark_oak_planks');
    for (let y = 3; y <= 7; y += 1) {
      const pane = y % 2 === 0 ? 'glass' : 'wool_black';
      g.set(x + 2, y, 0, pane);
      g.set(x + 2, y, 6, pane);
    }
  }
  g.box(x0, 9, 0, x1, 9, 6, 'wool_green');
  for (let x = x0; x <= x1; x += 2) {
    g.set(x, 9, -1, 'gold');
    g.set(x, 9, 7, 'gold');
  }
  for (const cx of [-24, 0, 24]) {
    g.box(cx - 6, 1, 8, cx + 6, 10, 18, 'planks', (x, y, z) => x > cx - 6 && x < cx + 6 && z > 8 && z < 18);
    g.carve(cx - 1, 2, 6, cx + 1, 6, 8);
    checker(g, cx - 5, 1, 9, cx + 5, 17, 'planks', 'wool_red');
    g.box(cx - 6, 10, 8, cx + 6, 11, 18, 'dark_oak_planks');
  }
  teaRoom(g, -24, 2, 12);
  study(g, 0, 2, 12);
  chamber(g, 22, 2, 12);
  g.set(24, 2, 16, 'screen');
  g.set(-20, 2, 16, 'plant_pot');
  return finish(
    'long_corridor',
    '中国·彩绘长廊',
    '红柱金枋的长廊，北侧三间侧厅：茶室、书房、卧房。',
    g,
    { x: 0.5, y: 2, z: 3.5, yaw: Math.PI / 2, pitch: -0.04 },
    '仿中国园林长廊与侧厅陈设。',
    '中国',
  );
}
