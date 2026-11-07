/** 立面构件：门廊、柱廊、线脚。 */
import { band, capital, cornice, portalZ, shaft } from './presets-ornament.js';

function topY(g, x, z) {
  for (let y = 40; y >= 0; y -= 1) {
    if (g.get(x, y, z)) return y;
  }
  return 2;
}

function pinnacle(g, x, z, y0, h, stone) {
  for (let y = 0; y < h; y += 1) {
    const s = y > h - 3 ? 0 : 1;
    g.box(x - s, y0 + y, z - s, x + s, y0 + y, z + s, stone);
  }
  g.set(x, y0 + h, z, 'gold');
}

function shortLancetZ(g, cx, z, y0, stone) {
  for (let dy = 0; dy <= 6; dy += 1) {
    g.set(cx - 1, y0 + dy, z, stone);
    g.set(cx + 1, y0 + dy, z, stone);
  }
  g.set(cx, y0, z, stone);
  g.set(cx, y0 + 6, z, stone);
  g.set(cx, y0 + 1, z, 'glass');
  g.set(cx, y0 + 2, z, 'wool_blue');
  g.set(cx, y0 + 3, z, 'glass');
  g.set(cx, y0 + 4, z, 'wool_red');
  g.set(cx, y0 + 5, z, 'glass');
}

function shortLancetX(g, x, cz, y0, stone) {
  for (let dy = 0; dy <= 6; dy += 1) {
    g.set(x, y0 + dy, cz - 1, stone);
    g.set(x, y0 + dy, cz + 1, stone);
  }
  g.set(x, y0, cz, stone);
  g.set(x, y0 + 6, cz, stone);
  g.set(x, y0 + 1, cz, 'glass');
  g.set(x, y0 + 3, cz, 'wool_blue');
  g.set(x, y0 + 5, cz, 'glass');
}

export function torii(g, x, z, y) {
  g.box(x - 4, y, z, x - 4, y + 7, z, 'wool_red');
  g.box(x + 4, y, z, x + 4, y + 7, z, 'wool_red');
  g.set(x - 4, y, z, 'dark_oak_planks');
  g.set(x + 4, y, z, 'dark_oak_planks');
  g.box(x - 5, y + 7, z, x + 5, y + 7, z, 'wool_red');
  g.box(x - 6, y + 8, z, x + 6, y + 8, z, 'wool_black');
  g.box(x - 3, y + 5, z, x + 3, y + 5, z, 'wool_red');
}

export function gothicFace(g, b) {
  const y = b.floorY + 1;
  const stone = 'stone_bricks';
  for (let x = b.ox + 3; x < b.x1 - 2; x += 5) {
    if (Math.abs(x - b.doorX) < 3) continue;
    shortLancetZ(g, x, b.z1, y, stone);
    shortLancetZ(g, x, b.oz, y, stone);
  }
  for (let z = b.oz + 3; z < b.z1 - 2; z += 5) {
    shortLancetX(g, b.ox, z, y, stone);
    shortLancetX(g, b.x1, z, y, stone);
  }
  for (let z = b.oz + 2; z < b.z1; z += 6) {
    for (const side of [-1, 1]) {
      const x = side < 0 ? b.ox : b.x1;
      g.box(x, b.floorY + 3, z, x + 5 * side, b.floorY + 3, z, stone);
      g.box(x + 5 * side, b.floorY + 3, z, x + 5 * side, b.floorY + b.wallH, z, stone);
      pinnacle(g, x + 5 * side, z, b.floorY + b.wallH + 1, 7, 'cobblestone');
    }
  }
  pinnacle(g, b.ox, b.oz, b.floorY + b.wallH + 2, 10, stone);
  pinnacle(g, b.x1, b.oz, b.floorY + b.wallH + 2, 10, stone);
  pinnacle(g, b.ox, b.z1, b.floorY + b.wallH + 2, 8, stone);
  pinnacle(g, b.x1, b.z1, b.floorY + b.wallH + 2, 8, stone);
  portalZ(g, b.doorX, b.z1, y, stone);
  g.carve(b.doorX - 1, y, b.z1, b.doorX + 1, y + 4, b.z1 + 2);
  band(g, b.ox, b.floorY + 4, b.oz, b.x1, b.z1, 'gold');
  cornice(g, b.ox, b.floorY + b.wallH + 1, b.oz, b.x1, b.z1, 'cobblestone');
}

export function japanFace(g, b) {
  const y = b.floorY;
  for (let x = b.ox; x <= b.x1; x += 4) {
    g.box(x, y + 1, b.z1 + 1, x, y + b.wallH, b.z1 + 1, 'wool_red');
    capital(g, x, b.z1 + 1, y + b.wallH, 'gold');
    g.box(x, y + 1, b.oz - 1, x, y + b.wallH, b.oz - 1, 'wool_red');
  }
  g.box(b.ox - 1, y + b.wallH + 1, b.oz - 1, b.x1 + 1, y + b.wallH + 1, b.z1 + 1, 'dark_oak_planks');
  g.box(b.ox - 2, y + b.wallH + 2, b.oz, b.x1 + 2, y + b.wallH + 2, b.z1, 'wool_black');
  g.set(b.ox, y + b.wallH + 3, Math.floor((b.oz + b.z1) / 2), 'dark_oak_planks');
  g.set(b.x1, y + b.wallH + 3, Math.floor((b.oz + b.z1) / 2), 'dark_oak_planks');
  g.box(b.doorX - 2, y + 5, b.z1, b.doorX + 2, y + 5, b.z1, 'wool_white');
  for (const z of [b.z1 + 10, b.z1 + 18, 30]) {
    const hy = topY(g, 0, z);
    torii(g, 0, z, hy);
  }
  const gateY = topY(g, 0, 30);
  g.box(-6, gateY, 30, -6, gateY + 2, 30, 'cobblestone');
  g.box(6, gateY, 30, 6, gateY + 2, 30, 'cobblestone');
}

export function chinaFace(g, b) {
  const y = b.floorY;
  for (let x = b.ox; x <= b.x1; x += 4) {
    g.box(x, y + 1, b.z1 + 1, x, y + b.wallH, b.z1 + 1, 'wool_red');
    capital(g, x, b.z1 + 1, y + b.wallH, 'gold');
  }
  g.box(b.ox - 1, y + b.wallH + 1, b.oz - 1, b.x1 + 1, y + b.wallH + 1, b.z1 + 1, 'wool_green');
  for (let x = b.ox; x <= b.x1; x += 2) g.set(x, y + b.wallH + 1, b.z1 + 2, 'gold');
  cornice(g, b.ox, y + b.wallH + 2, b.oz, b.x1, b.z1, 'dark_oak_planks');
  for (let x = b.ox + 2; x < b.x1; x += 5) {
    if (Math.abs(x - b.doorX) < 2) continue;
    g.set(x, y + 2, b.z1, 'wool_black');
    g.set(x, y + 3, b.z1, 'glass');
    g.set(x, y + 4, b.z1, 'wool_black');
  }
}

export function indiaFace(g, b) {
  const y = b.floorY;
  band(g, b.ox, y + 3, b.oz, b.x1, b.z1, 'lapis');
  band(g, b.ox, y + 5, b.oz, b.x1, b.z1, 'gold');
  for (const [x, z] of [[b.ox, b.oz], [b.x1, b.oz], [b.ox, b.z1], [b.x1, b.z1]]) {
    for (let yy = y; yy <= y + 18; yy += 1) {
      g.box(x - 1, yy, z - 1, x + 1, yy, z + 1, 'quartz');
      if (yy % 4 === 0) g.box(x - 2, yy, z - 2, x + 2, yy, z + 2, 'gold');
    }
    g.set(x, y + 19, z, 'gold');
  }
  for (let x = b.ox + 3; x < b.x1; x += 6) {
    if (Math.abs(x - b.doorX) < 3) continue;
    shortLancetZ(g, x, b.z1, y + 1, 'quartz');
  }
}

export function italyFace(g, b) {
  const y = b.floorY + 1;
  for (const x of [b.ox + 2, b.ox + 7, b.doorX - 4, b.doorX + 4, b.x1 - 7, b.x1 - 2]) {
    shaft(g, x, b.z1 + 1, y, y + b.wallH - 1, 'quartz');
  }
  cornice(g, b.ox, y + b.wallH, b.oz, b.x1, b.z1, 'quartz');
  for (let x = b.ox; x <= b.x1; x += 1) {
    const rise = y + b.wallH + 1 + Math.max(0, 5 - Math.abs(x - b.doorX) / 3);
    g.set(x, Math.floor(rise), b.z1 + 1, 'quartz');
  }
  band(g, b.ox, y + 3, b.oz, b.x1, b.z1, 'gold');
}

export function egyptFace(g, b) {
  const y = b.floorY;
  g.box(b.ox - 3, y, b.z1 + 1, b.ox + 3, y + b.wallH + 4, b.z1 + 3, 'sandstone');
  g.box(b.x1 - 3, y, b.z1 + 1, b.x1 + 3, y + b.wallH + 4, b.z1 + 3, 'sandstone');
  g.carve(b.doorX - 1, y + 1, b.z1 + 1, b.doorX + 1, y + 5, b.z1 + 3);
  band(g, b.ox, y + 4, b.oz, b.x1, b.z1, 'gold');
  band(g, b.ox, y + 6, b.oz, b.x1, b.z1, 'wool_blue');
  for (let x = b.ox + 3; x < b.x1; x += 5) shaft(g, x, b.z1 + 1, y + 1, y + b.wallH, 'sandstone');
}

export function spainFace(g, b) {
  const y = b.floorY + 1;
  for (let x = b.ox + 2; x < b.x1; x += 5) {
    if (Math.abs(x - b.doorX) < 2) continue;
    g.box(x - 1, y + 1, b.z1, x + 1, y + 4, b.z1, 'bricks');
    g.carve(x, y + 2, b.z1, x, y + 4, b.z1);
  }
  cornice(g, b.ox, y + b.wallH, b.oz, b.x1, b.z1, 'wool_yellow');
  band(g, b.ox, y + 3, b.oz, b.x1, b.z1, 'wool_blue');
}

export function turkeyFace(g, b) {
  const y = b.floorY;
  const cx = Math.floor((b.ox + b.x1) / 2);
  const cz = Math.floor((b.oz + b.z1) / 2);
  for (let yy = y + b.wallH + 2; yy <= y + b.wallH + 10; yy += 1) {
    const t = (yy - y - b.wallH - 2) / 8;
    const r = Math.max(2, Math.round(7 * (1 - t * t)));
    g.box(cx - r, yy, cz - r, cx + r, yy, cz + r, yy % 2 ? 'gold' : 'quartz', (x, _y, z) => (x - cx) ** 2 + (z - cz) ** 2 > r * r);
  }
  g.set(cx, y + b.wallH + 11, cz, 'gold');
  for (let yy = y; yy <= y + 16; yy += 1) g.box(b.x1 + 2, yy, b.z1, b.x1 + 3, yy, b.z1 + 1, 'quartz');
  g.set(b.x1 + 2, y + 17, b.z1, 'gold');
  band(g, b.ox, y + 4, b.oz, b.x1, b.z1, 'gold');
}

export function englandFace(g, b) {
  const y = b.floorY;
  for (let x = b.ox; x <= b.x1; x += 1) {
    if (x % 4 === 0) g.box(x, y + 1, b.z1, x, y + b.wallH, b.z1, 'dark_oak_planks');
  }
  g.box(b.doorX - 2, y + 1, b.z1 + 1, b.doorX + 2, y + 3, b.z1 + 1, 'bricks');
  g.set(b.doorX, y + 2, b.z1 + 1, 'glowstone');
  g.box(b.ox + 2, y + b.wallH + 2, b.oz + 2, b.ox + 3, y + b.wallH + 8, b.oz + 3, 'bricks');
  g.set(b.ox + 2, y + b.wallH + 9, b.oz + 2, 'wool_red');
  cornice(g, b.ox, y + b.wallH + 1, b.oz, b.x1, b.z1, 'dark_oak_planks');
}

export function russiaFace(g, b) {
  const y = b.floorY + b.wallH + 2;
  const spots = [
    [b.ox + 2, b.oz + 2], [b.x1 - 2, b.oz + 2], [b.ox + 2, b.z1 - 2], [b.x1 - 2, b.z1 - 2],
    [Math.floor((b.ox + b.x1) / 2), Math.floor((b.oz + b.z1) / 2)],
  ];
  for (const [x, z] of spots) {
    for (let yy = 0; yy < 7; yy += 1) {
      const r = yy > 4 ? 1 : 2;
      g.box(x - r, y + yy, z - r, x + r, y + yy, z + r, yy % 2 ? 'gold' : 'wool_green');
    }
    g.set(x, y + 7, z, 'gold');
  }
  band(g, b.ox, b.floorY + 3, b.oz, b.x1, b.z1, 'gold');
  for (let x = b.ox + 2; x < b.x1; x += 4) {
    if (Math.abs(x - b.doorX) < 2) continue;
    g.set(x, b.floorY + 2, b.z1, 'gold');
    g.set(x, b.floorY + 3, b.z1, 'wool_red');
    g.set(x, b.floorY + 4, b.z1, 'gold');
  }
}

export { topY };
