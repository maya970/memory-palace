import { isEmptyNote, normalizeNote } from './notes.js';

export const FREE_BYTES = 100 * 1024;

export function buildBundle(save) {
  const world = save.world?.placed || save.world?.removed
    ? save.world
    : { removed: save.removed || [], placed: save.placed || [] };
  return {
    version: 2,
    kind: 'memory-palace',
    player: save.player || null,
    routeId: save.routeId || null,
    inventory: {
      slot: Number.isInteger(save.inventory?.slot) ? save.inventory.slot : (Number.isInteger(save.slot) ? save.slot : 5),
      hotbar: save.inventory?.hotbar || save.hotbar || [],
      backpack: save.inventory?.backpack || save.backpack || [],
    },
    world: {
      removed: [...(world.removed || [])],
      placed: [...(world.placed || [])],
    },
    notes: (save.notes || []).map(normalizeNote).filter((note) => !isEmptyNote(note)),
  };
}

export function bundleToSave(bundle) {
  const world = Array.isArray(bundle.world)
    ? { removed: [], placed: [] }
    : (bundle.world || { removed: bundle.removed || [], placed: bundle.placed || [] });
  return {
    version: 1,
    removed: world.removed || [],
    placed: world.placed || [],
    notes: (bundle.notes || []).map(normalizeNote),
    player: bundle.player || null,
    routeId: bundle.routeId || null,
    slot: bundle.inventory?.slot ?? bundle.slot ?? 5,
    hotbar: bundle.inventory?.hotbar || bundle.hotbar || [],
    backpack: bundle.inventory?.backpack || bundle.backpack || [],
  };
}

export function byteLength(value) {
  const text = typeof value === 'string' ? value : JSON.stringify(value);
  return new TextEncoder().encode(text).byteLength;
}

export function splitWorld(world) {
  const removed = [...(world?.removed || [])];
  const placed = [...(world?.placed || [])];
  const chunks = [];
  let current = { removed, placed: [] };
  const tooBig = () => byteLength(current) > FREE_BYTES;
  if (tooBig() && !placed.length) throw new Error('拆掉的方块记录超过了免费上传的大小');
  for (const block of placed) {
    current.placed.push(block);
    if (!tooBig()) continue;
    current.placed.pop();
    if (!current.placed.length) throw new Error('单处方块记录超过了免费上传的大小');
    chunks.push(current);
    current = { removed: [], placed: [block] };
    if (tooBig()) throw new Error('单处方块记录超过了免费上传的大小');
  }
  chunks.push(current);
  return chunks;
}

export function joinWorld(chunks) {
  return {
    removed: chunks.flatMap((chunk) => chunk?.removed || []),
    placed: chunks.flatMap((chunk) => chunk?.placed || []),
  };
}

export function noteStub(note, ref) {
  return {
    id: note.id,
    title: note.title,
    cue: note.cue,
    order: note.order,
    shelf: note.shelf,
    updated: note.updated,
    ref,
  };
}

export function isRemoteManifest(data) {
  return data?.kind === 'memory-palace' && Array.isArray(data.notes) && data.notes.some((note) => note?.ref && !note.html);
}
