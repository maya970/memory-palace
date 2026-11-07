export const SOUTH = { x: 0.5, y: 1, z: 4.5, yaw: Math.PI, pitch: -0.08 };

export function add(placed, x, y, z, type) {
  placed.push([x, y, z, type]);
}

export function box(placed, x0, y0, z0, x1, y1, z1, type, skip) {
  for (let y = y0; y <= y1; y += 1) {
    for (let z = z0; z <= z1; z += 1) {
      for (let x = x0; x <= x1; x += 1) {
        if (skip?.(x, y, z)) continue;
        add(placed, x, y, z, type);
      }
    }
  }
}

export function room(placed, x0, z0, x1, z1, wall, floor, roof, height = 4) {
  box(placed, x0, 0, z0, x1, 0, z1, floor);
  box(placed, x0, 1, z0, x1, height - 1, z1, wall, (x, y, z) => x > x0 && x < x1 && z > z0 && z < z1);
  box(placed, x0, height, z0, x1, height, z1, roof);
}

export function door(placed, x, y0, y1, z, fill = null) {
  for (let y = y0; y <= y1; y += 1) {
    const index = placed.findIndex((item) => item[0] === x && item[1] === y && item[2] === z);
    if (index >= 0) {
      if (fill) placed[index][3] = fill;
      else placed.splice(index, 1);
    }
  }
}

export function disk(placed, cx, cz, y, r, type, hole = 0) {
  for (let z = -r; z <= r; z += 1) {
    for (let x = -r; x <= r; x += 1) {
      const d = x * x + z * z;
      if (d > r * r || d < hole * hole) continue;
      add(placed, cx + x, y, cz + z, type);
    }
  }
}

export function kit(placed, x = -2, z = 0) {
  add(placed, x, 1, z, 'bookshelf');
  add(placed, x + 2, 1, z, 'writing_desk');
  add(placed, x + 2, 2, z, 'open_notebook');
}

export function palace(id, name, lead, placed, spawn, credit) {
  return {
    id,
    name,
    lead,
    credit: credit || '宫殿自制。风格取自已进入公有领域的历史建筑类型，不是某座现代测绘或商标地标。',
    spawn: spawn || SOUTH,
    world: { removed: [], placed },
  };
}
