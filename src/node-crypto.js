import { sha256, sha384, sha512 } from '@noble/hashes/sha2.js';

const algos = { sha256, sha384, sha512 };

function concat(chunks) {
  const parts = chunks.map((chunk) => (typeof chunk === 'string' ? new TextEncoder().encode(chunk) : chunk));
  const out = new Uint8Array(parts.reduce((sum, part) => sum + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    out.set(part, offset);
    offset += part.length;
  }
  return out;
}

export function createHash(name) {
  const hash = algos[name];
  if (!hash) throw new Error(`不支持 ${name}`);
  const chunks = [];
  return {
    update(data) {
      chunks.push(data);
      return this;
    },
    digest() {
      return hash(concat(chunks));
    },
  };
}

export function createSign() {
  throw new Error('这条签名路径没有用到');
}

export const constants = { RSA_PKCS1_PSS_PADDING: 6 };
