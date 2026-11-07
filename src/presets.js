import { extraPalaces } from './presets-extra.js';
import { add, box, disk, door, room } from './presets-lib.js';
import { SPAWN } from './palace.js';

export { add, box, disk, door, kit, palace, room, SOUTH } from './presets-lib.js';

function courtyard() {
  const placed = [];
  box(placed, -16, 1, -16, 16, 3, 16, 'bricks', (x, _y, z) => x > -16 && x < 16 && z > -16 && z < 16);
  box(placed, -16, 4, -16, 16, 4, 16, 'bricks', (x, _y, z) => x > -16 && x < 16 && z > -16 && z < 16);
  box(placed, -10, 0, -10, 10, 0, 10, 'stone');
  room(placed, -15, 8, 15, 15, 'planks', 'planks', 'dark_oak_planks', 4);
  room(placed, -15, -15, 15, -8, 'planks', 'planks', 'dark_oak_planks', 4);
  room(placed, 8, -7, 15, 7, 'planks', 'planks', 'dark_oak_planks', 4);
  room(placed, -15, -7, -8, 7, 'planks', 'planks', 'dark_oak_planks', 4);
  door(placed, 0, 1, 2, 8);
  door(placed, 0, 1, 2, -8);
  door(placed, 8, 1, 2, 0);
  door(placed, -8, 1, 2, 0);
  door(placed, 0, 1, 2, 16);
  add(placed, 0, 1, 12, 'bookshelf');
  add(placed, -3, 1, 12, 'writing_desk');
  add(placed, -3, 2, 12, 'open_notebook');
  add(placed, 3, 1, 12, 'oak_chair');
  add(placed, 12, 1, 0, 'bed');
  add(placed, 12, 2, 0, 'sheet_white');
  add(placed, 12, 2, 1, 'pillow_white');
  add(placed, 14, 1, 3, 'wardrobe');
  add(placed, 14, 1, 2, 'coat');
  add(placed, -12, 1, 0, 'oak_table');
  add(placed, -12, 2, 0, 'cloth_red');
  add(placed, -11, 1, 0, 'teapot');
  add(placed, -10, 1, 0, 'oak_chair');
  add(placed, -14, 1, 2, 'cabinet');
  add(placed, 0, 1, -12, 'chalkboard');
  add(placed, 2, 1, -12, 'bookshelf');
  add(placed, -2, 1, -12, 'stool');
  return {
    id: 'courtyard',
    name: '四合院',
    lead: '四面有屋顶的房间围着天井。北屋书桌，东屋卧房，西屋茶桌，南屋黑板。',
    credit: '宫殿自制，对照现实四合院的天井与厢房，不是某个现成地图。',
    spawn: { x: 0.5, y: 1, z: 0.5, yaw: 0, pitch: -0.08 },
    world: { removed: [], placed },
  };
}

function keep() {
  const placed = [];
  room(placed, -8, -8, 8, 8, 'stone_bricks', 'stone', 'stone_bricks', 5);
  box(placed, -8, 6, -8, 8, 7, 8, 'cobblestone', (x, y, z) => x > -8 && x < 8 && z > -8 && z < 8 && y === 6);
  box(placed, -8, 7, -8, 8, 7, 8, 'cobblestone', (x, y, z) => !(x === -8 || x === 8 || z === -8 || z === 8 || (x + z) % 2 === 0));
  door(placed, 0, 1, 2, 8);
  add(placed, 0, 3, 8, 'glass');
  box(placed, -7, 3, -7, 7, 3, 7, 'planks');
  add(placed, 3, 1, 3, 'planks');
  add(placed, 3, 2, 3, 'planks');
  add(placed, -4, 1, -2, 'oak_table');
  add(placed, -4, 2, -2, 'candle');
  add(placed, -2, 1, -2, 'bench');
  add(placed, 2, 1, -2, 'bench');
  add(placed, 5, 1, 5, 'bookshelf');
  add(placed, -5, 1, 5, 'bookshelf');
  add(placed, -5, 4, -5, 'bed');
  add(placed, -5, 5, -5, 'quilt_patch');
  add(placed, -3, 4, -5, 'nightstand');
  add(placed, 5, 4, -5, 'wardrobe');
  add(placed, 0, 4, 0, 'bookshelf');
  return {
    id: 'keep',
    name: '石砌堡垒',
    lead: '两层石头房间，下层大厅，上层卧房。对照欧洲砖石城堡的体量，不是魔戒或任何影视场景。',
    credit: '宫殿自制。',
    spawn: { x: 0.5, y: 1, z: 6.5, yaw: Math.PI, pitch: -0.08 },
    world: { removed: [], placed },
  };
}

function libraryHall() {
  const placed = [];
  room(placed, -18, -6, 18, 6, 'quartz', 'planks', 'quartz', 6);
  for (let x = -16; x <= 16; x += 2) {
    if (Math.abs(x) < 2) continue;
    add(placed, x, 1, -5, 'bookshelf');
    add(placed, x, 2, -5, 'bookshelf');
    add(placed, x, 1, 5, 'bookshelf');
    add(placed, x, 2, 5, 'bookshelf');
  }
  for (let x = -15; x <= 15; x += 5) {
    add(placed, x, 3, -6, 'glass');
    add(placed, x, 3, 6, 'glass');
  }
  door(placed, 0, 1, 2, 6);
  add(placed, -4, 1, 0, 'writing_desk');
  add(placed, -4, 2, 0, 'desk_lamp');
  add(placed, -2, 1, 0, 'oak_chair');
  add(placed, 4, 1, 0, 'writing_desk');
  add(placed, 4, 2, 0, 'open_notebook');
  add(placed, 6, 1, 0, 'oak_chair');
  add(placed, 0, 1, -2, 'oak_table');
  add(placed, 0, 2, -2, 'cloth_linen');
  add(placed, 1, 1, -2, 'book_stack');
  return {
    id: 'library',
    name: '长厅藏书楼',
    lead: '一条有屋顶的长厅，两侧都是书架，中间两张书桌。',
    credit: '宫殿自制，对照修道院藏书廊的长向房间。',
    spawn: { x: 0.5, y: 1, z: 3.5, yaw: Math.PI, pitch: -0.08 },
    world: { removed: [], placed },
  };
}

function townhouse() {
  const placed = [];
  room(placed, -5, -8, 5, 8, 'bricks', 'planks', 'dark_oak_planks', 4);
  box(placed, -5, 5, -8, 5, 8, 8, 'bricks', (x, y, z) => x > -5 && x < 5 && z > -8 && z < 8 && y < 8);
  box(placed, -5, 8, -8, 5, 8, 8, 'dark_oak_planks');
  box(placed, -4, 4, -7, 4, 4, 7, 'planks');
  door(placed, 0, 1, 2, 8);
  add(placed, 0, 3, 8, 'glass');
  add(placed, -3, 3, 8, 'glass');
  add(placed, 3, 3, 8, 'glass');
  add(placed, 4, 1, 4, 'planks');
  add(placed, 4, 2, 4, 'planks');
  add(placed, 4, 3, 4, 'planks');
  add(placed, -3, 1, -4, 'oak_table');
  add(placed, -3, 2, -4, 'cloth_check');
  add(placed, -2, 1, -4, 'teacup');
  add(placed, -1, 1, -4, 'oak_chair');
  add(placed, 3, 1, -5, 'bookshelf');
  add(placed, -3, 1, 4, 'sofa');
  add(placed, -3, 2, 4, 'cushion');
  add(placed, 3, 1, 2, 'sideboard');
  add(placed, -3, 5, -5, 'bed');
  add(placed, -3, 6, -5, 'sheet_navy');
  add(placed, -3, 6, -4, 'pillow_blue');
  add(placed, 3, 5, -5, 'wardrobe');
  add(placed, 3, 5, -3, 'dresser');
  add(placed, 3, 6, -3, 'shirt');
  add(placed, 0, 5, 0, 'writing_desk');
  add(placed, 0, 6, 0, 'open_notebook');
  add(placed, 1, 5, 0, 'ink_pen');
  add(placed, 2, 5, 0, 'oak_chair');
  return {
    id: 'townhouse',
    name: '两层街屋',
    lead: '楼下起居，楼上卧房。对照普通城市联排住宅的进深，不是某座名楼。',
    credit: '宫殿自制。',
    spawn: { x: 0.5, y: 1, z: 6.5, yaw: Math.PI, pitch: -0.08 },
    world: { removed: [], placed },
  };
}

function station() {
  const placed = [];
  room(placed, -20, -7, 20, 7, 'stone_bricks', 'stone', 'quartz', 7);
  for (let x = -18; x <= 18; x += 4) {
    add(placed, x, 3, -7, 'glass');
    add(placed, x, 4, -7, 'glass');
    add(placed, x, 3, 7, 'glass');
    add(placed, x, 4, 7, 'glass');
  }
  door(placed, 0, 1, 3, 7);
  box(placed, -18, 0, -2, 18, 0, 2, 'stone');
  box(placed, -18, 0, -6, 18, 0, -4, 'blackstone');
  box(placed, -18, 0, 4, 18, 0, 6, 'blackstone');
  for (let x = -16; x <= 16; x += 8) {
    add(placed, x, 1, 0, 'iron');
    add(placed, x, 2, 0, 'iron');
    add(placed, x, 3, 0, 'glowstone');
  }
  add(placed, -16, 1, 5, 'bench');
  add(placed, -12, 1, 5, 'bench');
  add(placed, 12, 1, 5, 'bench');
  add(placed, 16, 1, 5, 'bench');
  add(placed, -8, 1, 5, 'writing_desk');
  add(placed, -8, 2, 5, 'clock');
  add(placed, 8, 1, -5, 'bookshelf');
  add(placed, 10, 1, -5, 'chalkboard');
  add(placed, 0, 1, -5, 'oak_table');
  add(placed, 0, 2, -5, 'cloth_linen');
  add(placed, 2, 1, -5, 'oak_chair');
  return {
    id: 'station',
    name: '火车站大厅',
    lead: '缩小的石砌站厅：中间是站台走向，两侧有候车长椅和一间问询桌。',
    credit: '宫殿自制的通用火车站轮廓，不是某座真实车站的测绘复制。',
    spawn: { x: 0.5, y: 1, z: 5.5, yaw: Math.PI, pitch: -0.08 },
    world: { removed: [], placed },
  };
}

function liberty() {
  const placed = [];
  room(placed, -6, -6, 6, 6, 'stone_bricks', 'stone', 'stone_bricks', 6);
  door(placed, 0, 1, 2, 6);
  add(placed, -3, 1, 0, 'bookshelf');
  add(placed, 3, 1, 0, 'writing_desk');
  add(placed, 3, 2, 0, 'open_notebook');
  add(placed, 0, 1, -3, 'bench');
  box(placed, -5, 7, -5, 5, 8, 5, 'stone_bricks');
  disk(placed, 0, 0, 9, 4, 'copper');
  disk(placed, 0, 0, 10, 3, 'copper');
  box(placed, -1, 11, -1, 1, 18, 1, 'copper');
  add(placed, -2, 12, 0, 'copper');
  add(placed, 2, 12, 0, 'copper');
  add(placed, -3, 13, 0, 'copper');
  add(placed, 3, 13, 0, 'copper');
  add(placed, -2, 14, 0, 'copper');
  add(placed, 2, 14, 0, 'copper');
  box(placed, -1, 19, -1, 1, 21, 1, 'copper');
  box(placed, 2, 17, 0, 6, 18, 0, 'copper');
  add(placed, 7, 18, 0, 'copper');
  add(placed, 7, 19, 0, 'glowstone');
  add(placed, 7, 20, 0, 'glowstone');
  add(placed, 0, 22, 0, 'copper');
  return {
    id: 'liberty',
    name: '自由女神小像',
    lead: '座基里是一间有屋顶的房间，上面是缩小的铜像和火炬。雕像本体 1886 年，作者已进入公有领域。',
    credit: '宫殿自制的方块轮廓，向 Bartholdi 的公有领域雕塑致敬，不是官方授权模型。',
    spawn: { x: 0.5, y: 1, z: 4.5, yaw: Math.PI, pitch: -0.08 },
    world: { removed: [], placed },
  };
}

function latticeTower() {
  const placed = [];
  room(placed, -6, -6, 6, 6, 'iron', 'stone', 'iron', 5);
  door(placed, 0, 1, 2, 6);
  add(placed, -3, 1, 0, 'writing_desk');
  add(placed, -3, 2, 0, 'desk_lamp');
  add(placed, 3, 1, 0, 'bookshelf');
  add(placed, 0, 1, -3, 'oak_chair');
  for (let y = 6; y <= 24; y += 1) {
    const stripe = Math.floor(y / 2) % 2 === 0 ? 'wool_red' : 'wool_white';
    const r = y > 18 ? 2 : y > 12 ? 3 : 4;
    disk(placed, 0, 0, y, r, stripe, Math.max(0, r - 1));
    add(placed, 0, y, 0, 'iron');
  }
  box(placed, -3, 12, -3, 3, 13, 3, 'iron');
  box(placed, -2, 12, -2, 2, 12, 2, 'planks');
  add(placed, 0, 12, 0, 'clock');
  add(placed, -2, 12, 0, 'open_notebook');
  box(placed, -2, 24, -2, 2, 25, 2, 'iron');
  add(placed, 0, 25, 0, 'glowstone');
  return {
    id: 'lattice',
    name: '红白铁塔',
    lead: '底层有房间，中段有展望层。轮廓接近格子铁塔，红白相间。',
    credit: '宫殿自制。东京塔等现代商标建筑没有官方授权，这是通用望塔，不是那一座。',
    spawn: { x: 0.5, y: 1, z: 4.5, yaw: Math.PI, pitch: -0.08 },
    world: { removed: [], placed },
  };
}

function wizardSpire() {
  const placed = [];
  for (let y = 0; y <= 22; y += 1) {
    const r = y > 16 ? 3 : y > 8 ? 4 : 5;
    disk(placed, 0, 0, y, r, y % 5 === 0 ? 'deepslate' : 'cobblestone', y === 0 ? 0 : r - 1);
  }
  disk(placed, 0, 0, 0, 5, 'deepslate');
  disk(placed, 0, 0, 8, 4, 'blackstone');
  disk(placed, 0, 0, 16, 3, 'blackstone');
  disk(placed, 0, 0, 23, 4, 'obsidian');
  add(placed, 0, 24, 0, 'glowstone');
  for (let y = 1; y <= 7; y += 1) {
    const i = placed.findIndex((item) => item[0] === 0 && item[1] === y && item[2] === 5);
    if (i >= 0) placed.splice(i, 1);
  }
  add(placed, -2, 1, -1, 'bookshelf');
  add(placed, 2, 1, -1, 'writing_desk');
  add(placed, 2, 2, -1, 'candle');
  add(placed, 0, 1, -2, 'oak_chair');
  add(placed, -1, 9, 0, 'bed');
  add(placed, -1, 10, 0, 'sheet_rose');
  add(placed, 1, 9, 0, 'bookshelf');
  add(placed, 0, 17, 0, 'chalkboard');
  add(placed, 1, 17, 0, 'open_notebook');
  return {
    id: 'spire',
    name: '巫师尖塔',
    lead: '三层圆形塔楼，底层书房，中层卧房，顶层观测室。',
    credit: '宫殿自制的奇幻塔，不是某部小说或电影里的塔。',
    spawn: { x: 0.5, y: 1, z: 3.5, yaw: Math.PI, pitch: -0.08 },
    world: { removed: [], placed },
  };
}

function crystalGrotto() {
  const placed = [];
  disk(placed, 0, 0, 0, 12, 'deepslate');
  for (let y = 1; y <= 6; y += 1) disk(placed, 0, 0, y, 12, 'deepslate', 10);
  disk(placed, 0, 0, 7, 12, 'deepslate');
  for (let i = 0; i < 18; i += 1) {
    const a = (i / 18) * Math.PI * 2;
    add(placed, Math.round(Math.cos(a) * 7), 1 + (i % 3), Math.round(Math.sin(a) * 7), i % 2 ? 'ice' : 'glowstone');
  }
  for (let y = 1; y <= 3; y += 1) {
    const i = placed.findIndex((item) => item[0] === 0 && item[1] === y && item[2] === 11);
    if (i >= 0) placed.splice(i, 1);
  }
  add(placed, 0, 1, 0, 'oak_table');
  add(placed, 0, 2, 0, 'candle');
  add(placed, -3, 1, 0, 'bookshelf');
  add(placed, 3, 1, 0, 'writing_desk');
  add(placed, 3, 2, 0, 'open_notebook');
  add(placed, 0, 1, -4, 'bed');
  add(placed, 0, 2, -4, 'quilt_patch');
  add(placed, 5, 1, 3, 'sofa');
  return {
    id: 'grotto',
    name: '晶石洞穴',
    lead: '封闭岩洞，冰和荧石当钟乳，中间有桌椅和一张床。',
    credit: '宫殿自制的奇幻洞窟，不是魔戒里的矿坑或任何现成地图。',
    spawn: { x: 0.5, y: 1, z: 8.5, yaw: Math.PI, pitch: -0.08 },
    world: { removed: [], placed },
  };
}

export const PALACE_PRESETS = [
  courtyard(),
  keep(),
  libraryHall(),
  townhouse(),
  station(),
  liberty(),
  latticeTower(),
  wizardSpire(),
  crystalGrotto(),
  ...extraPalaces(),
];

export function palaceById(id) {
  return PALACE_PRESETS.find((item) => item.id === id) || null;
}

export const DEFAULT_SPAWN = SPAWN;
