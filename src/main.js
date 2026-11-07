import * as THREE from 'three';
import { CSS2DObject, CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';
import { BLOCKS, isNoteHost } from './blocks.js';
import { canPlaceOn, sitsOnFurniture, surfaceLift } from './furniture.js';
import { createInventory } from './inventory.js';
import { iconFor, loadTextures } from './textures.js';
import { BUILD_MAX, BUILD_MIN, SPAWN, Y_MAX, Y_MIN } from './palace.js';
import { World, Particles } from './world.js';
import { Player, blockHitsPlayer, facingFromYaw } from './player.js';
import { loadSave, writeSave } from './storage.js';
import { sfx } from './audio.js';
import {
  createNote,
  isEmptyNote,
  normalizeNote,
  parseShelf,
  regionName,
  shelfKey,
  sortNotes,
} from './notes.js';
import { starterNotes as buildStarterNotes } from './palace.js';
import { createEditor } from './editor.js';
import { createBackup } from './backup-ui.js';
import { publishPublicNote } from './remote.js';
import { createDocs } from './docs.js';
import { bundleToSave } from './bundle.js';
import { accountNeedsExport, clearWallets, loadWallets } from './wallets.js';
import { t } from './i18n.js';
import { createCommunity } from './community-ui.js';
import { applySavedMods, dropNoteInRoom, hydrateMods } from './community.js';
import { applyLights, beginGraphics, currentGraphics, loadGraphics, saveGraphics } from './graphics.js';
import { isHandheld, markDevice } from './device.js';
import { WaterView } from './water.js';
import { Atmosphere } from './atmosphere.js';
import { installEnvironment, setClimate } from './climate.js';

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const handheld = isHandheld();
markDevice();
const dirs = ['北', '东北', '东', '东南', '南', '西南', '西', '西北'];
const view = document.querySelector('#view');
const hud = document.querySelector('#hud');
const coordsEl = document.querySelector('#coords');
const compassEl = document.querySelector('#compass');
const promptEl = document.querySelector('#prompt');
const hotbarEl = document.querySelector('#hotbar');
const hotbarNameEl = document.querySelector('#hotbar-name');
const toastBox = document.querySelector('#toasts');
const startEl = document.querySelector('#start');
const introEl = document.querySelector('#intro');
const pauseEl = document.querySelector('#pause');
const helpEl = document.querySelector('#help');
const docsEl = document.querySelector('#docs');
const leaveEl = document.querySelector('#leave');
const communityEl = document.querySelector('#community');
const graphicsEl = document.querySelector('#graphics');
let gfx = loadGraphics();
let flowAcc = 0;
let dropOnClose = false;
let pendingLook = null;

const input = {
  forward: false,
  back: false,
  left: false,
  right: false,
  jump: false,
  sneak: false,
};

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xb08a62);
scene.fog = new THREE.FogExp2(0xb08a62, 0.012);

const camera = new THREE.PerspectiveCamera(72, 1, 0.08, 400);
camera.rotation.order = 'YXZ';

const renderer = new THREE.WebGLRenderer({ antialias: !handheld, powerPreference: handheld ? 'low-power' : 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, handheld ? 1 : 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
view.appendChild(renderer.domElement);

const labelRenderer = new CSS2DRenderer();
labelRenderer.domElement.style.position = 'absolute';
labelRenderer.domElement.style.inset = '0';
labelRenderer.domElement.style.pointerEvents = 'none';
labelRenderer.domElement.style.zIndex = '1';
view.appendChild(labelRenderer.domElement);

const hemi = new THREE.HemisphereLight(0xffe6c4, 0x3a2a22, 0.42);
const sunLight = new THREE.DirectionalLight(0xffd7a0, 2.1);
sunLight.position.set(86, 34, 48);
scene.add(hemi, sunLight);

const sun = new THREE.Mesh(
  new THREE.SphereGeometry(10, 24, 16),
  new THREE.MeshBasicMaterial({ color: 0xffe4b0 }),
);
sun.position.copy(sunLight.position).multiplyScalar(1.15);
scene.add(sun);
const lamp = new THREE.PointLight(0xffc078, 0, 16, 1.8);
scene.add(lamp);

const clouds = makeClouds();
scene.add(clouds);

hydrateMods();
const save = loadSave();
applySavedMods(save?.mods);
const waterView = new WaterView(scene);
const world = new World(scene, waterView);
const particles = new Particles(scene);
applyLights(renderer, sunLight, world.meshes(), { ...gfx, light: 'simple', water: 'cube' });
const atmosphere = new Atmosphere(renderer, scene, camera);
let lastIndoor = null;
applyMood(false);

let notes = (save?.notes || buildStarterNotes()).map(normalizeNote);
let worldReady = false;
let worldBoot = null;

const player = new Player(SPAWN);
if (save?.player && !stuck(save.player)) player.place(save.player);

const inventory = createInventory(document.querySelector('#inventory'), {
  iconFor,
  noteName: (noteId) => {
    const note = notes.find((item) => item.id === noteId);
    return note?.title || note?.cue || '';
  },
  hudBar: hotbarEl,
  hudName: hotbarNameEl,
  onChange: () => saveSoon(),
  onClose: () => closeBag(),
  onToast: (message) => toast(message),
  onDiscard: (noteId) => {
    notes = notes.filter((item) => item.id !== noteId);
    if (routeId === noteId) routeId = null;
  },
});
inventory.load(save);

let routeId = save?.routeId || null;
let started = false;
let leaveSettled = false;
let appUnlock = false;
let ignoreEscUntil = 0;
let aimed = null;
let leftDown = false;
let rightDown = false;
let leftCool = 0;
let rightCool = 0;
let shelfOpenedThisHold = false;
let saveTimer = 0;
let allowSave = true;

const outline = new THREE.LineSegments(
  new THREE.EdgesGeometry(new THREE.BoxGeometry(1.01, 1.01, 1.01)),
  new THREE.LineBasicMaterial({ color: 0xffffff }),
);
outline.visible = false;
scene.add(outline);

const ghost = new THREE.Mesh(
  new THREE.BoxGeometry(1, 1, 1),
  new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.32, depthWrite: false }),
);
ghost.visible = false;
scene.add(ghost);

const labelPool = Array.from({ length: 8 }, () => {
  const div = document.createElement('div');
  div.className = 'nametag';
  div.innerHTML = '<b></b><span></span>';
  const obj = new CSS2DObject(div);
  obj.visible = false;
  scene.add(obj);
  return { div, obj };
});

const editor = createEditor(document.querySelector('#editor'), {
  onChange: () => saveSoon(),
  onClose: closeEditor,
  onDetach: detachOpenNote,
  onExportWord: exportWord,
  onToast: toast,
  async onPublish(note) {
    const existed = Boolean(loadWallets());
    const published = await publishPublicNote(note, snapshot());
    if (!existed) syncAccountBanner();
    return published;
  },
  onSaveDrop: saveWriteDrop,
  onSaveBag: saveWriteBag,
});

function syncAccountBanner() {
  const pending = accountNeedsExport();
  const show = pending || started;
  document.body.classList.toggle('account-pending', pending);
  const banner = document.querySelector('#account-banner');
  banner.classList.toggle('hidden', !show);
  banner.classList.toggle('compact', show && !pending);
  banner.querySelector('p').classList.toggle('hidden', !pending);
  document.querySelector('#account-export').classList.toggle('hidden', !pending);
}

const backup = createBackup(document.querySelector('#backup'), {
  snapshot,
  download,
  onImport: restoreAndEnter,
  onClose: closeBackup,
  onAccount: syncAccountBanner,
});

const docs = createDocs(docsEl, {
  localNotes: () => sortNotes(notes),
  onOpenLocal(note) {
    const pos = parseShelf(note.shelf);
    docs.close();
    if (pos) openShelf(pos.x, pos.y, pos.z);
  },
  onClose: closeDocs,
});

const community = createCommunity(communityEl, {
  world: () => world,
  spawn: () => ({ x: player.x, y: player.y, z: player.z, yaw: player.yaw, pitch: player.pitch }),
  download,
  onToast: toast,
  onClose: closeCommunity,
  onFurnitureInstalled(result) {
    inventory.refresh();
    toast(result.already ? '官方家居已经在背包里' : `已经装上「${result.name}」`);
  },
  onApplyPalace: applyPalacePreset,
  onGoto: gotoDrop,
});

resize();
window.addEventListener('resize', resize);
window.addEventListener('beforeunload', persist);

syncAccountBanner();
export async function startFromIntro() {
  await ensureWorld(introEl);
  sfx.unlock();
  introEl.classList.add('hidden');
  hud.classList.remove('hidden');
  started = true;
  if (pendingLook && !stuck(pendingLook)) player.place(pendingLook);
  pendingLook = null;
  syncAccountBanner();
  lock();
  syncPause();
}
document.querySelector('#top-upload').addEventListener('click', async () => {
  const message = await backup.upload();
  if (message) toast(message, 12000);
});
document.querySelector('#leave-skip').addEventListener('click', dismissLeave);
document.querySelector('#leave-upload').addEventListener('click', async () => {
  const status = document.querySelector('#leave [data-status]');
  const meter = document.querySelector('#leave .meter');
  const fill = document.querySelector('#leave .meter-fill');
  meter.hidden = false;
  fill.classList.add('indeterminate');
  status.textContent = '正在上传';
  const message = await backup.upload((label) => {
    status.textContent = label;
  });
  meter.hidden = true;
  if (!message) return;
  leaveSettled = true;
  leaveEl.classList.add('hidden');
  toast(message, 12000);
  lock();
  if (document.pointerLockElement !== renderer.domElement) syncPause();
});
document.querySelector('#resume').addEventListener('click', () => {
  pauseEl.classList.add('hidden');
  appUnlock = false;
  lock();
  syncPause();
});
document.querySelector('#pause-bag').addEventListener('click', openBag);
document.querySelector('#pause-storage').addEventListener('click', openBackup);
document.querySelector('#pause-docs').addEventListener('click', openDocs);
document.querySelector('#pause-community').addEventListener('click', openCommunity);
document.querySelector('#pause-graphics').addEventListener('click', openGraphics);
document.querySelector('#graphics-close').addEventListener('click', closeGraphics);
document.querySelectorAll('#graphics [data-water]').forEach((button) => {
  button.addEventListener('click', async () => {
    gfx = saveGraphics({ water: button.dataset.water });
    paintGraphics();
    if (!started || !worldReady) return;
    await world.rebuildMeshes();
    applyLights(renderer, sunLight, world.meshes(), gfx);
  });
});
document.querySelectorAll('#graphics [data-light]').forEach((button) => {
  button.addEventListener('click', async () => {
    gfx = saveGraphics({ light: button.dataset.light });
    paintGraphics();
    if (!started || !worldReady) return;
    if (gfx.light !== 'simple') installEnvironment(renderer, scene);
    await world.rebuildMeshes();
    applyLights(renderer, sunLight, world.meshes(), gfx);
    applyMood(lastIndoor);
  });
});
document.querySelectorAll('#graphics [data-weather]').forEach((button) => {
  button.addEventListener('click', () => {
    gfx = saveGraphics({ weather: button.dataset.weather });
    paintGraphics();
    if (!started) return;
    applyMood(lastIndoor);
  });
});
document.querySelector('#pause-write').addEventListener('click', openWriteFirst);
document.querySelector('#pause-logout').addEventListener('click', logout);
document.querySelector('#pause-help').addEventListener('click', openHelp);
document.querySelector('#help-close').addEventListener('click', () => {
  helpEl.classList.add('hidden');
  if (started) lock();
});
function bindHold(button, press, release) {
  const down = (event) => {
    event.preventDefault();
    button.setPointerCapture?.(event.pointerId);
    press();
  };
  const up = () => release();
  button.addEventListener('pointerdown', down);
  button.addEventListener('pointerup', up);
  button.addEventListener('pointercancel', up);
  button.addEventListener('lostpointercapture', up);
}

document.querySelectorAll('#touch-pad [data-move]').forEach((button) => {
  const key = button.dataset.move;
  bindHold(button, () => { input[key] = true; }, () => { input[key] = false; });
});
bindHold(document.querySelector('#touch-pad [data-act="jump"]'), () => { input.jump = true; }, () => { input.jump = false; });
bindHold(document.querySelector('#touch-pad [data-act="sneak"]'), () => { input.sneak = true; }, () => { input.sneak = false; });
bindHold(document.querySelector('#touch-pad [data-act="break"]'), () => { leftDown = true; leftCool = 0; }, () => { leftDown = false; });
bindHold(document.querySelector('#touch-pad [data-act="place"]'), () => {
  rightDown = true;
  rightCool = 0;
  shelfOpenedThisHold = false;
}, () => { rightDown = false; });
document.querySelector('#touch-pad [data-act="use"]').addEventListener('pointerdown', (event) => {
  event.preventDefault();
  if (!inPlay() || !aimed) return;
  const host = world.hostType(aimed.x, aimed.y, aimed.z);
  if (isNoteHost(host)) openShelf(aimed.x, aimed.y, aimed.z);
});
document.querySelector('#touch-pad [data-act="bag"]').addEventListener('pointerdown', (event) => {
  event.preventDefault();
  if (inventory.isOpen()) closeBag();
  else openBag();
});
document.querySelector('#touch-pad [data-act="menu"]').addEventListener('pointerdown', (event) => {
  event.preventDefault();
  input.forward = input.back = input.left = input.right = input.jump = input.sneak = false;
  leftDown = false;
  rightDown = false;
  pauseEl.classList.remove('hidden');
  syncPause();
});

let lookId = null;
let lookX = 0;
let lookY = 0;
renderer.domElement.addEventListener('touchstart', (event) => {
  if (!inPlay() || lookId != null) return;
  const tap = event.changedTouches[0];
  if (tap.clientX < window.innerWidth * 0.34) return;
  lookId = tap.identifier;
  lookX = tap.clientX;
  lookY = tap.clientY;
}, { passive: true });
renderer.domElement.addEventListener('touchmove', (event) => {
  if (lookId == null) return;
  const tap = [...event.changedTouches].find((item) => item.identifier === lookId);
  if (!tap) return;
  player.look((tap.clientX - lookX) * 1.7, (tap.clientY - lookY) * 1.7);
  lookX = tap.clientX;
  lookY = tap.clientY;
}, { passive: true });
const endLook = (event) => {
  if ([...event.changedTouches].some((item) => item.identifier === lookId)) lookId = null;
};
renderer.domElement.addEventListener('touchend', endLook);
renderer.domElement.addEventListener('touchcancel', endLook);

hotbarEl.addEventListener('click', (event) => {
  const button = event.target.closest('[data-slot]');
  if (!button) return;
  inventory.select(Number(button.dataset.slot));
  saveSoon();
});

renderer.domElement.addEventListener('contextmenu', (event) => event.preventDefault());
renderer.domElement.addEventListener('mousedown', (event) => {
  if (!started || overlayOpen()) return;
  if (!handheld && document.pointerLockElement !== renderer.domElement) {
    lock();
    return;
  }
  if (event.button === 0) {
    leftDown = true;
    leftCool = 0;
  }
  if (event.button === 2) {
    rightDown = true;
    rightCool = 0;
    shelfOpenedThisHold = false;
  }
});
window.addEventListener('mouseup', (event) => {
  if (event.button === 0) leftDown = false;
  if (event.button === 2) rightDown = false;
});
document.addEventListener('mousemove', (event) => {
  if (document.pointerLockElement !== renderer.domElement) return;
  player.look(event.movementX, event.movementY);
});
document.addEventListener('pointerlockchange', syncPause);
window.addEventListener('wheel', (event) => {
  const locked = document.pointerLockElement === renderer.domElement;
  if (!locked && !inventory.isOpen()) return;
  event.preventDefault();
  const dir = Math.sign(event.deltaY);
  if (!dir) return;
  const current = inventory.toJSON().slot;
  inventory.select((current + dir + 9) % 9);
  saveSoon();
}, { passive: false });

window.addEventListener('keydown', (event) => {
  if (event.isComposing) return;
  if (event.code === 'Escape') {
    if (performance.now() < ignoreEscUntil) return;
    if (!leaveEl.classList.contains('hidden')) {
      dismissLeave();
      return;
    }
    if (editor.isOpen()) {
      event.preventDefault();
      closeEditor();
    } else if (inventory.isOpen()) {
      closeBag();
    } else if (docs.isOpen()) {
      closeDocs();
    } else if (backup.isOpen()) {
      closeBackup();
    } else if (!introEl.classList.contains('hidden')) {
      introEl.classList.add('hidden');
      startEl.classList.remove('hidden');
    } else if (!helpEl.classList.contains('hidden')) {
      helpEl.classList.add('hidden');
      if (started) lock();
    }
    return;
  }
  if (event.code === 'KeyE' && !event.repeat && started && !editor.isOpen() && !backup.isOpen() && !docs.isOpen() && leaveEl.classList.contains('hidden') && helpEl.classList.contains('hidden') && introEl.classList.contains('hidden')) {
    event.preventDefault();
    if (inventory.isOpen()) closeBag();
    else openBag();
    return;
  }
  if (/^Digit[1-9]$/.test(event.code) && started && (inventory.isOpen() || !overlayOpen())) {
    inventory.select(Number(event.code.slice(5)) - 1);
    saveSoon();
    return;
  }
  if (fieldTarget(event)) {
    if ((event.ctrlKey || event.metaKey) && event.code === 'KeyS') event.preventDefault();
    return;
  }
  if (event.code === 'KeyB' && started && !editor.isOpen()) {
    event.preventDefault();
    if (backup.isOpen()) closeBackup();
    else openBackup();
    return;
  }
  if (event.code === 'KeyL' && started && !editor.isOpen()) {
    event.preventDefault();
    if (docs.isOpen()) closeDocs();
    else openDocs();
    return;
  }
  if (overlayOpen()) return;
  if (event.repeat) {
    setMoveFlag(event.code, true);
    return;
  }
  if (event.code === 'KeyF' && started) {
    event.preventDefault();
    const hit = aimed;
    if (hit && isNoteHost(world.hostType(hit.x, hit.y, hit.z))) openShelf(hit.x, hit.y, hit.z);
    else toast('对准书架、书桌、床、衣柜，或桌上摊开的笔记');
    return;
  }
  if (event.code === 'KeyH' && started && !editor.isOpen()) {
    event.preventDefault();
    openHelp();
    return;
  }
  if (event.code === 'Space') event.preventDefault();
  setMoveFlag(event.code, true);
});

window.addEventListener('keyup', (event) => setMoveFlag(event.code, false));

let last = performance.now();
requestAnimationFrame(frame);

function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  const locked = document.pointerLockElement === renderer.domElement;

  if (!started) idleCamera(now);
  else {
    if (inPlay()) player.update(dt, world, input);
    camera.rotation.order = 'YXZ';
    camera.rotation.y = player.yaw;
    camera.rotation.x = player.pitch;
    camera.rotation.z = 0;
    camera.position.set(player.x, player.y + player.eyeHeight(input.sneak), player.z);
  }

  if (started && player.y < -24) {
    player.place(SPAWN);
    toast('你掉出了这座岛，回到了南边的路上');
  }

  if (inPlay()) {
    if (leftDown) {
      leftCool -= dt;
      if (leftCool <= 0) {
        breakAimed();
        leftCool = 0.18;
      }
    }
    if (rightDown) {
      rightCool -= dt;
      if (rightCool <= 0) {
        useAimed();
        rightCool = 0.18;
      }
    }
  }

  updateAim(inPlay());
  updateLabels(inPlay());
  updateHud();
  hud.classList.toggle('writing', editor.isOpen());
  particles.update(dt);
  clouds.position.x = reducedMotion ? 0 : Math.sin(now * 0.00004) * 6;
  const drawGfx = currentGraphics();
  waterView.update(now, drawGfx, camera, sun);
  if (started) {
    flowAcc += dt;
    if (flowAcc > 0.28) {
      flowAcc = 0;
      waterView.tick(world, drawGfx);
    }
  }
  if (waterView.dirty) waterView.rebuild(world, drawGfx);
  const indoor = started && world.isRoofed(player.x, player.y, player.z);
  if (indoor !== lastIndoor) {
    lastIndoor = indoor;
    applyMood(indoor);
  }
  if (indoor) lamp.position.set(player.x, player.y + 1.4, player.z);
  atmosphere.render(now, sun, started && drawGfx.light !== 'simple', dt, camera.position);
  labelRenderer.render(scene, camera);
  requestAnimationFrame(frame);
}

function idleCamera(now) {
  if (reducedMotion) {
    camera.position.set(18, 12, 24);
  } else {
    const angle = now * 0.00012;
    camera.position.set(Math.sin(angle) * 30, 15, Math.cos(angle) * 30);
  }
  camera.lookAt(0, 1.4, 0);
}

function updateAim(locked) {
  if (!started || !locked) {
    outline.visible = false;
    ghost.visible = false;
    if (!locked) aimed = null;
    promptEl.textContent = '';
    return;
  }
  const direction = camera.getWorldDirection(new THREE.Vector3());
  const hit = world.raycast(camera.position, direction, 5.5);
  aimed = hit;
  if (!hit) {
    outline.visible = false;
    ghost.visible = false;
    promptEl.textContent = '';
    return;
  }
  const cover = world.getCover(hit.x, hit.y, hit.z);
  const lift = cover ? surfaceLift(BLOCKS[hit.type]) : 0;
  outline.visible = true;
  outline.position.set(hit.x + 0.5, hit.y + 0.5 + lift, hit.z + 0.5);
  const shown = cover || hit.type;
  const host = cover && isNoteHost(cover) ? cover : hit.type;
  const openShelfInstead = isNoteHost(host) && !input.sneak;
  promptEl.textContent = openShelfInstead
    ? (handheld ? `开　打开${BLOCKS[host].name}` : `F 或右键　打开${BLOCKS[host].name}`)
    : (handheld ? `${BLOCKS[shown].name}　拆　放` : `${BLOCKS[shown].name}　左键拆除　右键放置`);
  if (isNoteHost(host) && input.sneak) promptEl.textContent = handheld ? '潜行中　放会贴在表面上' : '潜行中　右键会把方块贴在表面上';
  if (openShelfInstead) {
    ghost.visible = false;
    return;
  }
  const held = inventory.selectedType();
  if (!held) {
    ghost.visible = false;
    promptEl.textContent = handheld ? '手里是空的　开背包把方块拖进物品栏' : '手里是空的　按 E 把方块拖进物品栏';
    return;
  }
  const spot = placeSpot(hit, held);
  if (!spot || !canPlaceOn(BLOCKS[held], BLOCKS[hit.type], hit.nx, hit.ny, hit.nz)) {
    ghost.visible = false;
    return;
  }
  ghost.visible = true;
  ghost.position.set(spot.x + 0.5, spot.y + 0.5 + (spot.cover ? surfaceLift(BLOCKS[hit.type]) : 0), spot.z + 0.5);
  ghost.material.color.set(BLOCKS[held].color);
}

function breakAimed() {
  if (!aimed || !BLOCKS[aimed.type]?.breakable) return;
  const { x, y, z } = aimed;
  const cover = world.getCover(x, y, z);
  if (cover) {
    const note = isNoteHost(cover) ? notes.find((item) => item.shelf === shelfKey(x, y, z)) : null;
    const noteId = note && !isEmptyNote(note) ? note.id : null;
    if (!inventory.collect(cover, noteId)) {
      toast('背包满了，这块先留在原地');
      return;
    }
    if (note) {
      if (noteId) {
        note.shelf = null;
        toast(`《${note.title || note.cue || '未命名笔记'}》进了背包`);
      } else notes = notes.filter((item) => item !== note);
    }
    world.setCover(x, y, z, null);
    particles.burst(x, y, z, BLOCKS[cover].color);
    sfx.break();
    saveSoon();
    return;
  }
  const type = aimed.type;
  const note = isNoteHost(type) ? notes.find((item) => item.shelf === shelfKey(x, y, z)) : null;
  const noteId = note && !isEmptyNote(note) ? note.id : null;
  if (!inventory.collect(type, noteId)) {
    toast('背包满了，这块先留在原地');
    return;
  }
  if (note) {
    if (noteId) {
      note.shelf = null;
      toast(`《${note.title || note.cue || '未命名笔记'}》进了背包`);
    } else {
      notes = notes.filter((item) => item !== note);
      if (routeId === note.id) routeId = null;
    }
  }
  world.setBlock(x, y, z, null);
  particles.burst(x, y, z, BLOCKS[type].color);
  sfx.break();
  saveSoon();
}

function useAimed() {
  if (!aimed) return;
  const host = world.hostType(aimed.x, aimed.y, aimed.z);
  if (isNoteHost(host) && !input.sneak) {
    if (!shelfOpenedThisHold) {
      shelfOpenedThisHold = true;
      openShelf(aimed.x, aimed.y, aimed.z);
    }
    return;
  }
  const held = inventory.selectedType();
  const spot = placeSpot(aimed, held);
  if (!held || !spot || !canPlaceOn(BLOCKS[held], BLOCKS[aimed.type], aimed.nx, aimed.ny, aimed.nz)) return;
  const ok = spot.cover
    ? world.setCover(spot.x, spot.y, spot.z, held)
    : world.setBlock(
      spot.x,
      spot.y,
      spot.z,
      held,
      held === 'water' ? 'player' : 'world',
      BLOCKS[held]?.shape === 'stairs' ? facingFromYaw(player.yaw) : null,
    );
  if (!ok) {
    toast('这种方块已经放得太多了');
    return;
  }
  const spent = inventory.consumeSelected();
  if (spent?.noteId) bindShelfNote(spent.noteId, spot.x, spot.y, spot.z);
  sfx.place();
  saveSoon();
}

function placeSpot(hit, held) {
  if (!hit || !held) return null;
  const spec = BLOCKS[held];
  if (sitsOnFurniture(spec) && hit.ny === 1 && BLOCKS[hit.type]?.furnish && !world.getCover(hit.x, hit.y, hit.z)) {
    return { x: hit.x, y: hit.y, z: hit.z, cover: true };
  }
  const x = hit.x + hit.nx;
  const y = hit.y + hit.ny;
  const z = hit.z + hit.nz;
  if (!canPlace(x, y, z, held)) return null;
  return { x, y, z, cover: false };
}

function canPlace(x, y, z, held) {
  if (x < BUILD_MIN || x > BUILD_MAX || z < BUILD_MIN || z > BUILD_MAX || y < Y_MIN || y > Y_MAX) return false;
  if (world.get(x, y, z)) return false;
  if (BLOCKS[held]?.solid !== false && blockHitsPlayer(x, y, z, player.x, player.y, player.z)) return false;
  return true;
}

function openShelf(x, y, z) {
  const key = shelfKey(x, y, z);
  let note = notes.find((item) => item.shelf === key);
  if (!note) {
    note = createNote(key);
    notes.push(note);
  }
  sfx.open();
  unlockForUi();
  pauseEl.classList.add('hidden');
  editor.open(note, `${regionName(x, z)} · ${x}, ${y}, ${z}`);
}

function closeEditor() {
  if (!editor.isOpen()) return;
  const mode = editor.mode();
  const note = editor.close();
  dropOnClose = false;
  if (mode === 'drop' || mode === 'compose') {
    if (started) lock();
    return;
  }
  if (isEmptyNote(note)) notes = notes.filter((item) => item.id !== note.id);
  saveSoon();
  if (started) lock();
}

function keepDraft(note) {
  if (!notes.some((item) => item.id === note.id)) notes.push(note);
}

function saveWriteDrop() {
  if (!editor.isOpen()) return;
  const note = editor.close();
  dropOnClose = false;
  if (isEmptyNote(note)) {
    toast('空的笔记没有保存');
    if (started) lock();
    return;
  }
  keepDraft(note);
  const cell = dropNoteInRoom(world, notes, note);
  if (!cell) toast('头顶没有遮挡，不能投放。先进入一座有屋顶的宫殿。');
  else toast(`已经放到 ${cell.x}, ${cell.y}, ${cell.z}，进去后自己整理`);
  community.refresh();
  saveSoon();
  if (started) lock();
}

function saveWriteBag() {
  if (!editor.isOpen()) return;
  const note = editor.close();
  dropOnClose = false;
  if (isEmptyNote(note)) {
    toast('空的笔记没有保存');
    if (started) lock();
    return;
  }
  keepDraft(note);
  note.shelf = null;
  if (!inventory.collect('open_notebook', note.id)) {
    toast('背包满了，这篇还在文稿里，没有收进去');
    editor.open(note, '背包满了', 'compose');
    return;
  }
  toast(`《${note.title || note.cue || '未命名笔记'}》进了背包`);
  saveSoon();
  if (started) lock();
}

function detachOpenNote(note) {
  const pos = parseShelf(note.shelf);
  const noteId = isEmptyNote(note) ? null : note.id;
  const cover = pos ? world.getCover(pos.x, pos.y, pos.z) : null;
  const block = pos ? world.get(pos.x, pos.y, pos.z) : null;
  const host = isNoteHost(cover) ? cover : isNoteHost(block) ? block : 'open_notebook';
  if (!inventory.collect(host, noteId)) {
    toast('背包满了，这一格还在原地');
    return;
  }
  if (noteId) {
    note.shelf = null;
    toast(`《${note.title || note.cue || '未命名笔记'}》进了背包`);
  } else {
    notes = notes.filter((item) => item.id !== note.id);
    if (routeId === note.id) routeId = null;
  }
  if (pos && isNoteHost(cover)) world.setCover(pos.x, pos.y, pos.z, null);
  else if (pos && isNoteHost(block)) world.setBlock(pos.x, pos.y, pos.z, null);
  editor.close();
  saveSoon();
  lock();
}

function bindShelfNote(noteId, x, y, z) {
  const note = notes.find((item) => item.id === noteId);
  if (!note) return;
  const key = shelfKey(x, y, z);
  notes = notes.filter((item) => item.id === note.id || item.shelf !== key);
  note.shelf = key;
  note.updated = Date.now();
}

function settleCarriedNotes() {
  for (const note of notes) {
    if (!note.shelf) continue;
    if (inventory.hasNote(note.id)) inventory.clearNote(note.id);
  }
  for (const note of [...notes]) {
    if (note.shelf || inventory.hasNote(note.id)) continue;
    if (isEmptyNote(note)) {
      notes = notes.filter((item) => item.id !== note.id);
      continue;
    }
    if (!inventory.collect('bookshelf', note.id)) toast('背包满了，有一本笔记还没能放进去');
  }
}

function updateLabels(locked) {
  const found = [];
  if (started && locked) {
    for (const key of world.shelves) {
      const note = notes.find((item) => item.shelf === key && !isEmptyNote(item));
      if (!note) continue;
      const pos = parseShelf(key);
      const dx = pos.x + 0.5 - camera.position.x;
      const dy = pos.y + 0.8 - camera.position.y;
      const dz = pos.z + 0.5 - camera.position.z;
      const dist = Math.hypot(dx, dy, dz);
      if (dist > 12) continue;
      const hit = world.raycast(camera.position, new THREE.Vector3(dx, dy, dz), dist);
      if (hit && (hit.x !== pos.x || hit.y !== pos.y || hit.z !== pos.z)) continue;
      found.push({ note, pos, dist });
    }
    found.sort((a, b) => a.dist - b.dist);
  }
  labelPool.forEach((label, index) => {
    const item = found[index];
    if (!item) {
      label.obj.visible = false;
      return;
    }
    label.obj.visible = true;
    label.obj.position.set(item.pos.x + 0.5, item.pos.y + 1.45, item.pos.z + 0.5);
    label.div.querySelector('b').textContent = item.note.cue || '书架';
    label.div.querySelector('span').textContent = item.note.title || '';
  });
}

function updateHud() {
  const forward = camera.getWorldDirection(new THREE.Vector3());
  let angle = Math.atan2(forward.x, -forward.z) * 180 / Math.PI;
  if (angle < 0) angle += 360;
  compassEl.textContent = dirs[Math.round(angle / 45) % 8];
  const subject = started ? player : { x: camera.position.x, y: camera.position.y, z: camera.position.z };
  coordsEl.textContent = `x ${subject.x.toFixed(1)}   y ${subject.y.toFixed(1)}   z ${subject.z.toFixed(1)}`;
}

function snapshot() {
  const diff = world.toDiff();
  const carried = inventory.toJSON();
  return {
    version: 1,
    removed: diff.removed,
    placed: diff.placed,
    covers: diff.covers,
    notes,
    player: { x: player.x, y: player.y, z: player.z, yaw: player.yaw, pitch: player.pitch },
    routeId,
    slot: carried.slot,
    hotbar: carried.hotbar,
    backpack: carried.backpack,
  };
}

function saveSoon() {
  window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(persist, 350);
}

function persist() {
  if (!allowSave || !worldReady) return;
  try {
    writeSave(snapshot());
  } catch {
    toast('这台浏览器里快存不下了');
  }
}

function exportWord(note) {
  const name = (note.title || '笔记').replace(/[\\/:*?"<>|]/g, '').slice(0, 40) || '笔记';
  const heading = escapeText(note.title || '未命名');
  const cue = note.cue ? `<p><b>线索：</b>${escapeText(note.cue)}</p>` : '';
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${heading}</title></head><body><h1>${heading}</h1>${cue}${note.html || ''}</body></html>`;
  download(`\ufeff${html}`, `${name}.doc`, 'application/msword');
}

function download(content, filename, type) {
  const blob = content instanceof Blob ? content : new Blob([content], { type });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

function escapeText(value) {
  return String(value).replace(/[&<>]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[ch]));
}

function toast(message, stay = 3200) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = message;
  toastBox.append(el);
  while (toastBox.children.length > 3) toastBox.firstChild.remove();
  window.setTimeout(() => el.remove(), stay);
}

function inPlay() {
  if (!started || overlayOpen() || !pauseEl.classList.contains('hidden')) return false;
  return handheld || document.pointerLockElement === renderer.domElement;
}

function paintMeter(root, ratio, label) {
  const meter = root?.querySelector('.meter');
  const fill = root?.querySelector('.meter-fill');
  const status = root?.querySelector('[data-status]');
  if (!meter || !fill) return;
  meter.hidden = false;
  fill.classList.remove('indeterminate');
  fill.style.width = `${Math.max(8, Math.round(ratio * 100))}%`;
  if (status) status.textContent = label || t('localPreparing');
}

function hideMeter(root) {
  const meter = root?.querySelector('.meter');
  const fill = root?.querySelector('.meter-fill');
  const status = root?.querySelector('[data-status]');
  if (meter) meter.hidden = true;
  if (fill) {
    fill.classList.remove('indeterminate');
    fill.style.width = '0';
  }
  if (status) status.textContent = '';
}

async function ensureWorld(progressRoot) {
  if (worldReady) return;
  if (worldBoot) return worldBoot;
  const root = progressRoot || introEl;
  worldBoot = (async () => {
    const paint = (ratio) => paintMeter(root, ratio, t('localPreparing'));
    paint(0.06);
    await new Promise((resolve) => requestAnimationFrame(resolve));
    loadTextures();
    inventory.refresh();
    paint(0.14);
    await new Promise((resolve) => requestAnimationFrame(resolve));
    world.init(save);
    beginGraphics();
    gfx = loadGraphics();
    paint(0.22);
    await new Promise((resolve) => requestAnimationFrame(resolve));
    if (gfx.light !== 'simple') installEnvironment(renderer, scene);
    await world.rebuildMeshes((ratio) => paint(0.22 + ratio * 0.7));
    applyLights(renderer, sunLight, world.meshes(), gfx);
    for (const note of notes) {
      const pos = parseShelf(note.shelf);
      if (!pos || !isNoteHost(world.hostType(pos.x, pos.y, pos.z))) note.shelf = null;
    }
    settleCarriedNotes();
    lastIndoor = null;
    applyMood(world.isRoofed(player.x, player.y, player.z));
    worldReady = true;
    paint(1);
    hideMeter(root);
  })();
  try {
    await worldBoot;
  } catch (error) {
    worldBoot = null;
    hideMeter(root);
    throw error;
  }
}

function lock() {
  if (!started || overlayOpen() || handheld) return;
  try {
    renderer.domElement.requestPointerLock()?.catch(() => {});
  } catch {
    /* 没有可靠的用户手势时，浏览器会拒绝锁定鼠标 */
  }
}

function surfaceBlocked() {
  return editor.isOpen() || inventory.isOpen() || backup.isOpen() || docs.isOpen() || community.isOpen() || !helpEl.classList.contains('hidden') || !startEl.classList.contains('hidden') || !introEl.classList.contains('hidden') || !graphicsEl.classList.contains('hidden');
}

function overlayOpen() {
  return surfaceBlocked() || !leaveEl.classList.contains('hidden');
}

function unlockForUi() {
  appUnlock = true;
  leaveSettled = true;
  leaveEl.classList.add('hidden');
  document.exitPointerLock();
}

function dismissLeave() {
  leaveSettled = true;
  leaveEl.classList.add('hidden');
  syncPause();
}

function syncPause() {
  const locked = document.pointerLockElement === renderer.domElement;
  if (!locked && !handheld) {
    leftDown = false;
    rightDown = false;
  } else if (locked) {
    leaveSettled = false;
    appUnlock = false;
    leaveEl.classList.add('hidden');
  }
  document.body.classList.toggle('locked', locked);
  const free = started && !locked && !handheld && !surfaceBlocked();
  const ask = free && !leaveSettled && !appUnlock;
  if (ask) ignoreEscUntil = performance.now() + 500;
  leaveEl.classList.toggle('hidden', !ask);
  if (!handheld) pauseEl.classList.toggle('hidden', !(free && !ask));
  document.querySelector('#crosshair').classList.toggle('hidden', handheld || !locked);
  document.querySelector('#touch-pad').classList.toggle('hidden', !(handheld && inPlay()));
  syncAccountBanner();
}

function openHelp() {
  if (!started || editor.isOpen()) return;
  helpEl.classList.remove('hidden');
  pauseEl.classList.add('hidden');
  unlockForUi();
}

function openBag() {
  if (!started || editor.isOpen() || backup.isOpen() || docs.isOpen() || !helpEl.classList.contains('hidden') || !introEl.classList.contains('hidden')) return;
  inventory.open();
  unlockForUi();
  pauseEl.classList.add('hidden');
}

function closeBag() {
  inventory.close();
  if (started) lock();
}

function restoreAndEnter(bundle) {
  allowSave = false;
  sessionStorage.setItem('memory-palace-enter', '1');
  writeSave(bundleToSave(bundle));
  location.reload();
}

function openDocs() {
  if (!started || editor.isOpen()) return;
  unlockForUi();
  pauseEl.classList.add('hidden');
  backup.close();
  docs.open();
}

function closeDocs() {
  docs.close();
  if (started) lock();
}

function openBackup() {
  if (!started || editor.isOpen()) return;
  unlockForUi();
  pauseEl.classList.add('hidden');
  docs.close();
  backup.open();
}

function applyMood(indoor) {
  lamp.intensity = started && gfx.light !== 'simple' && indoor ? 0.55 : 0;
  if (!started || gfx.light === 'simple') {
    scene.environmentIntensity = 0;
    scene.background = new THREE.Color(0x8ec8ef);
    scene.fog = new THREE.Fog(0x8ec8ef, 52, 168);
    hemi.color.set(0xffe6c4);
    hemi.groundColor.set(0x3a2a22);
    hemi.intensity = 0.95;
    sunLight.color.set(0xfff2d8);
    sunLight.intensity = 1.32;
    sun.visible = true;
    atmosphere.setWeather({ rain: 0, flakes: 0, bloom: 0.2, shafts: 0, sunColor: 0xfff2d8 }, false);
    return;
  }
  setClimate(gfx.weather, { scene, hemi, sunLight, sun, atmosphere }, Boolean(indoor));
}

function paintGraphics() {
  document.querySelectorAll('#graphics [data-water]').forEach((button) => {
    button.classList.toggle('on', button.dataset.water === gfx.water);
  });
  document.querySelectorAll('[data-light]').forEach((button) => {
    button.classList.toggle('on', button.dataset.light === gfx.light);
  });
  document.querySelectorAll('#graphics [data-weather]').forEach((button) => {
    button.classList.toggle('on', button.dataset.weather === gfx.weather);
  });
}

paintGraphics();

function openGraphics() {
  if (editor.isOpen()) return;
  paintGraphics();
  graphicsEl.classList.remove('hidden');
  pauseEl.classList.add('hidden');
  if (started) unlockForUi();
}

function closeGraphics() {
  graphicsEl.classList.add('hidden');
  if (started) lock();
}

function openCommunity() {
  if (editor.isOpen()) return;
  community.open();
  pauseEl.classList.add('hidden');
  if (started) unlockForUi();
}

function closeCommunity() {
  community.close();
  if (started) lock();
}

export async function openWriteFirst() {
  if (editor.isOpen()) return;
  if (!worldReady) {
    try {
      await ensureWorld(startEl.classList.contains('hidden') ? introEl : startEl);
    } catch {
      toast('宫殿没有加载起来');
      return;
    }
  }
  community.close();
  dropOnClose = true;
  const note = createNote(null);
  pauseEl.classList.add('hidden');
  if (started) unlockForUi();
  const mode = started ? 'compose' : 'drop';
  const loc = started
    ? '写完后可以收进背包，或随机放到有屋顶的房间'
    : '点保存后随机放到有屋顶的房间，不进背包';
  editor.open(note, loc, mode);
}

function logout() {
  clearWallets();
  sessionStorage.removeItem('memory-palace-enter');
  location.reload();
}

async function applyPalacePreset(preset) {
  if (!worldReady) {
    try {
      await ensureWorld(startEl.classList.contains('hidden') ? introEl : startEl);
    } catch {
      toast('宫殿没有加载起来');
      return;
    }
  }
  world.init(preset.world || { removed: [], placed: [] });
  await world.rebuildMeshes();
  applyLights(renderer, sunLight, world.meshes(), gfx);
  if (preset.spawn) player.place(preset.spawn);
  lastIndoor = null;
  applyMood(world.isRoofed(player.x, player.y, player.z));
  for (const note of notes) {
    const pos = parseShelf(note.shelf);
    if (!pos || !isNoteHost(world.hostType(pos.x, pos.y, pos.z))) note.shelf = null;
  }
  settleCarriedNotes();
  saveSoon();
  community.close();
  toast(`已经铺好「${preset.name || '这座宫殿'}」`);
  if (started) lock();
  else {
    startEl.classList.add('hidden');
    introEl.classList.remove('hidden');
  }
}

function gotoDrop(x, y, z) {
  const look = { x: x + 0.5, y, z: z + 0.5, yaw: player.yaw, pitch: -0.12 };
  community.close();
  if (started) {
    if (!stuck(look)) player.place(look);
    lock();
    return;
  }
  pendingLook = look;
  toast('走进去之后会站到这条笔记旁边');
}

function closeBackup() {
  backup.close();
  if (started) lock();
}

function fieldTarget(event) {
  const el = event.target;
  return el && (el.isContentEditable || el.tagName === 'INPUT' || el.tagName === 'TEXTAREA');
}

function setMoveFlag(code, down) {
  if (code === 'KeyW') input.forward = down;
  if (code === 'KeyS') input.back = down;
  if (code === 'KeyA') input.left = down;
  if (code === 'KeyD') input.right = down;
  if (code === 'Space') input.jump = down;
  if (code === 'ShiftLeft' || code === 'ShiftRight') input.sneak = down;
}

function stuck(pos) {
  const x = Math.floor(pos.x);
  const z = Math.floor(pos.z);
  const y = Math.floor(pos.y);
  return world.isSolid(x, y, z) || world.isSolid(x, y + 1, z);
}

function resize() {
  markDevice();
  const width = window.innerWidth;
  const height = window.innerHeight;
  camera.aspect = width / Math.max(1, height);
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
  labelRenderer.setSize(width, height);
  atmosphere.resize(width, height);
}

function makeClouds() {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 32;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  [[2, 12, 16, 10], [14, 8, 22, 14], [32, 12, 18, 10], [46, 9, 14, 12]].forEach(([x, y, w, h]) => {
    ctx.fillRect(x, y, w, h);
  });
  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  tex.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 0.88 });
  const group = new THREE.Group();
  [[-18, 42, -12], [16, 46, 10], [-6, 40, -30], [28, 44, -18]].forEach(([x, y, z]) => {
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(22, 9), material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x, y, z);
    group.add(mesh);
  });
  return group;
}
