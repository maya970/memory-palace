/** 室内摆设与房间模板，给官方宫殿拼装用。 */
import { palace } from './presets-lib.js';

export function grid() {
  const cells = new Map();
  const covers = [];
  const faces = new Map();
  const g = {
    set(x, y, z, type, face) {
      const key = `${x},${y},${z}`;
      if (!type) {
        cells.delete(key);
        faces.delete(key);
        return;
      }
      cells.set(key, type);
      if (face) faces.set(key, face);
      else faces.delete(key);
    },
    get(x, y, z) {
      return cells.get(`${x},${y},${z}`) || null;
    },
    box(x0, y0, z0, x1, y1, z1, type, skip) {
      for (let y = y0; y <= y1; y += 1) {
        for (let z = z0; z <= z1; z += 1) {
          for (let x = x0; x <= x1; x += 1) {
            if (skip?.(x, y, z)) continue;
            g.set(x, y, z, type);
          }
        }
      }
    },
    carve(x0, y0, z0, x1, y1, z1) {
      g.box(x0, y0, z0, x1, y1, z1, null);
    },
    cover(x, y, z, type) {
      covers.push([x, y, z, type]);
    },
    placed() {
      const placed = [];
      for (const [key, type] of cells) {
        const [x, y, z] = key.split(',').map(Number);
        const face = faces.get(key);
        placed.push(face ? [x, y, z, type, face] : [x, y, z, type]);
      }
      placed.covers = covers;
      return placed;
    },
  };
  return g;
}

export function checker(g, x0, y, z0, x1, z1, a, b) {
  for (let z = z0; z <= z1; z += 1) {
    for (let x = x0; x <= x1; x += 1) {
      g.set(x, y, z, (x + z) % 2 === 0 ? a : b);
    }
  }
}

export function lancetZ(g, cx, z, y0, stone, glass) {
  for (let dy = 0; dy <= 12; dy += 1) {
    for (let dx = -2; dx <= 2; dx += 1) g.set(cx + dx, y0 + dy, z, stone);
  }
  for (let dy = 1; dy <= 9; dy += 1) {
    for (let dx = -1; dx <= 1; dx += 1) g.set(cx + dx, y0 + dy, z, glass);
  }
  for (let dy = 1; dy <= 9; dy += 1) g.set(cx, y0 + dy, z, stone);
  for (let dx = -1; dx <= 1; dx += 1) g.set(cx + dx, y0 + 5, z, stone);
  g.set(cx, y0 + 10, z, glass);
  g.set(cx - 1, y0 + 10, z, stone);
  g.set(cx + 1, y0 + 10, z, stone);
  g.set(cx, y0 + 11, z, stone);
  g.set(cx - 1, y0 + 2, z, 'wool_blue');
  g.set(cx + 1, y0 + 3, z, 'wool_red');
  g.set(cx - 1, y0 + 6, z, 'wool_yellow');
  g.set(cx + 1, y0 + 7, z, 'wool_purple');
  g.set(cx - 2, y0, z - 1, stone);
  g.set(cx + 2, y0, z - 1, stone);
  g.set(cx - 2, y0, z + 1, stone);
  g.set(cx + 2, y0, z + 1, stone);
}

export function lancetX(g, x, cz, y0, stone, glass) {
  for (let dy = 0; dy <= 12; dy += 1) {
    for (let dz = -2; dz <= 2; dz += 1) g.set(x, y0 + dy, cz + dz, stone);
  }
  for (let dy = 1; dy <= 9; dy += 1) {
    for (let dz = -1; dz <= 1; dz += 1) g.set(x, y0 + dy, cz + dz, glass);
  }
  for (let dy = 1; dy <= 9; dy += 1) g.set(x, y0 + dy, cz, stone);
  for (let dz = -1; dz <= 1; dz += 1) g.set(x, y0 + 5, cz + dz, stone);
  g.set(x, y0 + 10, cz, glass);
  g.set(x, y0 + 11, cz, stone);
  g.set(x, y0 + 2, cz - 1, 'wool_blue');
  g.set(x, y0 + 4, cz + 1, 'wool_red');
  g.set(x, y0 + 7, cz - 1, 'lapis');
}

export function portalZ(g, cx, z, y0, stone) {
  for (let layer = 3; layer >= 1; layer -= 1) {
    const kind = layer === 1 ? stone : layer === 2 ? 'cobblestone' : 'deepslate';
    for (let dy = 0; dy <= 8 + layer; dy += 1) {
      for (let dx = -1 - layer; dx <= 1 + layer; dx += 1) {
        g.set(cx + dx, y0 + dy, z - (3 - layer), kind);
      }
    }
  }
  g.carve(cx - 1, y0, z - 2, cx + 1, y0 + 6, z);
  g.set(cx, y0 + 7, z, stone);
  g.set(cx - 1, y0 + 6, z, stone);
  g.set(cx + 1, y0 + 6, z, stone);
  g.set(cx - 2, y0 + 8, z, 'gold');
  g.set(cx + 2, y0 + 8, z, 'gold');
}

export function capital(g, x, z, y, type) {
  g.box(x - 1, y, z - 1, x + 1, y, z + 1, type);
  g.set(x, y + 1, z, 'gold');
}

export function shaft(g, x, z, y0, y1, type) {
  g.box(x, y0, z, x, y1, z, type);
  g.box(x - 1, y0, z - 1, x + 1, y0, z + 1, type);
  capital(g, x, z, y1, type);
}

export function cornice(g, x0, y, z0, x1, z1, type) {
  for (let x = x0; x <= x1; x += 1) {
    g.set(x, y, z0, type);
    g.set(x, y, z1, type);
    if (x % 2 === 0) {
      g.set(x, y, z0 - 1, type);
      g.set(x, y, z1 + 1, type);
    }
  }
  for (let z = z0; z <= z1; z += 1) {
    g.set(x0, y, z, type);
    g.set(x1, y, z, type);
    if (z % 2 === 0) {
      g.set(x0 - 1, y, z, type);
      g.set(x1 + 1, y, z, type);
    }
  }
}

export function band(g, x0, y, z0, x1, z1, type) {
  for (let x = x0; x <= x1; x += 1) {
    g.set(x, y, z0, type);
    g.set(x, y, z1, type);
  }
  for (let z = z0; z <= z1; z += 1) {
    g.set(x0, y, z, type);
    g.set(x1, y, z, type);
  }
}

export function finish(id, name, lead, g, spawn, credit, country) {
  return palace(id, name, lead, g.placed(), spawn, credit, country);
}

export function study(g, x, y, z) {
  g.set(x, y, z, 'writing_desk');
  g.set(x + 2, y, z, 'oak_chair');
  g.set(x - 2, y, z, 'bookshelf');
  g.set(x - 2, y + 1, z, 'bookshelf');
  g.set(x - 2, y + 2, z, 'bookshelf');
  g.cover(x, y, z, 'open_notebook');
}

export function chamber(g, x, y, z) {
  g.set(x, y, z, 'bed');
  g.cover(x, y, z, 'sheet_white');
  g.set(x + 1, y, z, 'nightstand');
  g.cover(x + 1, y, z, 'candle');
  g.set(x + 3, y, z, 'wardrobe');
  g.set(x + 3, y, z + 1, 'coat');
}

export function teaRoom(g, x, y, z) {
  g.set(x, y, z, 'tea_table');
  g.cover(x, y, z, 'cloth_green');
  g.set(x + 2, y, z, 'oak_chair');
  g.set(x - 2, y, z, 'stool');
  g.set(x, y, z + 2, 'sideboard');
  g.cover(x, y, z + 2, 'teapot');
}
