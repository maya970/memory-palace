import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { BLOCKS } from './blocks.js';
import { furnitureGeometry, surfaceLift } from './furniture.js';
import { texturesFor } from './textures.js';
import { buildBase } from './palace.js';
import { loadGraphics } from './graphics.js';
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
    this.dummy = new THREE.Object3D();
    this.wallGeo = wallGeometry();
    this.topGeo = capGeometry(0.5);
    this.bottomGeo = capGeometry(-0.5);
    this.boxGeo = new THREE.BoxGeometry(1, 1, 1);
  }

  init(diff) {
    this.clear();
    buildBase((x, y, z, type) => {
      this.base.set(keyOf(x, y, z), type);
    });
    this.blocks = new Map(this.base);
    this.water?.clear();
    if (diff) this.applyDiff(diff);
    this.rebuildMeshes();
  }

  meshLiquid() {
    return loadGraphics().water === 'cube';
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
    this.blocks.clear();
  }

  applyDiff(diff) {
    for (const key of diff.removed || []) this.blocks.delete(key);
    for (const item of diff.placed || []) {
      const [x, y, z, type] = item;
      if (!BLOCKS[type]) continue;
      this.blocks.set(keyOf(x, y, z), type);
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
        placed.push([x, y, z, now]);
      }
    }
    for (const [key, type] of this.blocks) {
      if (this.base.has(key)) continue;
      if (this.water?.flowed.has(key)) continue;
      const [x, y, z] = key.split(',').map(Number);
      placed.push([x, y, z, type]);
    }
    const covers = [];
    for (const [key, type] of this.covers) {
      const [x, y, z] = key.split(',').map(Number);
      covers.push([x, y, z, type]);
    }
    return { removed, placed, covers };
  }

  rebuildMeshes() {
    for (const group of this.groups.values()) {
      for (const mesh of group.meshes) {
        this.scene.remove(mesh);
        mesh.material.dispose();
      }
    }
    this.groups.clear();
    this.index.clear();
    this.shelves.clear();
    for (const [key, type] of this.blocks) {
      if (type === 'water' && !this.meshLiquid()) continue;
      const [x, y, z] = key.split(',').map(Number);
      this.attach(key, type, x, y, z, true, 0);
    }
    this.water?.rebuild(this, loadGraphics());
    for (const [key, type] of this.covers) {
      const [x, y, z] = key.split(',').map(Number);
      this.attach(`c:${key}`, type, x, y, z, true, surfaceLift(BLOCKS[this.blocks.get(key)]));
    }
    for (const group of this.groups.values()) {
      for (const mesh of group.meshes) {
        mesh.count = group.keys.length;
        mesh.instanceMatrix.needsUpdate = true;
      }
    }
  }

  ensureGroup(type) {
    let group = this.groups.get(type);
    if (group) return group;
    const tex = texturesFor(type);
    const transparent = Boolean(BLOCKS[type]?.transparent || tex.transparent || BLOCKS[type]?.solid === false);
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
    this.dummy.rotation.set(0, 0, 0);
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

  setBlock(x, y, z, type, origin = 'world') {
    const key = keyOf(x, y, z);
    const prev = this.blocks.get(key) || null;
    if (prev === type) return true;
    if (prev === 'water') this.water?.forget(x, y, z);
    if (prev) this.detach(key);
    if (!type || !BLOCKS[type]?.furnish) {
      if (this.covers.has(key)) this.setCover(x, y, z, null);
    }
    if (!type) {
      this.blocks.delete(key);
      return true;
    }
    this.blocks.set(key, type);
    if (type === 'water') {
      if (origin === 'player') this.water?.markSource(x, y, z);
      if (origin === 'flow') this.water?.flowed.add(key);
      this.water?.invalidate();
      if (!this.meshLiquid()) return true;
    }
    if (!this.attach(key, type, x, y, z, false, 0)) {
      this.blocks.delete(key);
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
      if (type && dist <= maxDist && (BLOCKS[type].solid !== false || BLOCKS[type].noteHost)) {
        return { x, y, z, type, dist, nx: -faceX, ny: -faceY, nz: -faceZ };
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
