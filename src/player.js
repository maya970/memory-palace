/**
 * 第一人称移动与碰撞。台阶只抬半格（STEP_UP），完整方块不能垂直走上去。
 */
const RADIUS = 0.3;
const HEIGHT = 1.8;
const WALK = 4.6;
const SNEAK = 1.55;
const GRAVITY = 26;
const JUMP = 8.2;
const STEP_UP = 0.51;

function overlaps(px, py, pz, world) {
  return world.overlapsPlayer(px, py, pz, RADIUS, HEIGHT);
}

export function facingFromYaw(yaw) {
  const ax = -Math.sin(yaw);
  const az = -Math.cos(yaw);
  if (Math.abs(ax) > Math.abs(az)) return ax > 0 ? 'e' : 'w';
  return az > 0 ? 's' : 'n';
}

export function blockHitsPlayer(bx, by, bz, px, py, pz) {
  if (px + RADIUS <= bx || px - RADIUS >= bx + 1) return false;
  if (pz + RADIUS <= bz || pz - RADIUS >= bz + 1) return false;
  if (py + HEIGHT <= by || py >= by + 1) return false;
  return true;
}

export class Player {
  constructor(spawn) {
    this.x = spawn.x;
    this.y = spawn.y;
    this.z = spawn.z;
    this.yaw = spawn.yaw || 0;
    this.pitch = spawn.pitch || 0;
    this.vx = 0;
    this.vy = 0;
    this.vz = 0;
    this.grounded = false;
    this.spawn = { ...spawn };
  }

  place(spawn) {
    this.x = spawn.x;
    this.y = spawn.y;
    this.z = spawn.z;
    this.yaw = spawn.yaw ?? this.yaw;
    this.pitch = spawn.pitch ?? this.pitch;
    this.vx = 0;
    this.vy = 0;
    this.vz = 0;
    this.grounded = false;
  }

  look(dx, dy) {
    const sens = 0.0022;
    this.yaw -= dx * sens;
    this.pitch -= dy * sens;
    const limit = Math.PI / 2 - 0.02;
    this.pitch = Math.max(-limit, Math.min(limit, this.pitch));
  }

  eyeHeight(sneaking) {
    return sneaking ? 1.4 : 1.62;
  }

  update(dt, world, input) {
    const forward = (input.forward ? 1 : 0) - (input.back ? 1 : 0);
    const strafe = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    let mag = Math.hypot(forward, strafe);
    let fx = 0;
    let fz = 0;
    if (mag > 0) {
      const f = forward / mag;
      const s = strafe / mag;
      const speed = input.sneak ? SNEAK : WALK;
      fx = (-Math.sin(this.yaw) * f + Math.cos(this.yaw) * s) * speed;
      fz = (-Math.cos(this.yaw) * f - Math.sin(this.yaw) * s) * speed;
    }

    if (this.grounded && input.jump) {
      this.vy = JUMP;
      this.grounded = false;
    }
    if (this.grounded) this.vy = 0;
    else this.vy = Math.max(-36, this.vy - GRAVITY * dt);

    this.moveHorizontal(fx * dt, fz * dt, world, input.sneak && this.grounded);
    this.moveY(this.vy * dt, world);

    if (this.vy <= 0) {
      this.grounded = overlaps(this.x, this.y - 0.08, this.z, world);
      if (this.grounded) this.vy = 0;
    } else {
      this.grounded = false;
    }
  }

  moveHorizontal(dx, dz, world, sneak) {
    this.slide('x', dx, world, sneak);
    this.slide('z', dz, world, sneak);
  }

  slide(axis, delta, world, sneak) {
    if (!delta) return;
    const steps = Math.max(1, Math.ceil(Math.abs(delta) / 0.15));
    const step = delta / steps;
    for (let i = 0; i < steps; i++) {
      const next = this[axis] + step;
      const nx = axis === 'x' ? next : this.x;
      const nz = axis === 'z' ? next : this.z;
      if (overlaps(nx, this.y, nz, world)) {
        const lifted = this.y + STEP_UP;
        if (!sneak && this.grounded && !overlaps(nx, lifted, nz, world)) {
          this.y = lifted;
          this[axis] = next;
          continue;
        }
        break;
      }
      if (sneak && !this.hasFooting(nx, nz, world)) break;
      this[axis] = next;
    }
  }

  hasFooting(x, z, world) {
    const sy = Math.floor(this.y - 1e-3);
    const r = RADIUS - 0.02;
    for (const sx of [x - r, x + r]) {
      for (const sz of [z - r, z + r]) {
        if (!world.isSolid(Math.floor(sx), sy, Math.floor(sz))) return false;
      }
    }
    return true;
  }

  moveY(delta, world) {
    if (!delta) return;
    const steps = Math.max(1, Math.ceil(Math.abs(delta) / 0.2));
    const step = delta / steps;
    for (let i = 0; i < steps; i++) {
      const next = this.y + step;
      if (!overlaps(this.x, next, this.z, world)) {
        this.y = next;
        continue;
      }
      if (step < 0) {
        const snap = world.supportY(this.x, this.y, this.z, RADIUS);
        if (snap != null && !overlaps(this.x, snap, this.z, world)) this.y = snap;
        this.grounded = true;
        this.vy = 0;
      } else {
        this.vy = 0;
      }
      break;
    }
  }
}
