import { add, box, disk, door, kit, palace, room } from './presets-lib.js';

function columns(placed, x0, z0, x1, z1, y0, y1, type, step = 3) {
  for (let z = z0; z <= z1; z += step) {
    for (let x = x0; x <= x1; x += step) {
      if (x > x0 && x < x1 && z > z0 && z < z1) continue;
      box(placed, x, y0, z, x, y1, z, type);
    }
  }
}

function pyramid() {
  const placed = [];
  for (let y = 0; y <= 12; y += 1) {
    const r = 12 - y;
    box(placed, -r, y, -r, r, y, r, 'sandstone');
  }
  box(placed, -3, 1, -3, 3, 4, 3, 'sandstone', (x, _y, z) => x > -3 && x < 3 && z > -3 && z < 3);
  box(placed, -3, 5, -3, 3, 5, 3, 'sandstone');
  door(placed, 0, 1, 2, 3);
  kit(placed, -1, 0);
  add(placed, 0, 1, -2, 'gold');
  return palace('pyramid', '金字塔墓室', '砂岩层层收分，内部有一间封闭墓室。对照古埃及陵墓类型。', placed, { x: 0.5, y: 1, z: 2.5, yaw: Math.PI, pitch: -0.08 });
}

function parthenon() {
  const placed = [];
  box(placed, -10, 0, -6, 10, 0, 6, 'quartz');
  columns(placed, -10, -6, 10, 6, 1, 5, 'quartz', 4);
  room(placed, -6, -3, 6, 3, 'quartz', 'quartz', 'quartz', 6);
  door(placed, 0, 1, 2, 3);
  kit(placed);
  add(placed, 0, 1, -1, 'oak_chair');
  return palace('parthenon', '希腊柱廊神庙', '外围一圈柱，中间封闭神室。对照古典希腊围柱式神庙。', placed);
}

function colosseum() {
  const placed = [];
  for (let y = 0; y <= 8; y += 1) {
    disk(placed, 0, 0, y, 14, 'bricks', 12);
  }
  disk(placed, 0, 0, 0, 11, 'sand');
  disk(placed, 0, 0, 9, 14, 'bricks', 10);
  room(placed, -4, 8, 4, 13, 'bricks', 'stone', 'bricks', 4);
  door(placed, 0, 1, 2, 12);
  kit(placed, -1, 10);
  return palace('colosseum', '圆形竞技场', '椭圆石环看台，北侧有一间有屋顶的准备室。对照罗马圆形剧场。', placed, { x: 0.5, y: 1, z: 11.5, yaw: Math.PI, pitch: -0.08 });
}

function pantheon() {
  const placed = [];
  for (let y = 0; y <= 8; y += 1) disk(placed, 0, 0, y, 8, 'stone_bricks', y === 0 ? 0 : 7);
  disk(placed, 0, 0, 9, 8, 'stone_bricks', 2);
  disk(placed, 0, 0, 0, 7, 'quartz');
  for (let y = 1; y <= 3; y += 1) {
    const i = placed.findIndex((item) => item[0] === 0 && item[1] === y && item[2] === 8);
    if (i >= 0) placed.splice(i, 1);
  }
  kit(placed);
  add(placed, 0, 1, -4, 'bench');
  return palace('pantheon', '穹顶万神殿', '圆形大厅，顶上留着眼洞。对照罗马万神殿这一类穹顶神庙。', placed);
}

function ziggurat() {
  const placed = [];
  for (const [y, r] of [[0, 12], [3, 9], [6, 6], [9, 3]]) {
    box(placed, -r, y, -r, r, y + 2, r, 'clay');
  }
  room(placed, -2, -2, 2, 2, 'clay', 'clay', 'clay', 4);
  box(placed, -2, 10, -2, 2, 12, 2, 'clay');
  door(placed, 0, 1, 2, 2);
  kit(placed);
  return palace('ziggurat', '层台塔庙', '四级收分台，顶上小神室。对照两河流域塔庙。', placed);
}

function maya() {
  const placed = [];
  for (let y = 0; y <= 10; y += 1) {
    const r = 11 - y;
    box(placed, -r, y, -r, r, y, r, 'moss');
  }
  room(placed, -3, -3, 3, 3, 'stone_bricks', 'stone', 'stone_bricks', 4);
  door(placed, 0, 1, 2, 3);
  kit(placed);
  add(placed, 0, 11, 0, 'glowstone');
  return palace('maya', '丛林金字塔', '长满苔藓的阶梯金字塔，内部有神室。对照中美洲金字塔神庙。', placed);
}

function pagoda() {
  const placed = [];
  for (let tier = 0; tier < 4; tier += 1) {
    const y = tier * 4;
    const r = 6 - tier;
    room(placed, -r, -r, r, r, 'spruce_planks', 'planks', 'dark_oak_planks', 4);
    box(placed, -r - 1, y + 3, -r - 1, r + 1, y + 3, r + 1, 'dark_oak_planks', (x, _yy, z) => Math.abs(x) < r && Math.abs(z) < r);
  }
  door(placed, 0, 1, 2, 6);
  kit(placed);
  add(placed, 0, 1, -3, 'oak_chair');
  return palace('pagoda', '木塔', '四层出檐木塔，每层都是房间。对照东亚楼阁式塔。', placed);
}

function tenshu() {
  const placed = [];
  room(placed, -7, -7, 7, 7, 'wool_white', 'planks', 'dark_oak_planks', 5);
  box(placed, -7, 1, -7, 7, 4, 7, 'wool_white', (x, _y, z) => x > -7 && x < 7 && z > -7 && z < 7);
  room(placed, -5, -5, 5, 5, 'wool_white', 'planks', 'dark_oak_planks', 4);
  box(placed, -5, 6, -5, 5, 9, 5, 'wool_white');
  box(placed, -4, 9, -4, 4, 9, 4, 'planks');
  box(placed, -3, 10, -3, 3, 13, 3, 'wool_white');
  box(placed, -3, 14, -3, 3, 14, 3, 'dark_oak_planks');
  door(placed, 0, 1, 2, 7);
  kit(placed);
  add(placed, 4, 1, 0, 'coat_rack');
  add(placed, -4, 1, 3, 'bed');
  add(placed, -4, 2, 3, 'sheet_navy');
  return palace('tenshu', '天守阁', '白壁层层收分，底层大厅。对照日本城郭天守。', placed);
}

function mosque() {
  const placed = [];
  room(placed, -8, -8, 8, 8, 'sandstone', 'quartz', 'sandstone', 6);
  for (let y = 7; y <= 11; y += 1) disk(placed, 0, 0, y, 12 - y, 'quartz', y === 11 ? 0 : 12 - y - 1);
  box(placed, 10, 1, -2, 12, 16, 0, 'sandstone');
  add(placed, 11, 17, -1, 'gold');
  door(placed, 0, 1, 2, 8);
  kit(placed);
  add(placed, 0, 1, -5, 'cushion');
  add(placed, -4, 1, 0, 'bench');
  add(placed, 4, 1, 0, 'bench');
  return palace('mosque', '穹顶礼拜殿', '方形殿加穹顶，一侧有宣礼塔。对照伊斯兰聚礼清真寺类型。', placed);
}

function stupa() {
  const placed = [];
  disk(placed, 0, 0, 0, 8, 'quartz');
  disk(placed, 0, 0, 1, 7, 'quartz');
  for (let y = 2; y <= 7; y += 1) disk(placed, 0, 0, y, 6, 'quartz', 5);
  disk(placed, 0, 0, 8, 6, 'quartz');
  box(placed, -1, 9, -1, 1, 14, 1, 'quartz');
  add(placed, 0, 15, 0, 'gold');
  for (let y = 1; y <= 2; y += 1) {
    const i = placed.findIndex((item) => item[0] === 0 && item[1] === y && item[2] === 6);
    if (i >= 0) placed.splice(i, 1);
  }
  kit(placed);
  return palace('stupa', '覆钵塔', '圆形覆钵，内部有绕行小室。对照佛塔覆钵式。', placed);
}

function longhouse() {
  const placed = [];
  room(placed, -14, -4, 14, 4, 'spruce_log', 'spruce_planks', 'spruce_planks', 5);
  for (let x = -12; x <= 12; x += 4) add(placed, x, 3, 0, 'spruce_log');
  door(placed, 0, 1, 2, 4);
  kit(placed, -8, 0);
  add(placed, 0, 1, 0, 'oak_table');
  add(placed, 8, 1, -2, 'bed');
  add(placed, 8, 2, -2, 'quilt_patch');
  add(placed, 10, 1, 2, 'bench');
  return palace('longhouse', '长屋', '原木长厅，火塘在中间。对照北欧和日耳曼长屋。', placed);
}

function mill() {
  const placed = [];
  for (let y = 0; y <= 10; y += 1) disk(placed, 0, 0, y, 4, 'planks', y === 0 ? 0 : 3);
  disk(placed, 0, 0, 11, 4, 'spruce_planks');
  box(placed, 5, 6, -1, 11, 7, 1, 'wool_white');
  box(placed, -11, 6, -1, -5, 7, 1, 'wool_white');
  box(placed, -1, 6, 5, 1, 7, 11, 'wool_white');
  box(placed, -1, 6, -11, 1, 7, -5, 'wool_white');
  for (let y = 1; y <= 2; y += 1) {
    const i = placed.findIndex((item) => item[0] === 0 && item[1] === y && item[2] === 4);
    if (i >= 0) placed.splice(i, 1);
  }
  kit(placed);
  return palace('mill', '风车磨坊', '圆塔磨房，四面风叶。对照欧洲乡村风车。', placed);
}

function lighthouse() {
  const placed = [];
  for (let y = 0; y <= 18; y += 1) {
    const r = y > 12 ? 2 : 3;
    disk(placed, 0, 0, y, r, y % 4 < 2 ? 'wool_white' : 'wool_red', y === 0 ? 0 : r - 1);
  }
  disk(placed, 0, 0, 0, 3, 'stone');
  disk(placed, 0, 0, 8, 3, 'planks');
  disk(placed, 0, 0, 19, 3, 'iron');
  add(placed, 0, 20, 0, 'glowstone');
  for (let y = 1; y <= 2; y += 1) {
    const i = placed.findIndex((item) => item[0] === 0 && item[1] === y && item[2] === 3);
    if (i >= 0) placed.splice(i, 1);
  }
  kit(placed);
  return palace('lighthouse', '灯塔', '红白相间圆塔，顶上有灯。对照古代航标塔类型。', placed);
}

function theatre() {
  const placed = [];
  for (let r = 4; r <= 12; r += 2) {
    const y = Math.floor((r - 4) / 2);
    disk(placed, 0, 0, y, r, 'stone_bricks', r - 2);
  }
  room(placed, -4, 8, 4, 14, 'stone_bricks', 'planks', 'stone_bricks', 4);
  door(placed, 0, 1, 2, 14);
  kit(placed, -1, 11);
  add(placed, 0, 1, 10, 'chalkboard');
  return palace('theatre', '露天剧场', '半圆石阶看台，后台有一间有屋顶的化妆室。对照希腊剧场。', placed, { x: 0.5, y: 1, z: 12.5, yaw: Math.PI, pitch: -0.08 });
}

function aqueduct() {
  const placed = [];
  for (let x = -16; x <= 16; x += 5) {
    box(placed, x, 1, -1, x + 1, 6, 1, 'stone_bricks');
    box(placed, x + 2, 4, -1, x + 3, 6, 1, 'stone_bricks');
  }
  box(placed, -16, 7, -1, 16, 8, 1, 'stone_bricks');
  room(placed, -4, 4, 4, 10, 'stone_bricks', 'stone', 'stone_bricks', 4);
  door(placed, 0, 1, 2, 10);
  kit(placed, -1, 7);
  return palace('aqueduct', '渡槽水房', '一排石拱，边上有蓄水小屋。对照罗马渡槽。', placed, { x: 0.5, y: 1, z: 8.5, yaw: Math.PI, pitch: -0.08 });
}

function baths() {
  const placed = [];
  room(placed, -10, -8, 10, 8, 'quartz', 'quartz', 'quartz', 5);
  box(placed, -6, 0, -4, -2, 0, 4, 'prismarine');
  box(placed, 2, 0, -4, 6, 0, 4, 'ice');
  door(placed, 0, 1, 2, 8);
  kit(placed, -8, 0);
  add(placed, 8, 1, 0, 'bench');
  add(placed, 0, 1, -6, 'oak_table');
  return palace('baths', '公共浴场', '冷热两池，四周有更衣室。对照罗马浴场。', placed);
}

function caravan() {
  const placed = [];
  box(placed, -12, 1, -12, 12, 4, 12, 'sandstone', (x, _y, z) => x > -12 && x < 12 && z > -12 && z < 12);
  box(placed, -12, 5, -12, 12, 5, 12, 'sandstone');
  box(placed, -8, 0, -8, 8, 0, 8, 'sand');
  room(placed, -11, 6, 11, 11, 'sandstone', 'planks', 'sandstone', 4);
  door(placed, 0, 1, 2, 12);
  door(placed, 0, 1, 2, 6);
  kit(placed, -2, 8);
  add(placed, 6, 1, 8, 'bed');
  add(placed, 6, 2, 8, 'sheet_white');
  return palace('caravan', '商队客栈', '四面围墙，北侧客房。对照丝路商队驿站。', placed, { x: 0.5, y: 1, z: 8.5, yaw: Math.PI, pitch: -0.08 });
}

function pueblo() {
  const placed = [];
  box(placed, -8, 0, -6, 8, 0, 6, 'clay');
  box(placed, -8, 1, -6, 8, 3, 6, 'clay', (x, _y, z) => x > -8 && x < 8 && z > -6 && z < 6);
  box(placed, -8, 4, -2, 0, 4, 6, 'clay');
  box(placed, -8, 5, -2, 0, 7, 6, 'clay', (x, _y, z) => x > -8 && x < 0 && z > -2 && z < 6);
  box(placed, -8, 8, -2, 0, 8, 6, 'clay');
  door(placed, 0, 1, 2, 6);
  kit(placed, -4, 2);
  add(placed, 4, 1, 0, 'oak_table');
  return palace('pueblo', '土坯崖居', '层层退台的土坯房间。对照普韦布洛崖居聚落。', placed);
}

function onion() {
  const placed = [];
  room(placed, -5, -5, 5, 5, 'wool_white', 'planks', 'wool_white', 6);
  disk(placed, 0, 0, 7, 4, 'wool_blue');
  disk(placed, 0, 0, 8, 5, 'wool_blue');
  disk(placed, 0, 0, 9, 3, 'wool_blue');
  disk(placed, 0, 0, 10, 2, 'wool_blue');
  add(placed, 0, 11, 0, 'gold');
  door(placed, 0, 1, 2, 5);
  kit(placed);
  add(placed, 0, 1, -3, 'candle');
  return palace('onion', '洋葱顶小堂', '白墙小堂，蓝色洋葱顶。对照罗斯木石教堂类型。', placed);
}

function timber() {
  const placed = [];
  room(placed, -6, -5, 6, 5, 'planks', 'planks', 'spruce_planks', 5);
  for (let x = -6; x <= 6; x += 3) {
    box(placed, x, 1, -5, x, 4, -5, 'spruce_log');
    box(placed, x, 1, 5, x, 4, 5, 'spruce_log');
  }
  add(placed, -3, 3, 5, 'wool_white');
  add(placed, 3, 3, 5, 'wool_white');
  door(placed, 0, 1, 2, 5);
  kit(placed);
  add(placed, 3, 1, -2, 'bed');
  add(placed, 3, 2, -2, 'sheet_rose');
  return palace('timber', '木骨架民居', '原木骨架填白墙。对照中欧半木结构住宅。', placed);
}

function granary() {
  const placed = [];
  room(placed, -4, -8, 4, 8, 'bricks', 'planks', 'bricks', 8);
  for (let z = -6; z <= 6; z += 3) box(placed, -3, 1, z, 3, 1, z, 'oak_table');
  door(placed, 0, 1, 2, 8);
  kit(placed, -2, 0);
  return palace('granary', '粮仓', '高砖仓，里面一排架子。对照古代官仓。', placed);
}

function beacon() {
  const placed = [];
  room(placed, -3, -3, 3, 3, 'bricks', 'stone', 'bricks', 5);
  box(placed, -3, 6, -3, 3, 12, 3, 'bricks', (x, y, z) => x > -3 && x < 3 && z > -3 && z < 3 && y < 12);
  add(placed, 0, 13, 0, 'glowstone');
  door(placed, 0, 1, 2, 3);
  kit(placed);
  return palace('beacon', '烽火台', '方形墩台，顶上可点火。对照长城烽燧。', placed);
}

function bazaar() {
  const placed = [];
  room(placed, -16, -5, 16, 5, 'sandstone', 'planks', 'sandstone', 5);
  for (let x = -12; x <= 12; x += 6) {
    add(placed, x, 1, -3, 'oak_table');
    add(placed, x, 2, -3, 'cloth_check');
    add(placed, x, 1, 3, 'cabinet');
  }
  door(placed, 0, 1, 2, 5);
  kit(placed, -2, 0);
  return palace('bazaar', '有盖集市', '长向拱廊，两侧摊位。对照中东有盖巴扎。', placed);
}

function villa() {
  const placed = [];
  room(placed, -10, -10, 10, 10, 'quartz', 'planks', 'quartz', 4);
  box(placed, -4, 0, -4, 4, 0, 4, 'prismarine');
  room(placed, -9, 5, 9, 9, 'quartz', 'planks', 'quartz', 4);
  door(placed, 0, 1, 2, 10);
  door(placed, 0, 1, 2, 5);
  kit(placed, -2, 7);
  add(placed, -7, 1, 0, 'sofa');
  add(placed, 7, 1, 0, 'bed');
  add(placed, 7, 2, 0, 'sheet_white');
  return palace('villa', '中庭宅邸', '中间天井水池，北侧主屋。对照罗马中庭住宅。', placed, { x: 0.5, y: 1, z: 8.5, yaw: Math.PI, pitch: -0.08 });
}

function observatory() {
  const placed = [];
  disk(placed, 0, 0, 0, 10, 'stone');
  for (let r = 4; r <= 10; r += 2) disk(placed, 0, 0, Math.floor((10 - r) / 2), r, 'stone_bricks', r - 1);
  room(placed, -3, -3, 3, 3, 'stone_bricks', 'planks', 'stone_bricks', 4);
  door(placed, 0, 1, 2, 3);
  kit(placed);
  add(placed, 0, 1, -1, 'clock');
  return palace('observatory', '观星台', '层层石台，中心有一间测影小屋。对照古代观星台。', placed);
}

function stepwell() {
  const placed = [];
  for (let y = 0; y <= 3; y += 1) {
    const r = 8 - y * 2;
    box(placed, -r, y === 0 ? 0 : 0, -r, r, 0, r, 'sandstone', (x, _yy, z) => Math.abs(x) < r - 2 && Math.abs(z) < r - 2);
  }
  box(placed, -2, 0, -2, 2, 0, 2, 'prismarine');
  room(placed, -8, 4, 8, 10, 'sandstone', 'planks', 'sandstone', 4);
  door(placed, 0, 1, 2, 10);
  kit(placed, -2, 7);
  return palace('stepwell', '阶井亭', '向下的台阶井，边上有一间亭子。对照印度阶井。', placed, { x: 0.5, y: 1, z: 8.5, yaw: Math.PI, pitch: -0.08 });
}

function icehouse() {
  const placed = [];
  for (let y = 0; y <= 10; y += 1) disk(placed, 0, 0, y, Math.max(2, 8 - y), 'bricks', y === 0 ? 0 : Math.max(1, 7 - y));
  disk(placed, 0, 0, 0, 7, 'ice');
  for (let y = 1; y <= 2; y += 1) {
    const i = placed.findIndex((item) => item[0] === 0 && item[1] === y && item[2] === 7);
    if (i >= 0) placed.splice(i, 1);
  }
  kit(placed);
  return palace('icehouse', '冰窖穹顶', '砖砌锥顶，地下一层冰。对照波斯冰屋。', placed);
}

function teahouse() {
  const placed = [];
  room(placed, -5, -5, 5, 5, 'cherry_planks', 'planks', 'dark_oak_planks', 4);
  box(placed, -6, 3, -6, 6, 3, 6, 'dark_oak_planks', (x, _y, z) => Math.abs(x) < 5 && Math.abs(z) < 5);
  door(placed, 0, 1, 2, 5);
  kit(placed);
  add(placed, 0, 1, -2, 'tea_table');
  add(placed, 2, 1, -2, 'teacup');
  add(placed, -2, 1, 2, 'oak_chair');
  return palace('teahouse', '茶亭', '出檐小亭，茶几在中间。对照园林茶室。', placed);
}

function bridge() {
  const placed = [];
  box(placed, -14, 3, -2, 14, 3, 2, 'spruce_planks');
  for (let x = -12; x <= 12; x += 8) {
    box(placed, x, 0, -2, x + 1, 2, 2, 'log');
  }
  box(placed, -4, 4, -2, 4, 6, 2, 'spruce_planks', (x, _y, z) => x > -4 && x < 4 && z > -2 && z < 2);
  box(placed, -4, 7, -2, 4, 7, 2, 'spruce_planks');
  add(placed, -2, 4, 0, 'bookshelf');
  add(placed, 2, 4, 0, 'writing_desk');
  add(placed, 2, 5, 0, 'open_notebook');
  return palace('bridge', '廊桥', '有顶的木桥，桥心是一间小屋。对照风雨桥。', placed, { x: 0.5, y: 4, z: 0.5, yaw: 0, pitch: -0.08 });
}

function cloister() {
  const placed = [];
  box(placed, -12, 1, -12, 12, 4, 12, 'stone_bricks', (x, _y, z) => x > -12 && x < 12 && z > -12 && z < 12);
  box(placed, -12, 5, -12, 12, 5, 12, 'stone_bricks', (x, _y, z) => Math.abs(x) < 8 && Math.abs(z) < 8);
  box(placed, -6, 0, -6, 6, 0, 6, 'moss');
  room(placed, -11, 7, 11, 11, 'stone_bricks', 'planks', 'stone_bricks', 5);
  door(placed, 0, 1, 2, 12);
  door(placed, 0, 1, 2, 7);
  kit(placed, -2, 9);
  add(placed, 6, 1, 9, 'bookshelf');
  return palace('cloister', '回廊修道院', '四面回廊围着中庭，北侧经堂。对照中世纪修道院。', placed, { x: 0.5, y: 1, z: 9.5, yaw: Math.PI, pitch: -0.08 });
}

function gothic() {
  const placed = [];
  room(placed, -6, -14, 6, 14, 'stone_bricks', 'planks', 'stone_bricks', 10);
  box(placed, -1, 1, -14, 1, 8, -14, 'glass');
  box(placed, -6, 4, 0, -6, 8, 0, 'glass');
  box(placed, 6, 4, 0, 6, 8, 0, 'glass');
  door(placed, 0, 1, 3, 14);
  kit(placed, -2, 0);
  add(placed, 0, 1, -8, 'bench');
  add(placed, 0, 1, 8, 'bench');
  add(placed, 0, 11, 0, 'glowstone');
  return palace('gothic', '尖顶礼拜堂', '狭长高厅，彩色玻璃。对照哥特礼拜堂。', placed, { x: 0.5, y: 1, z: 12.5, yaw: Math.PI, pitch: -0.08 });
}

function ruin() {
  const placed = [];
  room(placed, -7, -7, 7, 7, 'cobblestone', 'moss', 'cobblestone', 5);
  for (const [x, z] of [[-7, -7], [7, 7], [-7, 7]]) {
    box(placed, x, 5, z, x, 9, z, 'cobblestone');
  }
  door(placed, 0, 1, 2, 7);
  kit(placed);
  add(placed, 3, 1, 3, 'vase');
  return palace('ruin', '残堡', '圆石废墙，仍有一间能遮雨的房间。对照各地废堡。', placed);
}

function shiphall() {
  const placed = [];
  room(placed, -16, -4, 16, 4, 'spruce_planks', 'spruce_planks', 'spruce_planks', 5);
  box(placed, -18, 1, -1, -16, 3, 1, 'spruce_planks');
  box(placed, 16, 2, -2, 18, 4, 2, 'wool_white');
  door(placed, 0, 1, 2, 4);
  kit(placed, -6, 0);
  add(placed, 8, 1, 0, 'bed');
  add(placed, 8, 2, 0, 'sheet_navy');
  add(placed, -12, 1, 0, 'cabinet');
  return palace('shiphall', '船厅', '像一艘翻过来的船长屋。对照北欧船冢厅堂。', placed);
}

export function extraPalaces() {
  return [
    pyramid(),
    parthenon(),
    colosseum(),
    pantheon(),
    ziggurat(),
    maya(),
    pagoda(),
    tenshu(),
    mosque(),
    stupa(),
    longhouse(),
    mill(),
    lighthouse(),
    theatre(),
    aqueduct(),
    baths(),
    caravan(),
    pueblo(),
    onion(),
    timber(),
    granary(),
    beacon(),
    bazaar(),
    villa(),
    observatory(),
    stepwell(),
    icehouse(),
    teahouse(),
    bridge(),
    cloister(),
    gothic(),
    ruin(),
    shiphall(),
  ];
}
