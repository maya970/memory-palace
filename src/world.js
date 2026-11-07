/**
 * 体素世界：放置/拆除、屋顶判定、网格重建。室内外共用同一套天空。
 */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { BLOCKS } from './blocks.js';
import { furnitureGeometry, surfaceLift } from './furniture.js';
import { texturesFor } from './textures.js';
import { buildBase } from './palace.js';
import { currentGraphics } from './graphics.js';
import { makeSurface } from './climate.js';

const MAX = 40000;

function keyOf(x, y, z) {
  return `${x},${y},${z}`;
}

function wallGeometry() {
  const planes = [
    [0, 0, 0.5, 0],
    [0, 0, -0.5, Math.PI],
    [0.5, 0, 0, Math.PI / 2],
    [-0.5, 0, 0, -Math.PI / 2],
  ].map(([x, y, z, ry]) => {
    const plane = new THREE.PlaneGeometry(1, 1);
    plane.rotateY(ry);
    plane.translate(x, y, z);
    return plane;
  });
  return mergeGeometries(planes);
}

function capGeometry(y) {
  const plane = new THREE.PlaneGeometry(1, 1);
  plane.rotateX(y > 0 ? -Math.PI / 2 : Math.PI / 2);
  plane.translate(0, y, 0);
  return plane;
}

function partBox(x, y, z, w, h, d) {
  const geo = new THREE.BoxGeometry(w, h, d);
  geo.translate(x + w / 2 - 0.5, y + h / 2 - 0.5, z + d / 2 - 0.5);
  return geo;
}

function slabGeometry() {
  return partBox(0, 0, 0, 1, 0.5, 1);
}

function stairsGeometry() {
  return mergeGeometries([
    partBox(0, 0, 0, 1, 0.5, 1),
    partBox(0, 0.5, 0.5, 1, 0.5, 0.5),
  ]);
}

const FACE_YAW = { n: Math.PI, s: 0, e: -Math.PI / 2, w: Math.PI / 2 };

function normalizeFace(face) {
  return FACE_YAW[face] != null ? face : 's';
}

function lambert(map, transparent, type) {
  return makeSurface(map, transparent, type);
}

export class World {
  constructor(scene, water) {
    this.scene = scene;
    this.water = water;
    this.blocks = new Map();
    this.base = new Map();
    this.index = new Map();
    this.groups = new Map();
    this.shelves = new Set();
    this.covers = new Map();
    this.faces = new Map();
    this.dummy = new THREE.Object3D();
    this.wallGeo = wallGeometry();
    this.topGeo = capGeometry(0.5);
    this.bottomGeo = capGeometry(-0.5);
    this.boxGeo = new THREE.BoxGeometry(1, 1, 1);
    this.slabGeo = slabGeometry();
    this.stairsGeo = stairsGeometry();
  }

  init(diff) {
    this.clear();
    buildBase((x, y, z, type) => {
      this.base.set(keyOf(x, y, z), type);
    });
    this.blocks = new Map(this.base);
    this.water?.clear();
    if (diff) this.applyDiff(diff);
  }

  meshLiquid() {
    return currentGraphics().water === 'cube';
  }

  clear() {
    for (const group of this.groups.values()) {
      for (const mesh of group.meshes) {
        this.scene.remove(mesh);
        mesh.material.dispose();
      }
    }
    this.groups.clear();
    this.index.clear();
    this.shelves.clear();
    this.covers.clear();
    this.faces.clear();
    this.blocks.clear();
  }

  applyDiff(diff) {
    for (const key of diff.removed || []) this.blocks.delete(key);
    for (const item of diff.placed || []) {
      const [x, y, z, type, face] = item;
      if (!BLOCKS[type]) continue;
      const key = keyOf(x, y, z);
      this.blocks.set(key, type);
      if (BLOCKS[type]?.shape === 'stairs' && face) this.faces.set(key, normalizeFace(face));
    }
    for (const item of diff.covers || []) {
      const [x, y, z, type] = item;
      if (!BLOCKS[type]) continue;
      this.covers.set(keyOf(x, y, z), type);
    }
  }

  toDiff() {
    const removed = [];
    const placed = [];
    for (const [key, type] of this.base) {
      const now = this.blocks.get(key);
      if (now == null) removed.push(key);
      else if (now !== type) {
        const [x, y, z] = key.split(',').map(Number);
        placed.push(this.placedRow(x, y, z, now));
      }
    }
    for (const [key, type] of this.blocks) {
      if (this.base.has(key)) continue;
      if (this.water?.flowed.has(key)) continue;
      const [x, y, z] = key.split(',').map(Number);
      placed.push(this.placedRow(x, y, z, type));
    }
    const covers = [];
    for (const [key, type] of this.covers) {
      const [x, y, z] = key.split(',').map(Number);
      covers.push([x, y, z, type]);
    }
    return { removed, placed, covers };
  }

  placedRow(x, y, z, type) {
    const face = this.faces.get(keyOf(x, y, z));
    return face && BLOCKS[type]?.shape === 'stairs' ? [x, y, z, type, face] : [x, y, z, type];
  }

  async rebuildMeshes(onProgress) {
    for (const group of this.groups.values()) {
      for (const mesh of group.meshes) {
        this.scene.remove(mesh);
        mesh.material.dispose();
      }
    }
    this.groups.clear();
    this.index.clear();
    this.shelves.clear();
    const jobs = [];
    for (const [key, type] of this.blocks) {
      if (type === 'water' && !this.meshLiquid()) continue;
      jobs.push({ key, type, cover: false });
    }
    for (const [key, type] of this.covers) jobs.push({ key, type, cover: true });
    const total = Math.max(1, jobs.length);
    for (let i = 0; i < jobs.length; i += 1) {
      const job = jobs[i];
      const [x, y, z] = job.key.split(',').map(Number);
      if (job.cover) this.attach(`c:${job.key}`, job.type, x, y, z, true, surfaceLift(BLOCKS[this.blocks.get(job.key)]));
      else this.attach(job.key, job.type, x, y, z, true, 0);
      if (onProgress && i % 480 === 0) {
        onProgress(i / total);
        await new Promise((resolve) => requestAnimationFrame(resolve));
      }
    }
    this.water?.rebuild(this, currentGraphics());
    for (const group of this.groups.values()) {
      for (const mesh of group.meshes) {
        mesh.count = group.keys.length;
        mesh.instanceMatrix.needsUpdate = true;
      }
    }
    onProgress?.(1);
  }

  ensureGroup(type) {
    let group = this.groups.get(type);
    if (group) return group;
    const tex = texturesFor(type);
    const transparent = Boolean(BLOCKS[type]?.transparent || tex.transparent);
    const meshes = [];
    const add = (geo, map) => {
      const mesh = new THREE.InstancedMesh(geo, lambert(map, transparent, type), MAX);
      mesh.count = 0;
      mesh.frustumCulled = false;
      this.scene.add(mesh);
      meshes.push(mesh);
    };
    const shaped = furnitureGeometry(type);
    if (shaped) add(shaped, tex.side);
    else if (BLOCKS[type]?.shape === 'slab') add(this.slabGeo, tex.side);
    else if (BLOCKS[type]?.shape === 'stairs') add(this.stairsGeo, tex.side);
    else if (tex.uniform) add(this.boxGeo, tex.side);
    else {
      add(this.wallGeo, tex.side);
      add(this.topGeo, tex.top);
      add(this.bottomGeo, tex.bottom);
    }
    group = { keys: [], meshes };
    this.groups.set(type, group);
    return group;
  }

  attach(key, type, x, y, z, batched = false, lift = 0) {
    const group = this.ensureGroup(type);
    if (group.keys.length >= MAX) return false;
    const index = group.keys.length;
    group.keys.push(key);
    this.index.set(key, { type, index, lift, x, y, z });
    if (BLOCKS[type]?.noteHost) this.shelves.add(key.startsWith('c:') ? key.slice(2) : key);
    this.write(group, index, x, y, z, batched, lift);
    return true;
  }

  write(group, index, x, y, z, batched, lift = 0) {
    this.dummy.position.set(x + 0.5, y + 0.5 + lift, z + 0.5);
    const face = this.faces.get(keyOf(x, y, z));
    this.dummy.rotation.set(0, FACE_YAW[face] || 0, 0);
    this.dummy.scale.set(1, 1, 1);
    this.dummy.updateMatrix();
    for (const mesh of group.meshes) {
      mesh.setMatrixAt(index, this.dummy.matrix);
      mesh.count = group.keys.length;
      if (!batched) mesh.instanceMatrix.needsUpdate = true;
    }
  }

  get(x, y, z) {
    return this.blocks.get(keyOf(x, y, z)) || null;
  }

  getCover(x, y, z) {
    return this.covers.get(keyOf(x, y, z)) || null;
  }

  hostType(x, y, z) {
    const cover = this.getCover(x, y, z);
    if (cover && BLOCKS[cover]?.noteHost) return cover;
    const type = this.get(x, y, z);
    return BLOCKS[type]?.noteHost ? type : cover || type;
  }

  isSolid(x, y, z) {
    const type = this.blocks.get(keyOf(x, y, z));
    if (!type) return false;
    return BLOCKS[type]?.solid !== false;
  }

  hitboxes(x, y, z, type) {
    const shape = BLOCKS[type]?.shape;
    if (shape === 'slab') {
      return [{ x0: x, y0: y, z0: z, x1: x + 1, y1: y + 0.5, z1: z + 1 }];
    }
    if (shape === 'stairs') {
      const face = this.faces.get(keyOf(x, y, z)) || 's';
      const high = {
        s: { x0: x, y0: y + 0.5, z0: z + 0.5, x1: x + 1, y1: y + 1, z1: z + 1 },
        n: { x0: x, y0: y + 0.5, z0: z, x1: x + 1, y1: y + 1, z1: z + 0.5 },
        e: { x0: x + 0.5, y0: y + 0.5, z0: z, x1: x + 1, y1: y + 1, z1: z + 1 },
        w: { x0: x, y0: y + 0.5, z0: z, x1: x + 0.5, y1: y + 1, z1: z + 1 },
      }[face];
      return [
        { x0: x, y0: y, z0: z, x1: x + 1, y1: y + 0.5, z1: z + 1 },
        high,
      ];
    }
    return [{ x0: x, y0: y, z0: z, x1: x + 1, y1: y + 1, z1: z + 1 }];
  }

  overlapsPlayer(px, py, pz, radius, height) {
    const minX = Math.floor(px - radius);
    const maxX = Math.floor(px + radius - 1e-4);
    const minY = Math.floor(py + 1e-4);
    const maxY = Math.floor(py + height - 1e-4);
    const minZ = Math.floor(pz - radius);
    const maxZ = Math.floor(pz + radius - 1e-4);
    const ax0 = px - radius;
    const ax1 = px + radius;
    const ay0 = py;
    const ay1 = py + height;
    const az0 = pz - radius;
    const az1 = pz + radius;
    for (let y = minY; y <= maxY; y += 1) {
      for (let z = minZ; z <= maxZ; z += 1) {
        for (let x = minX; x <= maxX; x += 1) {
          const type = this.get(x, y, z);
          if (!type || BLOCKS[type]?.solid === false) continue;
          for (const box of this.hitboxes(x, y, z, type)) {
            if (ax1 <= box.x0 || ax0 >= box.x1) continue;
            if (ay1 <= box.y0 || ay0 >= box.y1) continue;
            if (az1 <= box.z0 || az0 >= box.z1) continue;
            return true;
          }
        }
      }
    }
    return false;
  }

  supportY(px, py, pz, radius) {
    let best = -Infinity;
    const minX = Math.floor(px - radius);
    const maxX = Math.floor(px + radius - 1e-4);
    const minY = Math.floor(py - 1.2);
    const maxY = Math.floor(py + 0.05);
    const minZ = Math.floor(pz - radius);
    const maxZ = Math.floor(pz + radius - 1e-4);
    const ax0 = px - radius;
    const ax1 = px + radius;
    const az0 = pz - radius;
    const az1 = pz + radius;
    for (let y = minY; y <= maxY; y += 1) {
      for (let z = minZ; z <= maxZ; z += 1) {
        for (let x = minX; x <= maxX; x += 1) {
          const type = this.get(x, y, z);
          if (!type || BLOCKS[type]?.solid === false) continue;
          for (const box of this.hitboxes(x, y, z, type)) {
            if (ax1 <= box.x0 || ax0 >= box.x1) continue;
            if (az1 <= box.z0 || az0 >= box.z1) continue;
            if (box.y1 <= py + 0.02 && box.y1 > best) best = box.y1;
          }
        }
      }
    }
    return best === -Infinity ? null : best;
  }

  isRoofed(x, y, z) {
    const gx = Math.floor(x);
    const gy = Math.floor(y + 0.2);
    const gz = Math.floor(z);
    for (let up = 1; up <= 8; up += 1) {
      const type = this.get(gx, gy + up, gz);
      if (type && BLOCKS[type]?.solid !== false) return true;
    }
    return false;
  }

  setBlock(x, y, z, type, origin = 'world', face = null) {
    const key = keyOf(x, y, z);
    const prev = this.blocks.get(key) || null;
    if (prev === type && (face == null || this.faces.get(key) === face)) return true;
    if (prev === 'water') this.water?.forget(x, y, z);
    if (prev) this.detach(key);
    this.faces.delete(key);
    if (!type || !BLOCKS[type]?.furnish) {
      if (this.covers.has(key)) this.setCover(x, y, z, null);
    }
    if (!type) {
      this.blocks.delete(key);
      return true;
    }
    this.blocks.set(key, type);
    if (BLOCKS[type]?.shape === 'stairs') this.faces.set(key, normalizeFace(face));
    if (type === 'water') {
      if (origin === 'player') this.water?.markSource(x, y, z);
      if (origin === 'flow') this.water?.flowed.add(key);
      this.water?.invalidate();
      if (!this.meshLiquid()) return true;
    }
    if (!this.attach(key, type, x, y, z, false, 0)) {
      this.blocks.delete(key);
      this.faces.delete(key);
      return false;
    }
    return true;
  }

  meshes() {
    const list = [];
    for (const group of this.groups.values()) list.push(...group.meshes);
    return list;
  }

  setCover(x, y, z, type) {
    const key = keyOf(x, y, z);
    const prev = this.covers.get(key) || null;
    if (prev === type) return true;
    if (prev) this.detach(`c:${key}`);
    if (!type) {
      this.covers.delete(key);
      return true;
    }
    const lift = surfaceLift(BLOCKS[this.blocks.get(key)]);
    if (!this.attach(`c:${key}`, type, x, y, z, false, lift)) return false;
    this.covers.set(key, type);
    return true;
  }

  detach(key) {
    const info = this.index.get(key);
    if (!info) return;
    const group = this.groups.get(info.type);
    const last = group.keys.length - 1;
    const lastKey = group.keys[last];
    if (info.index !== last) {
      group.keys[info.index] = lastKey;
      const moved = this.index.get(lastKey);
      moved.index = info.index;
      this.write(group, info.index, moved.x, moved.y, moved.z, false, moved.lift || 0);
    }
    group.keys.pop();
    this.index.delete(key);
    this.shelves.delete(key);
    for (const mesh of group.meshes) {
      mesh.count = group.keys.length;
      mesh.instanceMatrix.needsUpdate = true;
    }
    this.blocks.delete(key);
  }

  raycast(origin, direction, maxDist = 5.5) {
    const dir = direction.clone();
    if (dir.lengthSq() === 0) return null;
    dir.normalize();
    let x = Math.floor(origin.x);
    let y = Math.floor(origin.y);
    let z = Math.floor(origin.z);
    const stepX = Math.abs(dir.x) < 1e-8 ? 0 : Math.sign(dir.x);
    const stepY = Math.abs(dir.y) < 1e-8 ? 0 : Math.sign(dir.y);
    const stepZ = Math.abs(dir.z) < 1e-8 ? 0 : Math.sign(dir.z);
    const tDeltaX = stepX === 0 ? Infinity : Math.abs(1 / dir.x);
    const tDeltaY = stepY === 0 ? Infinity : Math.abs(1 / dir.y);
    const tDeltaZ = stepZ === 0 ? Infinity : Math.abs(1 / dir.z);
    const intbound = (s, step, delta) => {
      if (step === 0) return Infinity;
      const floor = Math.floor(s);
      if (step > 0) return (floor + 1 - s) * delta;
      const frac = s - floor;
      return (frac === 0 ? 1 : frac) * delta;
    };
    let tMaxX = intbound(origin.x, stepX, tDeltaX);
    let tMaxY = intbound(origin.y, stepY, tDeltaY);
    let tMaxZ = intbound(origin.z, stepZ, tDeltaZ);
    let faceX = 0;
    let faceY = 0;
    let faceZ = 0;
    let dist = 0;

    for (let i = 0; i < 48; i++) {
      const type = this.blocks.get(keyOf(x, y, z));
      if (type && dist <= maxDist && BLOCKS[type]?.liquid !== true) {
        if (!(dist < 1e-6 && BLOCKS[type].solid === false)) {
          return { x, y, z, type, dist, nx: -faceX, ny: -faceY, nz: -faceZ };
        }
      }
      if (tMaxX < tMaxY && tMaxX < tMaxZ) {
        if (tMaxX > maxDist) return null;
        x += stepX;
        dist = tMaxX;
        tMaxX += tDeltaX;
        faceX = stepX;
        faceY = 0;
        faceZ = 0;
      } else if (tMaxY < tMaxZ) {
        if (tMaxY > maxDist) return null;
        y += stepY;
        dist = tMaxY;
        tMaxY += tDeltaY;
        faceY = stepY;
        faceX = 0;
        faceZ = 0;
      } else {
        if (tMaxZ > maxDist) return null;
        z += stepZ;
        dist = tMaxZ;
        tMaxZ += tDeltaZ;
        faceZ = stepZ;
        faceX = 0;
        faceY = 0;
      }
    }
    return null;
  }
}

export class Particles {
  constructor(scene) {
    this.scene = scene;
    this.geo = new THREE.BoxGeometry(0.12, 0.12, 0.12);
    this.items = [];
  }

  burst(x, y, z, color) {
    for (let i = 0; i < 8; i++) {
      const material = new THREE.MeshLambertMaterial({ color });
      const mesh = new THREE.Mesh(this.geo, material);
      mesh.position.set(
        x + 0.5 + (Math.random() - 0.5) * 0.6,
        y + 0.5 + (Math.random() - 0.5) * 0.6,
        z + 0.5 + (Math.random() - 0.5) * 0.6,
      );
      this.scene.add(mesh);
      this.items.push({
        mesh,
        material,
        life: 0.45 + Math.random() * 0.2,
        age: 0,
        vx: (Math.random() - 0.5) * 3,
        vy: 1.5 + Math.random() * 2.4,
        vz: (Math.random() - 0.5) * 3,
      });
    }
  }

  update(dt) {
    for (let i = this.items.length - 1; i >= 0; i--) {
      const item = this.items[i];
      item.age += dt;
      item.vy -= 9 * dt;
      item.mesh.position.x += item.vx * dt;
      item.mesh.position.y += item.vy * dt;
      item.mesh.position.z += item.vz * dt;
      const left = 1 - item.age / item.life;
      item.mesh.scale.setScalar(Math.max(0.01, left));
      if (item.age >= item.life) {
        this.scene.remove(item.mesh);
        item.material.dispose();
        this.items.splice(i, 1);
      }
    }
  }
}
