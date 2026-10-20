import { pieceRef, pieceStore, readStored, recentUploads } from './remote.js';

const AR_GQL = 'https://arweave.net/graphql';
const SUI_RPC = 'https://fullnode.mainnet.sui.io';
const WALRUS_SYSTEM = '0x2134d52768ea07e8c43570ef975eb3e4c27a39fa6396bef985b5abc58d03ddd2';

function owns(manifest, wallets) {
  const addresses = manifest?.addresses || {};
  return addresses.arweave === wallets.arweave.address || addresses.sui === wallets.sui.address;
}

async function readManifest(store, id) {
  const data = await readStored(store, id);
  if (data?.kind !== 'memory-palace') return null;
  return data;
}

async function latestArweave(address) {
  const res = await fetch(AR_GQL, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      query: `query ($owner: String!) {
        transactions(
          owners: [$owner]
          tags: [
            { name: "App-Name", values: ["memory-palace"] }
            { name: "App-Part", values: ["manifest"] }
          ]
          first: 1
          sort: HEIGHT_DESC
        ) { edges { node { id } } }
      }`,
      variables: { owner: address },
    }),
  });
  if (!res.ok) throw new Error('没有连上 Arweave');
  const payload = await res.json();
  return payload?.data?.transactions?.edges?.[0]?.node?.id || null;
}

function blobIdOf(fields) {
  const raw = fields?.blob_id ?? fields?.blobId;
  if (typeof raw === 'string' && /^[A-Za-z0-9_-]{16,128}$/.test(raw)) return raw;
  if (!Array.isArray(raw) || !raw.length || raw.length > 64) return null;
  const bytes = Uint8Array.from(raw);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/g, '');
}

async function sui(method, params) {
  const res = await fetch(SUI_RPC, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }),
  });
  if (!res.ok) throw new Error('没有连上 Sui');
  const payload = await res.json();
  if (payload.error) throw new Error(payload.error.message || 'Sui 没有回应');
  return payload.result;
}

async function latestWalrus(address, onProgress) {
  const object = await sui('sui_getObject', [WALRUS_SYSTEM, { showContent: true }]);
  const packageId = object?.data?.content?.fields?.package_id;
  if (!packageId) return null;
  const owned = await sui('suix_getOwnedObjects', [
    address,
    { filter: { StructType: `${packageId}::blob::Blob` }, options: { showContent: true } },
    null,
    8,
  ]);
  const items = owned?.data || [];
  for (let index = 0; index < items.length; index += 1) {
    onProgress?.({ ratio: 0.55 + (index / Math.max(1, items.length)) * 0.2, label: '正在查看 Walrus 上的记录' });
    const id = blobIdOf(items[index]?.data?.content?.fields);
    if (!id) continue;
    try {
      const manifest = await readManifest('walrus', id);
      if (manifest) return manifest;
    } catch {
      /* 这一条不是目录 */
    }
  }
  return null;
}

export async function findManifest(wallets, onProgress) {
  onProgress?.({ ratio: 0.12, label: '正在查找这个账户的最新索引' });
  for (const item of recentUploads()) {
    try {
      const manifest = await readManifest(item.store, item.id);
      if (manifest && owns(manifest, wallets)) return manifest;
    } catch {
      /* 本地记得的编号已经读不到 */
    }
  }
  onProgress?.({ ratio: 0.32, label: '正在查找 Arweave' });
  try {
    const id = await latestArweave(wallets.arweave.address);
    if (id) {
      const manifest = await readManifest('arweave', id);
      if (manifest) return manifest;
    }
  } catch {
    /* 目录也许在 Walrus */
  }
  onProgress?.({ ratio: 0.5, label: '正在查找 Walrus' });
  try {
    return await latestWalrus(wallets.sui.address, onProgress);
  } catch {
    return null;
  }
}

export function manifestRows(manifest) {
  const fallback = manifest?.store === 'walrus' ? 'walrus' : 'arweave';
  return (manifest?.notes || []).map((note) => ({
    ...note,
    store: pieceStore(note, fallback),
    ref: pieceRef(note),
  }));
}
