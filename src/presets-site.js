import { chamber, checker, study, teaRoom } from './presets-ornament.js';

export function heightOf(x, z, kind) {
  if (kind === 'mountain') {
    const d = Math.hypot(x / 36, (z + 6) / 40);
    return Math.max(2, Math.floor(4 + (1 - Math.min(1, d)) * 20 + Math.sin(x * 0.14) * 2 + Math.sin(z * 0.09) * 2));
  }
  if (kind === 'hill') {
    return Math.max(1, Math.floor(3 + Math.sin(x * 0.08) * 3 + Math.cos(z * 0.07) * 4 + Math.sin((x + z) * 0.05) * 2));
  }
  if (kind === 'dune') {
    return Math.max(1, Math.floor(2 + Math.abs(Math.sin(x * 0.06) * 6) + Math.sin(z * 0.12) * 2));
  }
  if (kind === 'snow') {
    return Math.max(1, Math.floor(3 + Math.sin(x * 0.05) * 4 + Math.cos(z * 0.06) * 5));
  }
  if (kind === 'water') {
    const island = Math.hypot(x / 22, z / 18);
    if (island < 1) return 4 + Math.floor((1 - island) * 6);
    return 0;
  }
  return 2;
}

export function land(g, { x0, z0, x1, z1, kind, top, fill, waterY }) {
  for (let z = z0; z <= z1; z += 1) {
    for (let x = x0; x <= x1; x += 1) {
      const h = heightOf(x, z, kind);
      g.set(x, h, z, top);
      g.set(x, h - 1, z, fill);
      g.set(x, Math.max(-2, h - 2), z, fill);
      if (waterY != null && h < waterY) g.set(x, waterY, z, 'water');
    }
  }
}

export function flatten(g, x0, z0, x1, z1, y, fill, top) {
  for (let z = z0; z <= z1; z += 1) {
    for (let x = x0; x <= x1; x += 1) {
      for (let yy = y - 3; yy < y; yy += 1) g.set(x, yy, z, fill);
      g.set(x, y, z, top);
      for (let yy = y + 1; yy <= y + 8; yy += 1) {
        const now = g.get(x, yy, z);
        if (now && now !== 'water') g.set(x, yy, z, null);
      }
    }
  }
}

export function trail(g, x0, z0, x1, z1, kind, tread, book) {
  let x = x0;
  let z = z0;
  let guard = 0;
  while (guard < 220 && (Math.abs(z - z1) > 1 || Math.abs(x - x1) > 1)) {
    const h = heightOf(x, z, kind);
    g.set(x, h, z, tread);
    g.set(x + 1, h, z, tread);
    if (h + 1 <= 96 && book && guard % 8 === 0) {
      g.set(x + 3, h + 1, z, 'bookshelf');
      g.set(x + 3, h + 2, z, 'bookshelf');
    }
    if (Math.abs(z - z1) >= Math.abs(x - x1)) z += Math.sign(z1 - z) || 0;
    else x += Math.sign(x1 - x) || 0;
    if (guard % 11 === 5) x += z0 > z1 ? 1 : -1;
    guard += 1;
  }
}

function furnish(g, x, y, z, index) {
  const kind = index % 8;
  if (kind === 0) study(g, x, y, z);
  else if (kind === 1) chamber(g, x, y, z);
  else if (kind === 2) teaRoom(g, x, y, z);
  else if (kind === 3) {
    g.set(x, y, z, 'bench');
    g.set(x + 2, y, z, 'bench');
    g.set(x, y, z + 2, 'sideboard');
    g.cover(x, y, z + 2, 'candle');
  } else if (kind === 4) {
    g.set(x, y, z, 'oak_table');
    g.cover(x, y, z, 'cloth_linen');
    g.set(x + 2, y, z, 'oak_chair');
    g.set(x, y, z + 2, 'fruit_bowl');
  } else if (kind === 5) {
    g.set(x - 1, y, z - 1, 'bookshelf');
    g.set(x - 1, y + 1, z - 1, 'bookshelf');
    g.set(x + 2, y, z - 1, 'bookshelf');
    g.set(x + 2, y + 1, z - 1, 'bookshelf');
    g.set(x, y, z + 1, 'chalkboard');
  } else if (kind === 6) {
    g.set(x, y, z, 'cabinet');
    g.set(x + 2, y, z, 'sideboard');
    g.set(x, y, z + 2, 'wardrobe');
  } else {
    g.set(x, y, z, 'sofa');
    g.cover(x, y, z, 'pillow_white');
    g.set(x + 2, y, z, 'tea_table');
  }
}

export function halls(g, opts) {
  const inner = opts.inner || 4;
  const step = inner + 1;
  const cols = opts.cols || 5;
  const rows = opts.rows || 5;
  const wallH = opts.wallH || 5;
  const y = opts.y;
  const ox = opts.ox;
  const oz = opts.oz;
  const wall = opts.wall;
  const floor = opts.floor;
  const roof = opts.roof;
  flatten(g, ox, oz, ox + cols * step, oz + rows * step, y, opts.fill || wall, floor);
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      const x0 = ox + c * step;
      const z0 = oz + r * step;
      const x1 = x0 + inner + 1;
      const z1 = z0 + inner + 1;
      g.box(x0, y, z0, x1, y, z1, floor);
      g.box(x0, y + 1, z0, x1, y + wallH, z1, wall, (x, yy, z) => x > x0 && x < x1 && z > z0 && z < z1);
      g.box(x0, y + wallH + 1, z0, x1, y + wallH + 1, z1, roof);
      if (c > 0) g.carve(x0, y + 1, z0 + 2, x0, y + 3, z0 + 3);
      if (r > 0) g.carve(x0 + 2, y + 1, z0, x0 + 3, y + 3, z0);
      if (c === Math.floor(cols / 2) && r === rows - 1) g.carve(x0 + 2, y + 1, z1, x0 + 3, y + 4, z1);
      checker(g, x0 + 1, y, z0 + 1, x1 - 1, z1 - 1, floor, opts.accent || floor);
      furnish(g, x0 + 2, y + 1, z0 + 2, r * cols + c);
      if (c === 0 || c === cols - 1 || r === 0) {
        g.set(x0 + 2, y + 2, r === 0 ? z0 : z0 + 2, 'glass');
        g.set(x0 + 2, y + 3, r === 0 ? z0 : z0 + 2, 'glass');
      }
    }
  }
  return { rooms: cols * rows, doorX: ox + Math.floor(cols / 2) * step + 2.5, doorZ: oz + rows * step + 0.5, y: y + 1 };
}
