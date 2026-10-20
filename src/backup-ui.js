import { buildBundle } from './bundle.js';
import { recentUploads, resolveBundle, uploadBundle } from './remote.js';
import { accountNeedsExport, createWallets, loadWallets, markAccountExported, walletAddresses, walletFile } from './wallets.js';

const ROUTE_KEY = 'memory-palace-routes';

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[ch]));
}

function storeName(store) {
  return store === 'walrus' ? 'Walrus' : 'Arweave';
}

export function createBackup(root, hooks) {
  const statusEl = root.querySelector('[data-status]');
  const resultEl = root.querySelector('#backup-result');
  const walletEl = root.querySelector('#wallet-box');
  const fileInput = root.querySelector('#backup-file');
  const meter = root.querySelector('.meter');
  const fill = root.querySelector('.meter-fill');
  let busy = false;

  function paint(ratio, label) {
    meter.hidden = false;
    if (ratio == null) fill.classList.add('indeterminate');
    else {
      fill.classList.remove('indeterminate');
      fill.style.width = `${Math.max(6, Math.round(ratio * 100))}%`;
    }
    if (label) statusEl.textContent = label;
  }

  function idle(message) {
    meter.hidden = true;
    fill.classList.remove('indeterminate');
    fill.style.width = '0';
    statusEl.textContent = message || '';
  }

  function setBusy(next) {
    busy = next;
    root.querySelectorAll('button').forEach((button) => {
      if (button.id !== 'backup-close') button.disabled = next;
    });
  }

  function readRoutes() {
    try {
      const data = JSON.parse(localStorage.getItem(ROUTE_KEY) || '{}');
      return {
        small: data.small === 'walrus' ? 'walrus' : 'arweave',
        large: data.large === 'arweave' ? 'arweave' : 'walrus',
      };
    } catch {
      return { small: 'arweave', large: 'walrus' };
    }
  }

  function applyRoutes(next) {
    for (const name of ['small', 'large']) {
      root.querySelectorAll(`[data-route="${name}"] [data-store]`).forEach((button) => {
        button.classList.toggle('on', button.dataset.store === next[name]);
      });
    }
  }

  function renderWallets() {
    const addresses = walletAddresses();
    root.querySelector('#wallet-create').classList.toggle('hidden', Boolean(addresses));
    root.querySelector('#account-remind').classList.toggle('hidden', !accountNeedsExport());
    if (!addresses) {
      walletEl.innerHTML = '<p>还没有账户。</p>';
      return;
    }
    walletEl.innerHTML = `<div><span>Arweave</span><code>${escapeHtml(addresses.arweave)}</code></div><div><span>Sui</span><code>${escapeHtml(addresses.sui)}</code></div>`;
  }

  async function ensureWallets() {
    if (loadWallets()) return loadWallets();
    paint(null, '正在生成账户');
    await createWallets();
    renderWallets();
    hooks.onAccount?.();
    return loadWallets();
  }

  async function upload() {
    if (busy) return;
    setBusy(true);
    resultEl.textContent = '';
    const routes = readRoutes();
    paint(null, '正在上传');
    try {
      const wallets = await ensureWallets();
      const bundle = buildBundle(hooks.snapshot());
      const result = await uploadBundle(bundle, wallets, routes, (label) => paint(null, label));
      const query = result.store === 'walrus' ? `blob=${result.id}` : `tx=${result.id}`;
      idle(`100KB 以内写进 ${storeName(routes.small)}，超过的写进 ${storeName(routes.large)}`);
      resultEl.innerHTML = `<a href="library.html?${query}">${escapeHtml(result.id)}</a>`;
    } catch (error) {
      idle(error?.message || '没有传上去');
    } finally {
      setBusy(false);
      renderWallets();
    }
  }

  root.querySelector('#backup-close').addEventListener('click', () => hooks.onClose());
  root.querySelectorAll('.route-switch').forEach((row) => {
    row.addEventListener('click', (event) => {
      const button = event.target.closest('[data-store]');
      if (!button || busy) return;
      const next = readRoutes();
      next[row.dataset.route] = button.dataset.store;
      localStorage.setItem(ROUTE_KEY, JSON.stringify(next));
      applyRoutes(next);
    });
  });
  root.querySelector('#wallet-create').addEventListener('click', async () => {
    if (busy || loadWallets()) return;
    setBusy(true);
    try {
      await ensureWallets();
      idle('请导出账户');
    } catch (error) {
      idle(error?.message || '账户没有生成');
    } finally {
      setBusy(false);
    }
  });
  root.querySelector('#wallet-export').addEventListener('click', () => {
    const file = walletFile();
    if (!file) {
      idle('还没有账户可以导出');
      return;
    }
    hooks.download(file, '宫殿账户.json', 'application/json');
    markAccountExported();
    hooks.onAccount?.();
    renderWallets();
    idle('账户文件已经下载');
  });
  root.querySelector('#backup-export').addEventListener('click', () => {
    hooks.download(JSON.stringify(buildBundle(hooks.snapshot()), null, 2), '记忆宫殿.json', 'application/json');
    idle('这一份里有方块方位和全部笔记');
  });
  root.querySelector('#backup-import').addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', async () => {
    const file = fileInput.files?.[0];
    fileInput.value = '';
    if (!file || busy) return;
    setBusy(true);
    paint(0.15, '正在读取这一份文件');
    try {
      const bundle = await resolveBundle(JSON.parse(await file.text()), ({ ratio, label }) => paint(0.15 + ratio * 0.85, label));
      hooks.onImport(bundle);
    } catch (error) {
      idle(error?.message || '这个文件打不开');
      setBusy(false);
    }
  });
  root.querySelector('#backup-ar').addEventListener('click', () => upload());

  applyRoutes(readRoutes());
  return {
    isOpen: () => !root.classList.contains('hidden'),
    open() {
      renderWallets();
      applyRoutes(readRoutes());
      const latest = recentUploads()[0];
      resultEl.textContent = latest ? latest.id : '';
      if (!busy) idle('');
      root.classList.remove('hidden');
    },
    close() {
      root.classList.add('hidden');
    },
    refresh: renderWallets,
  };
}
