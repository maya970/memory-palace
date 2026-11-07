import { finish, grid, portalZ } from './presets-ornament.js';
import { halls, heightOf, land, trail } from './presets-site.js';

function site(opts) {
  const g = grid();
  land(g, {
    x0: -40, z0: -36, x1: 40, z1: 40,
    kind: opts.kind,
    top: opts.top,
    fill: opts.fill,
    waterY: opts.waterY,
  });
  const plateau = opts.plateau ?? heightOf(0, -6, opts.kind);
  const built = halls(g, {
    ox: opts.ox ?? -12,
    oz: opts.oz ?? -18,
    cols: 5,
    rows: 5,
    y: plateau,
    wall: opts.wall,
    floor: opts.floor,
    roof: opts.roof,
    fill: opts.fill,
    accent: opts.accent,
    wallH: 5,
    inner: 4,
  });
  trail(g, 0, 38, Math.floor(built.doorX), Math.floor(built.doorZ) + 1, opts.kind, opts.tread || 'cobblestone', true);
  if (opts.kind === 'water' && opts.waterY != null) {
    for (let z = Math.floor(built.doorZ); z <= 40; z += 1) {
      g.box(-2, opts.waterY, z, 2, opts.waterY, z, opts.tread || 'stone_bricks');
      if (z % 4 === 0) {
        g.set(-2, opts.waterY + 1, z, opts.wall);
        g.set(2, opts.waterY + 1, z, opts.wall);
      }
    }
  }
  opts.dress?.(g, plateau, built);
  const spawnY = opts.kind === 'water' ? (opts.waterY || 5) + 1 : heightOf(0, 38, opts.kind) + 1;
  return finish(
    opts.id,
    opts.name,
    opts.lead,
    g,
    { x: 0.5, y: spawnY, z: 38.5, yaw: Math.PI, pitch: -0.08 },
    opts.credit,
    opts.country,
  );
}

function torii(g, x, z, y) {
  g.box(x - 3, y, z, x - 3, y + 6, z, 'wool_red');
  g.box(x + 3, y, z, x + 3, y + 6, z, 'wool_red');
  g.box(x - 4, y + 6, z, x + 4, y + 6, z, 'wool_red');
  g.box(x - 5, y + 7, z, x + 5, y + 7, z, 'wool_black');
}

export function worldPalaces() {
  return [
    site({
      id: 'japan_shrine',
      country: '日本',
      name: '日本·山上神社',
      lead: '神社建在山上。山道两侧有书架，二十五间屋子连成一座，不是平地摆盒子。',
      credit: '依山而建的神社院落，参道上山，屋宇相通。',
      kind: 'mountain',
      top: 'grass',
      fill: 'stone',
      wall: 'dark_oak_planks',
      floor: 'planks',
      roof: 'wool_red',
      accent: 'dark_oak_planks',
      tread: 'cobblestone',
      dress(g, y) {
        torii(g, 0, 30, heightOf(0, 30, 'mountain'));
        torii(g, 0, 22, heightOf(0, 22, 'mountain'));
        g.set(-2, y + 7, -16, 'gold');
        g.set(2, y + 7, -16, 'gold');
      },
    }),
    site({
      id: 'gothic_water',
      country: '法国',
      name: '法国·水上哥特院',
      lead: '建在水中石岛上。二十五间相通的厅室，从堤道走进去。',
      credit: '水上石岛哥特院落，不是平地一座空堂。',
      kind: 'water',
      waterY: 5,
      oz: -8,
      top: 'stone_bricks',
      fill: 'cobblestone',
      wall: 'stone_bricks',
      floor: 'deepslate',
      roof: 'dark_oak_planks',
      accent: 'wool_red',
      tread: 'stone_bricks',
      plateau: 8,
      dress(g, y, built) {
        portalZ(g, Math.floor(built.doorX), Math.floor(built.doorZ), y + 1, 'stone_bricks');
        g.set(0, y + 8, -10, 'gold');
      },
    }),
    site({
      id: 'long_corridor',
      country: '中国',
      name: '中国·依山园林',
      lead: '山坡上的二十五间相连侧厅，红柱青瓦，山道有书。',
      credit: '依山园林院落，屋子彼此开门相通。',
      kind: 'hill',
      top: 'grass',
      fill: 'dirt',
      wall: 'wool_red',
      floor: 'planks',
      roof: 'dark_oak_planks',
      accent: 'wool_yellow',
      tread: 'planks',
      dress(g, y) {
        for (let x = -12; x <= 12; x += 4) g.set(x, y + 7, -18, 'gold');
      },
    }),
    site({
      id: 'taj_excerpt',
      country: '印度',
      name: '印度·河边白陵',
      lead: '临水台地，二十五间白石屋子相连，中央院落可走。',
      credit: '临水白石院，不是一座空穹顶。',
      kind: 'water',
      waterY: 4,
      oz: -8,
      top: 'quartz',
      fill: 'sandstone',
      wall: 'quartz',
      floor: 'wool_white',
      roof: 'gold',
      accent: 'lapis',
      tread: 'quartz',
      plateau: 7,
    }),
    site({
      id: 'civic_palace',
      country: '意大利',
      name: '意大利·山坡宫',
      lead: '建在山坡平台上，二十五间厅室相通，有山道。',
      credit: '山坡宫殿，屋子连成一座。',
      kind: 'hill',
      top: 'grass',
      fill: 'stone',
      wall: 'quartz',
      floor: 'quartz',
      roof: 'wool_green',
      accent: 'gold',
      tread: 'stone_bricks',
    }),
    site({
      id: 'egypt_hall',
      country: '埃及',
      name: '埃及·沙漠神庙',
      lead: '沙丘里削出一座台地，二十五间神庙侧室相连。',
      credit: '沙漠神庙院落，不是平地几根柱。',
      kind: 'dune',
      top: 'sand',
      fill: 'sandstone',
      wall: 'sandstone',
      floor: 'sandstone',
      roof: 'gold',
      accent: 'lapis',
      tread: 'sandstone',
    }),
    site({
      id: 'spain_patio',
      country: '西班牙',
      name: '西班牙·山坡庭院',
      lead: '干热山坡上的相连院落，二十五间屋子。',
      credit: '依山庭院，瓷砖铺地的连房。',
      kind: 'hill',
      top: 'dirt',
      fill: 'stone',
      wall: 'bricks',
      floor: 'wool_blue',
      roof: 'wool_yellow',
      accent: 'bricks',
      tread: 'bricks',
    }),
    site({
      id: 'turkey_mosque',
      country: '土耳其',
      name: '土耳其·山脊寺',
      lead: '建在山脊平台，二十五间礼拜侧室相通。',
      credit: '山脊寺院，不是平地一个穹顶。',
      kind: 'hill',
      top: 'grass',
      fill: 'stone',
      wall: 'quartz',
      floor: 'wool_red',
      roof: 'gold',
      accent: 'wool_blue',
      tread: 'stone',
    }),
    site({
      id: 'england_hall',
      country: '英国',
      name: '英国·丘上大厅',
      lead: '绿丘上的二十五间相连厅室，山道通向大门。',
      credit: '丘上庄园，屋子连成一座。',
      kind: 'hill',
      top: 'grass',
      fill: 'dirt',
      wall: 'stone_bricks',
      floor: 'planks',
      roof: 'dark_oak_planks',
      accent: 'wool_red',
      tread: 'cobblestone',
    }),
    site({
      id: 'russia_church',
      country: '俄罗斯',
      name: '俄罗斯·雪地教堂',
      lead: '雪坡上的二十五间相通侧堂，山道两侧有书。',
      credit: '雪地教堂院落，不是平地五个洋葱顶。',
      kind: 'snow',
      top: 'snow',
      fill: 'stone',
      wall: 'quartz',
      floor: 'wool_red',
      roof: 'gold',
      accent: 'wool_blue',
      tread: 'cobblestone',
    }),
  ];
}
