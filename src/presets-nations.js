import {
  band, capital, chamber, checker, cornice, finish, grid, portalZ, shaft, study, teaRoom,
} from './presets-ornament.js';

function torii(g, z) {
  g.box(-4, 1, z, -4, 8, z, 'wool_red');
  g.box(4, 1, z, 4, 8, z, 'wool_red');
  g.box(-5, 8, z, 5, 8, z, 'wool_red');
  g.box(-6, 9, z, 6, 9, z, 'wool_black');
  g.set(-4, 1, z, 'dark_oak_planks');
  g.set(4, 1, z, 'dark_oak_planks');
}

export function japanShrine() {
  const g = grid();
  g.box(-8, 0, -6, 8, 0, 36, 'stone');
  checker(g, -2, 1, 0, 2, 28, 'cobblestone', 'stone');
  torii(g, 30);
  torii(g, 22);
  for (const x of [-6, 6]) {
    g.box(x, 1, 16, x, 3, 16, 'cobblestone');
    g.set(x, 4, 16, 'glowstone');
  }
  g.box(-10, 1, -8, 10, 1, 8, 'dark_oak_planks');
  g.box(-10, 2, -8, 10, 10, 8, 'wool_red', (x, y, z) => x > -10 && x < 10 && z > -8 && z < 8);
  for (const x of [-8, -4, 4, 8]) {
    g.box(x, 2, -8, x, 8, -8, 'wool_red');
    capital(g, x, -8, 8, 'gold');
  }
  for (let x = -9; x <= 9; x += 1) {
    g.set(x, 11, 0, 'dark_oak_planks');
    if (Math.abs(x) > 6) g.set(x, 10, 0, 'wool_black');
  }
  g.box(-9, 11, -7, 9, 12, 7, 'dark_oak_planks');
  portalZ(g, 0, 8, 2, 'dark_oak_planks');
  g.carve(-1, 2, 6, 1, 6, 8);
  checker(g, -8, 2, -6, 8, 6, 'planks', 'dark_oak_planks');
  g.set(0, 2, -4, 'sideboard');
  g.cover(0, 2, -4, 'vase');
  g.set(-2, 2, -4, 'gold');
  g.set(2, 2, -4, 'gold');
  g.set(0, 3, -4, 'wool_white');
  study(g, -6, 2, 0);
  g.set(6, 2, 0, 'screen');
  teaRoom(g, 5, 2, 4);
  g.box(-16, 1, -4, -11, 8, 4, 'dark_oak_planks', (x, y, z) => x > -16 && x < -11 && z > -4 && z < 4);
  g.carve(-11, 2, -1, -10, 5, 1);
  chamber(g, -14, 2, 0);
  return finish(
    'japan_shrine',
    '日本·神社拜殿',
    '鸟居参道走进拜殿。殿内有供桌、书房和茶席，西厢是神职卧房。',
    g,
    { x: 0.5, y: 2, z: 32.5, yaw: Math.PI, pitch: -0.08 },
    '仿日本神社参道与拜殿内部，不是空木屋。',
    '日本',
  );
}

export function egyptHall() {
  const g = grid();
  g.box(-18, 0, -20, 18, 0, 24, 'sandstone');
  checker(g, -16, 1, -18, 16, 16, 'sandstone', 'gold');
  g.box(-16, 2, -18, 16, 14, 16, 'sandstone', (x, y, z) => x > -16 && x < 16 && z > -18 && z < 16);
  for (let z = -12; z <= 10; z += 6) {
    for (const x of [-10, -4, 4, 10]) {
      shaft(g, x, z, 2, 12, 'sandstone');
      for (const y of [4, 8, 11]) band(g, x - 1, y, z - 1, x + 1, z + 1, y === 8 ? 'wool_blue' : 'gold');
    }
  }
  cornice(g, -16, 14, -18, 16, 16, 'gold');
  g.carve(-2, 2, 16, 2, 6, 16);
  g.box(-8, 1, -22, 8, 10, -18, 'sandstone', (x, y, z) => x > -8 && x < 8 && z > -22 && z < -18);
  g.carve(-1, 2, -18, 1, 6, -18);
  g.set(0, 2, -20, 'gold');
  g.set(0, 3, -20, 'gold');
  g.set(0, 4, -20, 'lapis');
  g.set(-3, 2, -20, 'sideboard');
  g.cover(-3, 2, -20, 'candle');
  study(g, -12, 2, 0);
  chamber(g, 10, 2, 8);
  for (let z = -14; z <= 12; z += 4) {
    g.set(-15, 6, z, 'wool_red');
    g.set(15, 6, z, 'wool_blue');
  }
  return finish(
    'egypt_hall',
    '埃及·多柱厅',
    '走进彩柱大厅。尽端神龛有金像和供桌，两侧有书房和卧房。',
    g,
    { x: 0.5, y: 2, z: 20.5, yaw: Math.PI, pitch: -0.1 },
    '仿埃及神庙多柱厅与内室，不是空柱林。',
    '埃及',
  );
}

export function spainPatio() {
  const g = grid();
  checker(g, -14, 1, -14, 14, 14, 'bricks', 'wool_blue');
  g.box(-14, 2, -14, 14, 12, 14, 'bricks', (x, y, z) => x > -14 && x < 14 && z > -14 && z < 14);
  for (let i = -10; i <= 10; i += 5) {
    g.box(i - 1, 4, 14, i + 1, 8, 14, 'bricks');
    g.carve(i, 5, 14, i, 7, 14);
  }
  g.carve(-1, 2, 14, 1, 6, 14);
  g.box(-2, 1, -2, 2, 3, 2, 'stone_bricks');
  g.set(0, 4, 0, 'water');
  g.set(0, 3, 0, 'water');
  cornice(g, -14, 12, -14, 14, 14, 'gold');
  band(g, -14, 8, -14, 14, 14, 'wool_yellow');
  g.box(-14, 2, -22, -4, 10, -14, 'bricks', (x, y, z) => x > -14 && x < -4 && z > -22 && z < -14);
  g.carve(-8, 2, -14, -6, 6, -14);
  teaRoom(g, -10, 2, -18);
  g.box(4, 2, -22, 14, 10, -14, 'bricks', (x, y, z) => x > 4 && x < 14 && z > -22 && z < -14);
  g.carve(8, 2, -14, 10, 6, -14);
  chamber(g, 6, 2, -18);
  study(g, 8, 2, 6);
  g.set(-8, 2, 6, 'sofa');
  g.cover(-8, 2, 6, 'cushion');
  return finish(
    'spain_patio',
    '西班牙·庭院',
    '马蹄券门廊走进瓷砖庭院，中央有水。北侧茶室和卧房，大厅有书桌。',
    g,
    { x: 0.5, y: 2, z: 18.5, yaw: Math.PI, pitch: -0.1 },
    '仿西班牙宫廷庭院与侧厅，不是空天井。',
    '西班牙',
  );
}

export function turkeyMosque() {
  const g = grid();
  checker(g, -16, 1, -16, 16, 16, 'wool_red', 'wool_blue');
  g.box(-16, 2, -16, 16, 16, 16, 'quartz', (x, y, z) => x > -16 && x < 16 && z > -16 && z < 16);
  for (let y = 17; y <= 26; y += 1) {
    const r = Math.max(3, 12 - (y - 17));
    g.box(-r, y, -r, r, y, r, y % 3 === 0 ? 'gold' : 'quartz', (x, _y, z) => x * x + z * z > r * r);
  }
  g.set(0, 27, 0, 'gold');
  portalZ(g, 0, 16, 2, 'quartz');
  g.carve(-1, 2, 14, 1, 7, 16);
  g.box(-3, 2, -16, 3, 10, -14, 'gold');
  g.carve(-1, 2, -15, 1, 8, -14);
  g.set(0, 2, -15, 'wool_green');
  for (const [x, z] of [[-8, -8], [8, -8], [-8, 8], [8, 8]]) g.set(x, 8, z, 'glowstone');
  for (let z = -10; z <= 10; z += 4) {
    g.set(-6, 2, z, 'bench');
    g.set(6, 2, z, 'bench');
  }
  band(g, -16, 12, -16, 16, 16, 'gold');
  study(g, -12, 2, 0);
  g.box(10, 2, -8, 16, 10, 4, 'quartz', (x, y, z) => x > 10 && x < 16 && z > -8 && z < 4);
  g.carve(10, 2, -2, 10, 6, 0);
  chamber(g, 12, 2, -4);
  return finish(
    'turkey_mosque',
    '土耳其·清真寺一角',
    '地毯铺地，壁龛贴金。两侧长凳，东厢书房，侧室卧房，穹顶吊灯。',
    g,
    { x: 0.5, y: 2, z: 20.5, yaw: Math.PI, pitch: -0.12 },
    '仿土耳其清真寺礼拜堂与侧室。',
    '土耳其',
  );
}

export function englandHall() {
  const g = grid();
  checker(g, -12, 1, -8, 12, 20, 'planks', 'dark_oak_planks');
  g.box(-12, 2, -8, 12, 14, 20, 'stone_bricks', (x, y, z) => x > -12 && x < 12 && z > -8 && z < 20);
  for (let z = -6; z <= 18; z += 4) {
    g.box(-12, 2, z, -12, 12, z, 'dark_oak_planks');
    g.box(12, 2, z, 12, 12, z, 'dark_oak_planks');
  }
  for (let x = -10; x <= 10; x += 1) {
    g.set(x, 15, 6, 'dark_oak_planks');
    g.set(x, 14, -8, 'dark_oak_planks');
    g.set(x, 14, 20, 'dark_oak_planks');
  }
  g.carve(-1, 2, 20, 1, 6, 20);
  g.box(-3, 2, -8, 3, 8, -6, 'bricks');
  g.set(0, 3, -7, 'glowstone');
  g.set(-2, 4, -7, 'wool_red');
  g.set(2, 4, -7, 'wool_red');
  for (let z = 0; z <= 14; z += 2) {
    g.set(-4, 2, z, 'oak_chair');
    g.set(4, 2, z, 'oak_chair');
  }
  g.box(-2, 2, 4, 2, 2, 12, 'oak_table');
  g.cover(0, 2, 8, 'cloth_red');
  g.cover(0, 2, 6, 'fruit_bowl');
  g.set(-10, 4, 4, 'wool_red');
  g.set(-10, 5, 4, 'wool_yellow');
  g.set(-10, 6, 4, 'wool_red');
  g.set(10, 4, 4, 'wool_blue');
  g.set(10, 5, 4, 'wool_yellow');
  study(g, -8, 2, 16);
  g.box(4, 2, 20, 12, 10, 28, 'stone_bricks', (x, y, z) => x > 4 && x < 12 && z > 20 && z < 28);
  g.carve(7, 2, 20, 9, 6, 20);
  chamber(g, 6, 2, 24);
  return finish(
    'england_hall',
    '英国·大厅',
    '壁炉、长桌、挂毯和两侧座椅。尽端书房，侧室卧房。',
    g,
    { x: 0.5, y: 2, z: 24.5, yaw: Math.PI, pitch: -0.08 },
    '仿英国庄园大厅与太阳能卧房。',
    '英国',
  );
}

export function russiaChurch() {
  const g = grid();
  checker(g, -12, 1, -12, 12, 12, 'quartz', 'wool_red');
  g.box(-12, 2, -12, 12, 16, 12, 'quartz', (x, y, z) => x > -12 && x < 12 && z > -12 && z < 12);
  for (const [x, z] of [[-8, -8], [8, -8], [-8, 8], [8, 8], [0, 0]]) {
    for (let y = 17; y <= 24; y += 1) {
      const r = y > 21 ? 1 : 2;
      g.box(x - r, y, z - r, x + r, y, z + r, y % 2 ? 'gold' : 'wool_green');
    }
    g.set(x, 25, z, 'gold');
  }
  portalZ(g, 0, 12, 2, 'quartz');
  g.carve(-1, 2, 10, 1, 7, 12);
  for (let x = -8; x <= 8; x += 2) {
    g.set(x, 2, -10, 'gold');
    g.set(x, 3, -10, x % 4 === 0 ? 'wool_red' : 'wool_blue');
    g.set(x, 4, -10, 'gold');
  }
  for (let z = -6; z <= 6; z += 3) {
    g.set(-6, 2, z, 'bench');
    g.set(6, 2, z, 'bench');
  }
  g.set(0, 2, -8, 'sideboard');
  g.cover(0, 2, -8, 'candle');
  study(g, -8, 2, 4);
  g.box(6, 2, -4, 12, 10, 6, 'quartz', (x, y, z) => x > 6 && x < 12 && z > -4 && z < 6);
  g.carve(6, 2, 0, 6, 6, 2);
  chamber(g, 8, 2, 0);
  return finish(
    'russia_church',
    '俄罗斯·洋葱顶教堂',
    '走进圣像壁前。两侧长凳，北侧书房，侧室卧房，五座金顶。',
    g,
    { x: 0.5, y: 2, z: 16.5, yaw: Math.PI, pitch: -0.12 },
    '仿俄罗斯教堂正殿与侧室。',
    '俄罗斯',
  );
}

export function nationPalaces() {
  return [japanShrine(), egyptHall(), spainPatio(), turkeyMosque(), englandHall(), russiaChurch()];
}
