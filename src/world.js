import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { BLOCKS } from './blocks.js';
import { texturesFor } from './textures.js';
import { buildBase } from './palace.js';

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

function lambert(map, transparent) {
  return new THREE.MeshLambertMaterial({
    map,
    transparent,
    alphaTest: transparent ? 0.15 : 0,
    depthWrite: !transparent,
    side: THREE.FrontSide,
  });
}

export class World {
  constructor(scene) {
    this.scene = scene;
    this.blocks = new Map();
    this.base = new Map();
    this.index = new Map();
    this.groups = new Map();
    this.shelves = new Set();
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
    if (diff) this.applyDiff(diff);
    this.rebuildMeshes();
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
    this.blocks.clear();
  }

  applyDiff(diff) {
    for (const key of diff.removed || []) this.blocks.delete(key);
    for (const item of diff.placed || []) {
      const [x, y, z, type] = item;
      if (!BLOCKS[type]) continue;
      this.blocks.set(keyOf(x, y, z), type);
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
      const [x, y, z] = key.split(',').map(Number);
      placed.push([x, y, z, type]);
    }
    return { removed, placed };
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
      const [x, y, z] = key.split(',').map(Number);
      this.attach(key, type, x, y, z, true);
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
    const transparent = Boolean(BLOCKS[type]?.transparent || tex.transparent);
    const meshes = [];
    const add = (geo, map) => {
      const mesh = new THREE.InstancedMesh(geo, lambert(map, transparent), MAX);
      mesh.count = 0;
      mesh.frustumCulled = false;
      this.scene.add(mesh);
      meshes.push(mesh);
    };
    if (tex.uniform) add(this.boxGeo, tex.side);
    else {
      add(this.wallGeo, tex.side);
      add(this.topGeo, tex.top);
      add(this.bottomGeo, tex.bottom);
    }
    group = { keys: [], meshes };
    this.groups.set(type, group);
    return group;
  }

  attach(key, type, x, y, z, batched = false) {
    const group = this.ensureGroup(type);
    if (group.keys.length >= MAX) return false;
    const index = group.keys.length;
    group.keys.push(key);
    this.index.set(key, { type, index });
    if (type === 'bookshelf') this.shelves.add(key);
    this.write(group, index, x, y, z, batched);
    return true;
  }

  write(group, index, x, y, z, batched) {
    this.dummy.position.set(x + 0.5, y + 0.5, z + 0.5);
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

  isSolid(x, y, z) {
    return this.blocks.has(keyOf(x, y, z));
  }

  setBlock(x, y, z, type) {
    const key = keyOf(x, y, z);
    const prev = this.blocks.get(key) || null;
    if (prev === type) return true;
    if (prev) this.detach(key);
    if (!type) {
      this.blocks.delete(key);
      return true;
    }
    if (!this.attach(key, type, x, y, z)) return false;
    this.blocks.set(key, type);
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
      this.index.get(lastKey).index = info.index;
      const [x, y, z] = lastKey.split(',').map(Number);
      this.write(group, info.index, x, y, z, false);
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
      if (type && dist <= maxDist) {
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
