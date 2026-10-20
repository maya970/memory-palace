import { buildBundle, byteLength, FREE_BYTES, joinWorld, noteStub, splitWorld } from './bundle.js';

const AR_UPLOAD = 'https://upload.ardrive.io/v1/tx';
const WALRUS_RELAY = 'https://upload-relay.mainnet.walrus.space';
const WALRUS_BYTES = 10 * 1024 * 1024;
const WALRUS_EPOCHS = 53;

function destination(text, payForSmall) {
  return payForSmall || byteLength(text) > FREE_BYTES ? 'walrus' : 'arweave';
}

export async function uploadArweave(text, jwk, tag) {
  if (byteLength(text) > FREE_BYTES) throw new Error('这一条超过 100KB，会改走 Walrus');
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
    if (res.status === 402) throw new Error('免费额度用完了');
    throw new Error(receiptText.slice(0, 160) || 'Arweave 没有收下');
  }
  const receipt = JSON.parse(receiptText);
  if (!receipt.id) throw new Error('Arweave 没有返回编号');
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
  if (/insufficient|not enough|balance|No valid gas|coin/i.test(message)) {
    return '这把 Sui 钥匙里的 SUI 或 WAL 不够。大文本存在 Walrus 主网，费用从这把钥匙扣，不会弹出钱包。';
  }
  return message.slice(0, 180) || 'Walrus 没有收下';
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
  if (byteLength(text) > WALRUS_BYTES) throw new Error('这一条超过了 10MB');
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
    if (!blobId) throw new Error('Walrus 没有返回编号');
    return blobId;
  } catch (error) {
    if (error?.message === 'Walrus 没有返回编号') throw error;
    throw new Error(walrusFailure(error));
  }
}

export async function uploadBundle(bundle, wallets, mode, onStatus) {
  const payForSmall = mode === 'walrus';
  const put = async (value, label, tag) => {
    const text = JSON.stringify(value);
    const store = destination(text, payForSmall);
    onStatus?.(store === 'walrus' ? `正在把${label}存到 Walrus` : `正在上传${label}`);
    const ref = store === 'walrus'
      ? await uploadWalrus(text, wallets.sui.secret)
      : await uploadArweave(text, wallets.arweave.jwk, tag);
    return { ref, store };
  };
  const notes = [];
  for (const note of bundle.notes) {
    const saved = await put(note, `《${note.title || note.cue || '未命名'}》`, 'note');
    notes.push(noteStub(note, saved.ref, saved.store));
  }
  const world = [];
  const chunks = payForSmall ? [bundle.world] : splitWorld(bundle.world);
  for (let index = 0; index < chunks.length; index += 1) {
    const label = chunks.length > 1 ? `方块 ${index + 1}/${chunks.length}` : '方块记录';
    world.push(await put(chunks[index], label, `world-${index + 1}`));
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
  const manifest = {
    ...base,
    store: payForSmall || byteLength({ ...base, store: 'arweave' }) > FREE_BYTES ? 'walrus' : 'arweave',
  };
  const saved = await put(manifest, '目录', 'manifest');
  const usesWalrus = saved.store === 'walrus' || notes.some((item) => item.store === 'walrus') || world.some((item) => item.store === 'walrus');
  rememberUpload(saved.store, saved.ref);
  return { id: saved.ref, store: saved.store, usesWalrus, paidAll: payForSmall };
}

export async function readStored(store, ref) {
  const query = store === 'walrus'
    ? `blob=${encodeURIComponent(ref)}`
    : `tx=${encodeURIComponent(ref)}`;
  const res = await fetch(`/api/storage?${query}`);
  if (!res.ok) throw new Error((await res.text()).slice(0, 160) || '没有读到这份备份');
  return res.json();
}

export function pieceStore(piece, fallback = 'arweave') {
  if (piece?.store === 'walrus' || piece?.store === 'arweave') return piece.store;
  return fallback === 'walrus' ? 'walrus' : 'arweave';
}

export function pieceRef(piece) {
  return typeof piece === 'string' ? piece : piece?.ref;
}

export async function resolveBundle(data) {
  if (!data || typeof data !== 'object') throw new Error('这个文件不是宫殿备份');
  if (data.version === 1 && Array.isArray(data.notes) && !data.kind) return buildBundle(data);
  if (data.kind !== 'memory-palace') throw new Error('这个文件不是宫殿备份');
  const fallback = data.store === 'walrus' ? 'walrus' : 'arweave';
  const notes = [];
  for (const item of data.notes || []) {
    notes.push(item?.html ? item : await readStored(pieceStore(item, fallback), pieceRef(item)));
  }
  let world = data.world;
  if (Array.isArray(world)) {
    const chunks = [];
    for (const piece of world) chunks.push(await readStored(pieceStore(piece, fallback), pieceRef(piece)));
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
