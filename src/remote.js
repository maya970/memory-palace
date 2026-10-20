import { buildBundle, byteLength, FREE_BYTES, joinWorld, noteStub, splitWorld } from './bundle.js';

const AR_UPLOAD = 'https://upload.ardrive.io/v1/tx';
const WALRUS_PUBLISHER = 'https://publisher.walrus-testnet.walrus.space/v1/blobs';

export async function uploadArweave(text, jwk, tag) {
  if (byteLength(text) > FREE_BYTES) throw new Error('这一条超过免费的 100KB，请改用导出文件');
  const { Buffer } = await import('buffer');
  globalThis.Buffer = Buffer;
  const { ArweaveSigner, createData } = await import('arbundles');
  const signer = new ArweaveSigner(jwk);
  const item = createData(text, signer, {
    tags: [
      { name: 'Content-Type', value: 'application/json' },
      { name: 'App-Name', value: 'memory-palace' },
      { name: 'App-Part', value: tag },
    ],
  });
  await item.sign(signer);
  const raw = item.getRaw();
  const res = await fetch(AR_UPLOAD, {
    method: 'POST',
    headers: { 'content-type': 'application/octet-stream' },
    body: raw instanceof Uint8Array ? raw : new Uint8Array(raw),
  });
  const receiptText = await res.text();
  if (!res.ok) {
    if (res.status === 402) throw new Error('免费额度用完了，或这一条太大。可以先导出文件');
    throw new Error(receiptText.slice(0, 160) || 'Arweave 没有收下');
  }
  const receipt = JSON.parse(receiptText);
  if (!receipt.id) throw new Error('Arweave 没有返回编号');
  return receipt.id;
}

function walrusId(data) {
  return data?.newlyCreated?.blobObject?.blobId || data?.alreadyCertified?.blobId || null;
}

export async function uploadWalrus(text, suiAddress) {
  if (byteLength(text) > 10 * 1024 * 1024) throw new Error('这一条超过了 Sui 测试网单次 10MB');
  const query = suiAddress ? `?epochs=5&send_object_to=${encodeURIComponent(suiAddress)}` : '?epochs=5';
  const res = await fetch(`${WALRUS_PUBLISHER}${query}`, {
    method: 'PUT',
    headers: { 'content-type': 'application/octet-stream' },
    body: text,
  });
  const raw = await res.text();
  if (!res.ok) throw new Error(raw.slice(0, 160) || 'Sui 存储没有收下');
  const id = walrusId(JSON.parse(raw));
  if (!id) throw new Error('Sui 存储没有返回编号');
  return id;
}

export async function uploadBundle(bundle, wallets, store, onStatus) {
  const put = async (value, label, tag) => {
    const text = JSON.stringify(value);
    onStatus?.(`正在上传${label}`);
    if (store === 'walrus') return uploadWalrus(text, wallets.sui.address);
    return uploadArweave(text, wallets.arweave.jwk, tag);
  };
  const notes = [];
  for (const note of bundle.notes) {
    const ref = await put(note, `《${note.title || note.cue || '未命名'}》`, 'note');
    notes.push(noteStub(note, ref));
  }
  const world = [];
  const chunks = splitWorld(bundle.world);
  for (let index = 0; index < chunks.length; index += 1) {
    const label = chunks.length > 1 ? `方块 ${index + 1}/${chunks.length}` : '方块记录';
    world.push(await put(chunks[index], label, `world-${index + 1}`));
  }
  const manifest = {
    version: 2,
    kind: 'memory-palace',
    store,
    created: Date.now(),
    addresses: { arweave: wallets.arweave.address, sui: wallets.sui.address },
    player: bundle.player,
    routeId: bundle.routeId,
    inventory: bundle.inventory,
    world,
    notes,
  };
  const id = await put(manifest, '目录', 'manifest');
  rememberUpload(store, id);
  return { id, store };
}

export async function readStored(store, ref) {
  const query = store === 'walrus'
    ? `blob=${encodeURIComponent(ref)}`
    : `tx=${encodeURIComponent(ref)}`;
  const res = await fetch(`/api/storage?${query}`);
  if (!res.ok) throw new Error((await res.text()).slice(0, 160) || '没有读到这份备份');
  return res.json();
}

export async function resolveBundle(data) {
  if (!data || typeof data !== 'object') throw new Error('这个文件不是宫殿备份');
  if (data.version === 1 && Array.isArray(data.notes) && !data.kind) return buildBundle(data);
  if (data.kind !== 'memory-palace') throw new Error('这个文件不是宫殿备份');
  const store = data.store === 'walrus' ? 'walrus' : 'arweave';
  const notes = [];
  for (const item of data.notes || []) {
    notes.push(item?.html ? item : await readStored(store, item.ref));
  }
  let world = data.world;
  if (Array.isArray(world)) {
    const chunks = [];
    for (const ref of world) chunks.push(await readStored(store, ref));
    world = joinWorld(chunks);
  }
  return { ...data, notes, world: world || { removed: [], placed: [] } };
}

export async function loadRemote(store, id) {
  const manifest = await readStored(store, id);
  return resolveBundle(manifest);
}

function rememberUpload(store, id) {
  try {
    const previous = JSON.parse(localStorage.getItem('memory-palace-uploads') || '[]');
    const next = [{ store, id, at: Date.now() }, ...previous.filter((item) => item.id !== id)].slice(0, 8);
    localStorage.setItem('memory-palace-uploads', JSON.stringify(next));
  } catch {
    /* 目录页仍可用编号打开 */
  }
}

export function recentUploads() {
  try {
    const list = JSON.parse(localStorage.getItem('memory-palace-uploads') || '[]');
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}
