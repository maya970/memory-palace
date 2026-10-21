import { buildBundle, byteLength, FREE_BYTES, joinWorld, noteStub, splitWorld } from './bundle.js';
import { t } from './i18n.js';

const AR_UPLOAD = 'https://upload.ardrive.io/v1/tx';
const WALRUS_RELAY = 'https://upload-relay.mainnet.walrus.space';
const WALRUS_BYTES = 10 * 1024 * 1024;
const WALRUS_EPOCHS = 53;

function destination(text, routes) {
  const large = byteLength(text) > FREE_BYTES;
  if (large) return routes.large === 'arweave' ? 'arweave' : 'walrus';
  return routes.small === 'walrus' ? 'walrus' : 'arweave';
}

export async function uploadArweave(text, jwk, tag) {
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
    if (res.status === 402) throw new Error(t('quota'));
    throw new Error(receiptText.slice(0, 160) || t('arRejected'));
  }
  const receipt = JSON.parse(receiptText);
  if (!receipt.id) throw new Error(t('arNoId'));
  return receipt.id;
}

function bytesFromHex(hexText) {
  const out = new Uint8Array(hexText.length / 2);
  for (let index = 0; index < out.length; index += 1) {
    out[index] = Number.parseInt(hexText.slice(index * 2, index * 2 + 2), 16);
  }
  return out;
}

function walrusFailure(error) {
  const message = String(error?.message || error || '');
  if (/insufficient|not enough|balance|No valid gas|coin/i.test(message)) return t('lowFunds');
  return message.slice(0, 180) || t('walrusRejected');
}

let walrusClient;

async function mainnetWalrus() {
  if (walrusClient) return walrusClient;
  const [{ SuiGrpcClient }, { walrus }, wasm] = await Promise.all([
    import('@mysten/sui/grpc'),
    import('@mysten/walrus'),
    import('@mysten/walrus-wasm/web/walrus_wasm_bg.wasm?url'),
  ]);
  walrusClient = new SuiGrpcClient({
    network: 'mainnet',
    baseUrl: 'https://fullnode.mainnet.sui.io:443',
  }).$extend(walrus({
    wasmUrl: wasm.default,
    uploadRelay: {
      host: WALRUS_RELAY,
      sendTip: { max: 100_000_000 },
      timeout: 600_000,
    },
  }));
  return walrusClient;
}

export async function uploadWalrus(text, secretHex) {
  if (byteLength(text) > WALRUS_BYTES) throw new Error(t('tooBig'));
  const { Ed25519Keypair } = await import('@mysten/sui/keypairs/ed25519');
  const keypair = Ed25519Keypair.fromSecretKey(bytesFromHex(secretHex));
  const client = await mainnetWalrus();
  try {
    const { blobId } = await client.walrus.writeBlob({
      blob: new TextEncoder().encode(text),
      deletable: false,
      epochs: WALRUS_EPOCHS,
      signer: keypair,
    });
    if (!blobId) throw new Error(t('walrusNoId'));
    return blobId;
  } catch (error) {
    if (error?.message === t('walrusNoId')) throw error;
    throw new Error(walrusFailure(error));
  }
}

export async function uploadBundle(bundle, wallets, routes, onStatus) {
  const chosen = {
    small: routes?.small === 'walrus' ? 'walrus' : 'arweave',
    large: routes?.large === 'arweave' ? 'arweave' : 'walrus',
  };
  const put = async (value, label, tag, store = destination(JSON.stringify(value), chosen)) => {
    const text = JSON.stringify(value);
    onStatus?.(store === 'walrus' ? t('savingWalrus', { label }) : t('savingAr', { label }));
    const ref = store === 'walrus'
      ? await uploadWalrus(text, wallets.sui.secret)
      : await uploadArweave(text, wallets.arweave.jwk, tag);
    return { ref, store };
  };
  const notes = [];
  for (const note of bundle.notes) {
    const saved = await put(note, t('noteLabel', { title: note.title || note.cue || t('untitled') }), 'note');
    notes.push(noteStub(note, saved.ref, saved.store));
  }
  const worldText = JSON.stringify(bundle.world);
  const worldStore = destination(worldText, chosen);
  const chunks = worldStore === 'arweave' && byteLength(worldText) > FREE_BYTES
    ? splitWorld(bundle.world)
    : [bundle.world];
  const world = [];
  for (let index = 0; index < chunks.length; index += 1) {
    const label = chunks.length > 1
      ? t('blockPosN', { index: index + 1, total: chunks.length })
      : t('blockPos');
    world.push(await put(chunks[index], label, `world-${index + 1}`, chunks.length > 1 ? 'arweave' : worldStore));
  }
  const base = {
    version: 2,
    kind: 'memory-palace',
    created: Date.now(),
    addresses: { arweave: wallets.arweave.address, sui: wallets.sui.address },
    player: bundle.player,
    routeId: bundle.routeId,
    inventory: bundle.inventory,
    world,
    notes,
  };
  const manifestStore = destination(JSON.stringify({ ...base, store: 'arweave' }), chosen);
  const manifest = { ...base, store: manifestStore };
  const saved = await put(manifest, '索引', 'manifest', manifestStore);
  rememberUpload(saved.store, saved.ref);
  return { id: saved.ref, store: saved.store, routes: chosen };
}

export async function readStored(store, ref) {
  const query = store === 'walrus'
    ? `blob=${encodeURIComponent(ref)}`
    : `tx=${encodeURIComponent(ref)}`;
  const res = await fetch(`/api/storage?${query}`);
  if (!res.ok) throw new Error((await res.text()).slice(0, 160) || t('readFailed'));
  return res.json();
}

export function pieceStore(piece, fallback = 'arweave') {
  if (piece?.store === 'walrus' || piece?.store === 'arweave') return piece.store;
  return fallback === 'walrus' ? 'walrus' : 'arweave';
}

export function pieceRef(piece) {
  return typeof piece === 'string' ? piece : piece?.ref;
}

export async function resolveBundle(data, onProgress) {
  if (!data || typeof data !== 'object') throw new Error(t('notPalace'));
  if (data.version === 1 && Array.isArray(data.notes) && !data.kind) return buildBundle(data);
  if (data.kind !== 'memory-palace') throw new Error(t('notPalace'));
  const fallback = data.store === 'walrus' ? 'walrus' : 'arweave';
  const sources = data.notes || [];
  const worldPieces = Array.isArray(data.world) ? data.world : [];
  const total = Math.max(1, sources.length + worldPieces.length);
  let step = 0;
  const tick = (label) => onProgress?.({ ratio: step / total, label });
  const notes = [];
  for (const item of sources) {
    const title = item?.title || item?.cue;
    tick(title ? t('fetchingNote', { title }) : t('fetchingPlain'));
    notes.push(item?.html ? item : await readStored(pieceStore(item, fallback), pieceRef(item)));
    step += 1;
  }
  let world = data.world;
  if (Array.isArray(world)) {
    const chunks = [];
    for (const piece of world) {
      tick(t('fetchingBlocks'));
      chunks.push(await readStored(pieceStore(piece, fallback), pieceRef(piece)));
      step += 1;
    }
    world = joinWorld(chunks);
  }
  const placed = world?.placed?.length || 0;
  const removed = world?.removed?.length || 0;
  onProgress?.({ ratio: 1, label: t('blocksBack', { placed, removed }) });
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
