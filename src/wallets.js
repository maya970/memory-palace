import { blake2b } from '@noble/hashes/blake2.js';
import { sha512 } from '@noble/hashes/sha2.js';
import * as ed from '@noble/ed25519';

const KEY = 'memory-palace-wallets';
const NOTICE = 'memory-palace-account-notice';

ed.hashes.sha512 = sha512;

function hex(bytes) {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

function suiAddress(publicKey) {
  const flagged = new Uint8Array(publicKey.length + 1);
  flagged.set(publicKey, 1);
  return `0x${hex(blake2b(flagged, { dkLen: 32 }))}`;
}

export function loadWallets() {
  try {
    const data = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (!data?.arweave?.jwk || !data?.arweave?.address || !data?.sui?.secret || !data?.sui?.address) return null;
    return data;
  } catch {
    return null;
  }
}

export function walletAddresses(wallets = loadWallets()) {
  if (!wallets) return null;
  return { arweave: wallets.arweave.address, sui: wallets.sui.address };
}

export async function createWallets() {
  const Arweave = (await import('arweave')).default;
  const arweave = Arweave.init({ host: 'arweave.net', port: 443, protocol: 'https' });
  const jwk = await arweave.wallets.generate();
  const arweaveAddress = await arweave.wallets.jwkToAddress(jwk);
  const { secretKey, publicKey } = ed.keygen();
  const wallets = {
    arweave: { address: arweaveAddress, jwk },
    sui: { address: suiAddress(publicKey), secret: hex(secretKey) },
  };
  localStorage.setItem(KEY, JSON.stringify(wallets));
  localStorage.setItem(NOTICE, '1');
  return walletAddresses(wallets);
}

export function accountNeedsExport() {
  return Boolean(loadWallets()) && localStorage.getItem(NOTICE) !== '0';
}

export function markAccountExported() {
  localStorage.setItem(NOTICE, '0');
}

export function saveWallets(data) {
  if (!data?.arweave?.jwk || !data?.arweave?.address || !data?.sui?.secret || !data?.sui?.address) {
    throw new Error('这不是宫殿账户');
  }
  const wallets = {
    arweave: { address: data.arweave.address, jwk: data.arweave.jwk },
    sui: { address: data.sui.address, secret: data.sui.secret },
  };
  localStorage.setItem(KEY, JSON.stringify(wallets));
  localStorage.setItem(NOTICE, '0');
  return wallets;
}

export function walletFile() {
  const wallets = loadWallets();
  if (!wallets) return null;
  return JSON.stringify(wallets, null, 2);
}
