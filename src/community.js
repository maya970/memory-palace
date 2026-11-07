/** 社区模组安装、检索与投放。不改别人的只读展览。 */
import { BLOCKS, TEMPLATES } from './blocks.js';
import { FURNITURE_BLOCKS, setFurnitureShape } from './furniture.js';
import { PALACE_PRESETS } from './presets.js';
import { cacheFurniture } from './textures.js';
import { createNote, isEmptyNote, shelfKey } from './notes.js';

const FURN_KEY = 'memory-palace-community-furniture';
const PALACE_KEY = 'memory-palace-community-palaces';
const DROP_KEY = 'memory-palace-note-drops';
const PLACE_KEY = 'memory-palace-place-history';
const MAX_PLACED = 40000;

function readJson(key, fallback) {
  try {
    const data = JSON.parse(localStorage.getItem(key) || 'null');
    return data ?? fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

function safeId(value) {
  const id = String(value || '').toLowerCase().replace(/[^a-z0-9_]/g, '_').slice(0, 40);
  return id.startsWith('mod_') ? id : `mod_${id || 'piece'}`;
}

export function officialFurniturePack() {
  return {
    kind: 'memory-palace-mod',
    version: 1,
    part: 'furniture',
    id: 'official-home',
    name: '官方家居',
    official: true,
    author: '记忆宫殿',
    lead: '桌椅床柜、桌布床单、文具和衣服。已经装在背包右侧。',
    blocks: FURNITURE_BLOCKS.map((block) => ({ ...block })),
  };
}

export function catalog() {
  const furniture = readJson(FURN_KEY, []).filter((pack) => pack?.part === 'furniture');
  const palaces = readJson(PALACE_KEY, []).filter((pack) => pack?.part === 'palace');
  return [
    officialFurniturePack(),
    ...PALACE_PRESETS.map((item) => ({
      kind: 'memory-palace-mod',
      version: 1,
      part: 'palace',
      id: item.id,
      name: item.name,
      official: true,
      author: '记忆宫殿',
      lead: item.lead,
      country: item.country,
      credit: item.credit,
      spawn: item.spawn,
      world: item.world,
    })),
    ...palaces,
    ...furniture,
  ];
}

function haystack(item) {
  return `${item.name || ''} ${item.author || ''} ${item.lead || ''} ${item.credit || ''} ${item.country || ''} ${item.id || ''}`.toLowerCase();
}

export function searchCatalog(query, source, part) {
  const q = String(query || '').trim().toLowerCase();
  return catalog().filter((item) => {
    if (source === 'official' && !item.official) return false;
    if (source === 'player' && item.official) return false;
    if (part === 'palace' && item.part !== 'palace') return false;
    if (part === 'furniture' && item.part !== 'furniture') return false;
    if (q && !haystack(item).includes(q)) return false;
    return true;
  });
}

export function installFurnitureBlock(raw) {
  const id = raw.official ? raw.id : safeId(raw.id);
  if (BLOCKS[id] && !id.startsWith('mod_') && raw.official) return id;
  const block = {
    breakable: true,
    group: raw.group || '家具',
    look: raw.look || 'wood',
    color: raw.color || '#b5884a',
    name: String(raw.name || '自制家具').slice(0, 16),
    furnish: raw.furnish,
    noteHost: Boolean(raw.noteHost),
    place: raw.place,
    covers: raw.covers,
    solid: raw.solid,
    id,
  };
  BLOCKS[id] = block;
  if (Array.isArray(raw.parts) && raw.parts.length) setFurnitureShape(id, raw.parts);
  if (!TEMPLATES.includes(id)) TEMPLATES.push(id);
  cacheFurniture(block);
  return id;
}

export function hydrateMods() {
  for (const pack of readJson(FURN_KEY, [])) {
    if (pack?.part !== 'furniture' || !Array.isArray(pack.blocks)) continue;
    for (const block of pack.blocks) installFurnitureBlock(block);
  }
}

function sanitizePlaced(placed) {
  if (!Array.isArray(placed)) throw new Error('这座宫殿没有方块记录');
  if (placed.length > MAX_PLACED) throw new Error('这座宫殿太大了');
  const known = new Set(Object.keys(BLOCKS));
  const next = [];
  for (const row of placed) {
    if (!Array.isArray(row) || row.length < 4) continue;
    const x = Math.round(Number(row[0]));
    const y = Math.round(Number(row[1]));
    const z = Math.round(Number(row[2]));
    const type = String(row[3] || '');
    if (!type || !known.has(type)) continue;
    if (x < -96 || x > 96 || z < -96 || z > 96 || y < -4 || y > 96) continue;
    const face = row[4] === 'n' || row[4] === 's' || row[4] === 'e' || row[4] === 'w' ? row[4] : null;
    next.push(face ? [x, y, z, type, face] : [x, y, z, type]);
  }
  if (!next.length) throw new Error('这份建筑里没有能放进去的方块');
  return next;
}

function storeFurniture(data) {
  if (data.id === 'official-home' || data.official) {
    return { kind: 'furniture', name: data.name || '官方家居', already: true };
  }
  const blocks = (data.blocks || []).slice(0, 48).map((block) => {
    const id = installFurnitureBlock(block);
    return { ...block, id };
  });
  if (!blocks.length) throw new Error('这份家具包是空的');
  const pack = {
    kind: 'memory-palace-mod',
    version: 1,
    part: 'furniture',
    official: false,
    id: safeId(data.id || data.name || 'pack'),
    name: String(data.name || '导入的家具').slice(0, 24),
    author: String(data.author || '玩家').slice(0, 24),
    lead: String(data.lead || '独立导入的家具包').slice(0, 80),
    blocks,
  };
  const all = readJson(FURN_KEY, []).filter((item) => item.id !== pack.id);
  all.unshift(pack);
  writeJson(FURN_KEY, all.slice(0, 24));
  return { kind: 'furniture', name: pack.name, count: blocks.length };
}

function storePalace(data) {
  const pack = {
    kind: 'memory-palace-mod',
    version: 1,
    part: 'palace',
    official: false,
    id: safeId(data.id || data.name || `palace_${Date.now()}`),
    name: String(data.name || '导入的宫殿').slice(0, 24),
    author: String(data.author || '玩家').slice(0, 24),
    lead: String(data.lead || data.credit || '独立导入的建筑').slice(0, 80),
    spawn: data.spawn || null,
    world: {
      removed: Array.isArray(data.world?.removed) ? data.world.removed : [],
      placed: sanitizePlaced(data.world?.placed),
    },
  };
  const all = readJson(PALACE_KEY, []).filter((item) => item.id !== pack.id);
  all.unshift(pack);
  writeJson(PALACE_KEY, all.slice(0, 24));
  return { kind: 'palace', name: pack.name, added: true, world: pack.world, spawn: pack.spawn, id: pack.id };
}

const sessionMods = [];

function rememberSession(result) {
  if (!result || result.already) return result;
  sessionMods.push({ name: result.name, kind: result.kind || result.part });
  return result;
}

export function pendingSessionMods() {
  return sessionMods.slice();
}

export function clearSessionMods() {
  sessionMods.length = 0;
}

export function installedUserMods() {
  return {
    furniture: readJson(FURN_KEY, []),
    palaces: readJson(PALACE_KEY, []),
  };
}

export function applySavedMods(mods) {
  if (!mods) return;
  for (const pack of mods.furniture || []) {
    if (!Array.isArray(pack.blocks)) continue;
    for (const block of pack.blocks) installFurnitureBlock(block);
  }
  if (mods.palaces?.length) {
    const all = readJson(PALACE_KEY, []);
    for (const pack of mods.palaces) {
      if (pack?.id && !all.some((item) => item.id === pack.id)) all.push(pack);
    }
    writeJson(PALACE_KEY, all.slice(0, 24));
  }
}

export function importMod(data) {
  if (!data || data.kind !== 'memory-palace-mod') throw new Error('这不是社区模组');
  if (data.part === 'furniture') return rememberSession(storeFurniture(data));
  if (data.part === 'palace') return rememberSession(storePalace(data));
  if (data.part === 'bundle') {
    const furniture = Array.isArray(data.blocks) && data.blocks.length ? storeFurniture(data) : null;
    const palace = data.world ? storePalace(data) : null;
    if (!furniture && !palace) throw new Error('这份组合包里没有家具也没有建筑');
    const result = {
      kind: 'bundle',
      name: String(data.name || palace?.name || furniture?.name || '组合包').slice(0, 24),
      furniture,
      palace,
    };
    rememberSession(result);
    return result;
  }
  throw new Error('还不认识这种模组');
}

export function furnitureExport(customOnly = false) {
  const imported = readJson(FURN_KEY, []);
  if (customOnly) {
    const blocks = imported.flatMap((pack) => pack.blocks || []);
    if (!blocks.length) throw new Error('还没有自己导入或制作的家具');
    return {
      kind: 'memory-palace-mod',
      version: 1,
      part: 'furniture',
      official: false,
      id: 'my-furniture',
      name: '我的家具',
      author: '本地',
      lead: '从这座宫殿导出的自制家具。',
      blocks,
    };
  }
  return officialFurniturePack();
}

export function palaceExport(world, spawn, name) {
  return {
    kind: 'memory-palace-mod',
    version: 1,
    part: 'palace',
    id: `palace-${Date.now()}`,
    name: name || '我的宫殿',
    official: false,
    author: '本地',
    lead: '从这座宫殿导出的建筑。',
    spawn,
    world: world.toDiff(),
  };
}

export function findRoomCells(world) {
  const cells = [];
  for (let y = 1; y <= 24; y += 1) {
    for (let z = -80; z <= 80; z += 1) {
      for (let x = -80; x <= 80; x += 1) {
        if (world.get(x, y, z)) continue;
        if (!world.isSolid(x, y - 1, z)) continue;
        let roof = false;
        for (let up = 1; up <= 5; up += 1) {
          if (world.get(x, y + up, z)) {
            roof = true;
            break;
          }
        }
        if (roof) cells.push({ x, y, z });
      }
    }
  }
  return cells;
}

export function dropNoteInRoom(world, notes, note) {
  const cells = findRoomCells(world);
  if (!cells.length) return null;
  const taken = new Set(notes.map((item) => item.shelf).filter(Boolean));
  const open = cells.filter((cell) => !taken.has(shelfKey(cell.x, cell.y, cell.z)));
  const pool = open.length ? open : cells;
  const cell = pool[Math.floor(Math.random() * pool.length)];
  const host = world.get(cell.x, cell.y, cell.z);
  if (!host) world.setBlock(cell.x, cell.y, cell.z, 'open_notebook');
  note.shelf = shelfKey(cell.x, cell.y, cell.z);
  note.updated = Date.now();
  rememberDrop(note, cell);
  return cell;
}

export function rememberDrop(note, cell) {
  const rows = readJson(DROP_KEY, []);
  rows.unshift({
    id: note.id,
    title: note.title || '',
    cue: note.cue || '',
    x: cell.x,
    y: cell.y,
    z: cell.z,
    at: Date.now(),
  });
  writeJson(DROP_KEY, rows.slice(0, 40));
}

export function dropHistory() {
  return readJson(DROP_KEY, []);
}

export function rememberPlace(entry) {
  const rows = readJson(PLACE_KEY, []);
  rows.unshift({
    kind: entry.kind || 'block',
    type: entry.type || '',
    title: entry.title || '',
    cue: entry.cue || '',
    id: entry.id || '',
    x: entry.x,
    y: entry.y,
    z: entry.z,
    at: Date.now(),
  });
  writeJson(PLACE_KEY, rows.slice(0, 80));
}

export function placeHistory() {
  return readJson(PLACE_KEY, []);
}

export function combinedHistory() {
  const notes = dropHistory().map((row) => ({ ...row, kind: row.kind || 'note' }));
  const blocks = placeHistory();
  return [...notes, ...blocks].sort((a, b) => (b.at || 0) - (a.at || 0)).slice(0, 80);
}

export function makeLooseNote() {
  const note = createNote(null);
  return note;
}

export { isEmptyNote };
