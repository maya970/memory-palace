import * as THREE from 'three';
import { CSS2DObject, CSS2DRenderer } from 'three/addons/renderers/CSS2DRenderer.js';
import { BLOCKS } from './blocks.js';
import { createInventory } from './inventory.js';
import { iconFor, loadTextures } from './textures.js';
import { SPAWN } from './palace.js';
import { World, Particles } from './world.js';
import { Player, blockHitsPlayer } from './player.js';
import { hasSave, loadSave, writeSave } from './storage.js';
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
import { createDocs } from './docs.js';
import { createGate } from './gate.js';
import { bundleToSave } from './bundle.js';
import { accountNeedsExport, markAccountExported, walletFile } from './wallets.js';

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
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

const input = {
  forward: false,
  back: false,
  left: false,
  right: false,
  jump: false,
  sneak: false,
};

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x8ec8ef);
scene.fog = new THREE.Fog(0x8ec8ef, 52, 168);

const camera = new THREE.PerspectiveCamera(72, 1, 0.08, 400);
camera.rotation.order = 'YXZ';

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
view.appendChild(renderer.domElement);

const labelRenderer = new CSS2DRenderer();
labelRenderer.domElement.style.position = 'absolute';
labelRenderer.domElement.style.inset = '0';
labelRenderer.domElement.style.pointerEvents = 'none';
labelRenderer.domElement.style.zIndex = '1';
view.appendChild(labelRenderer.domElement);

const hemi = new THREE.HemisphereLight(0xd9eeff, 0x7d6848, 0.95);
const sunLight = new THREE.DirectionalLight(0xfff5e0, 1.32);
sunLight.position.set(42, 72, 26);
scene.add(hemi, sunLight);

const sun = new THREE.Mesh(
  new THREE.SphereGeometry(7, 20, 12),
  new THREE.MeshBasicMaterial({ color: 0xfff4cf }),
);
sun.position.set(78, 86, 46);
scene.add(sun);

const clouds = makeClouds();
scene.add(clouds);

loadTextures();
const world = new World(scene);
const particles = new Particles(scene);
const save = loadSave();
world.init(save);

let notes = (save?.notes || buildStarterNotes()).map(normalizeNote);
for (const note of notes) {
  const pos = parseShelf(note.shelf);
  if (!pos || world.get(pos.x, pos.y, pos.z) !== 'bookshelf') note.shelf = null;
}

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
settleCarriedNotes();

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

const gate = createGate(startEl, {
  autoEnter: sessionStorage.getItem('memory-palace-enter') === '1',
  hasLocal: () => hasSave(),
  onRestore: restoreAndEnter,
  onAccount: syncAccountBanner,
  onIntro() {
    sessionStorage.removeItem('memory-palace-enter');
    introEl.classList.remove('hidden');
  },
});

resize();
window.addEventListener('resize', resize);
window.addEventListener('beforeunload', persist);

document.querySelector('#account-export').addEventListener('click', () => {
  const file = walletFile();
  if (!file) return;
  download(file, '宫殿账户.json', 'application/json');
  markAccountExported();
  syncAccountBanner();
  backup.refresh();
});
syncAccountBanner();
document.querySelector('#intro-go').addEventListener('click', () => {
  sfx.unlock();
  introEl.classList.add('hidden');
  hud.classList.remove('hidden');
  started = true;
  syncAccountBanner();
  lock();
});
document.querySelector('#top-upload').addEventListener('click', () => backup.upload());
document.querySelector('#leave-skip').addEventListener('click', dismissLeave);
document.querySelector('#leave-upload').addEventListener('click', async () => {
  const status = document.querySelector('#leave [data-status]');
  const meter = document.querySelector('#leave .meter');
  const fill = document.querySelector('#leave .meter-fill');
  meter.hidden = false;
  fill.classList.add('indeterminate');
  status.textContent = '正在上传';
  await backup.upload((label) => {
    status.textContent = label;
  });
  meter.hidden = true;
});
document.querySelector('#resume').addEventListener('click', () => lock());
document.querySelector('#pause-bag').addEventListener('click', openBag);
document.querySelector('#pause-storage').addEventListener('click', openBackup);
document.querySelector('#pause-docs').addEventListener('click', openDocs);
document.querySelector('#btn-help').addEventListener('click', () => {
  helpEl.classList.remove('hidden');
  unlockForUi();
});
document.querySelector('#help-close').addEventListener('click', () => {
  helpEl.classList.add('hidden');
  if (started) lock();
});
hotbarEl.addEventListener('click', (event) => {
  const button = event.target.closest('[data-slot]');
  if (!button) return;
  inventory.select(Number(button.dataset.slot));
  saveSoon();
});

renderer.domElement.addEventListener('contextmenu', (event) => event.preventDefault());
renderer.domElement.addEventListener('mousedown', (event) => {
  if (!started || overlayOpen()) return;
  if (document.pointerLockElement !== renderer.domElement) {
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
    if (hit?.type === 'bookshelf') openShelf(hit.x, hit.y, hit.z);
    else toast('先把准星对准一格书架');
    return;
  }
  if (event.code === 'KeyH') {
    helpEl.classList.remove('hidden');
    unlockForUi();
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
    if (locked) player.update(dt, world, input);
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

  if (started && locked) {
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

  updateAim(locked);
  updateLabels(locked);
  updateHud();
  hud.classList.toggle('writing', editor.isOpen());
  particles.update(dt);
  clouds.position.x = reducedMotion ? 0 : Math.sin(now * 0.00004) * 6;
  renderer.render(scene, camera);
  labelRenderer.render(scene, camera);
  gate.markReady();
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
  outline.visible = true;
  outline.position.set(hit.x + 0.5, hit.y + 0.5, hit.z + 0.5);
  const openShelfInstead = hit.type === 'bookshelf' && !input.sneak;
  promptEl.textContent = openShelfInstead
    ? 'F 或右键　打开这格书架'
    : `${BLOCKS[hit.type].name}　左键拆除　右键放置`;
  if (hit.type === 'bookshelf' && input.sneak) promptEl.textContent = '潜行中　右键会把方块放在书架上';
  if (openShelfInstead) {
    ghost.visible = false;
    return;
  }
  const held = inventory.selectedType();
  if (!held) {
    ghost.visible = false;
    promptEl.textContent = '手里是空的　按 E 把方块拖进物品栏';
    return;
  }
  const x = hit.x + hit.nx;
  const y = hit.y + hit.ny;
  const z = hit.z + hit.nz;
  if (!canPlace(x, y, z)) {
    ghost.visible = false;
    return;
  }
  ghost.visible = true;
  ghost.position.set(x + 0.5, y + 0.5, z + 0.5);
  ghost.material.color.set(BLOCKS[held].color);
}

function breakAimed() {
  if (!aimed || !BLOCKS[aimed.type]?.breakable) return;
  const { x, y, z, type } = aimed;
  const note = type === 'bookshelf' ? notes.find((item) => item.shelf === shelfKey(x, y, z)) : null;
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
  if (aimed.type === 'bookshelf' && !input.sneak) {
    if (!shelfOpenedThisHold) {
      shelfOpenedThisHold = true;
      openShelf(aimed.x, aimed.y, aimed.z);
    }
    return;
  }
  const x = aimed.x + aimed.nx;
  const y = aimed.y + aimed.ny;
  const z = aimed.z + aimed.nz;
  const held = inventory.selectedType();
  if (!held || !canPlace(x, y, z)) return;
  if (!world.setBlock(x, y, z, held)) {
    toast('这种方块已经放得太多了');
    return;
  }
  const spent = inventory.consumeSelected();
  if (spent?.noteId) bindShelfNote(spent.noteId, x, y, z);
  sfx.place();
  saveSoon();
}

function canPlace(x, y, z) {
  if (x < -64 || x > 64 || z < -64 || z > 64 || y < -2 || y > 32) return false;
  if (world.isSolid(x, y, z)) return false;
  if (blockHitsPlayer(x, y, z, player.x, player.y, player.z)) return false;
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
  const note = editor.close();
  if (isEmptyNote(note)) notes = notes.filter((item) => item.id !== note.id);
  saveSoon();
  lock();
}

function detachOpenNote(note) {
  const pos = parseShelf(note.shelf);
  const noteId = isEmptyNote(note) ? null : note.id;
  if (!inventory.collect('bookshelf', noteId)) {
    toast('背包满了，这格书架还在原地');
    return;
  }
  if (noteId) {
    note.shelf = null;
    toast(`《${note.title || note.cue || '未命名笔记'}》进了背包`);
  } else {
    notes = notes.filter((item) => item.id !== note.id);
    if (routeId === note.id) routeId = null;
  }
  if (pos && world.get(pos.x, pos.y, pos.z) === 'bookshelf') world.setBlock(pos.x, pos.y, pos.z, null);
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
  if (!allowSave) return;
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

function toast(message) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = message;
  toastBox.append(el);
  while (toastBox.children.length > 3) toastBox.firstChild.remove();
  window.setTimeout(() => el.remove(), 3200);
}

function lock() {
  if (!started || overlayOpen()) return;
  try {
    renderer.domElement.requestPointerLock()?.catch(() => {});
  } catch {
    /* 没有可靠的用户手势时，浏览器会拒绝锁定鼠标 */
  }
}

function surfaceBlocked() {
  return editor.isOpen() || inventory.isOpen() || backup.isOpen() || docs.isOpen() || !helpEl.classList.contains('hidden') || !startEl.classList.contains('hidden') || !introEl.classList.contains('hidden');
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
  if (!locked) {
    leftDown = false;
    rightDown = false;
  } else {
    leaveSettled = false;
    appUnlock = false;
    leaveEl.classList.add('hidden');
  }
  document.body.classList.toggle('locked', locked);
  const free = started && !locked && !surfaceBlocked();
  const ask = free && !leaveSettled && !appUnlock;
  if (ask) ignoreEscUntil = performance.now() + 500;
  leaveEl.classList.toggle('hidden', !ask);
  pauseEl.classList.toggle('hidden', !(free && !ask));
  document.querySelector('#crosshair').classList.toggle('hidden', !locked);
  syncAccountBanner();
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
  const width = window.innerWidth;
  const height = window.innerHeight;
  camera.aspect = width / Math.max(1, height);
  camera.updateProjectionMatrix();
  renderer.setSize(width, height);
  labelRenderer.setSize(width, height);
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
