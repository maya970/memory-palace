import { buildBundle } from './bundle.js';
import { recentUploads, resolveBundle, uploadBundle } from './remote.js';
import { createWallets, loadWallets, walletAddresses, walletFile } from './wallets.js';

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[ch]));
}

export function createBackup(root, hooks) {
  const statusEl = root.querySelector('#backup-status');
  const resultEl = root.querySelector('#backup-result');
  const walletEl = root.querySelector('#wallet-box');
  const fileInput = root.querySelector('#backup-file');
  let busy = false;

  function setBusy(next) {
    busy = next;
    root.querySelectorAll('button').forEach((button) => {
      if (button.id !== 'backup-close') button.disabled = next;
    });
  }

  function status(message) {
    statusEl.textContent = message;
  }

  function renderWallets() {
    const addresses = walletAddresses();
    if (!addresses) {
      walletEl.innerHTML = '<p>还没有钱包。点下面的按钮，会在这台浏览器里同时生成 Arweave 和 Sui 两把钥匙，不连接任何插件。</p>';
      return;
    }
    walletEl.innerHTML = `<p>Arweave<br><code>${escapeHtml(addresses.arweave)}</code></p><p>Sui<br><code>${escapeHtml(addresses.sui)}</code><br>超过 100KB 的正文从这把钥匙扣 Walrus 的费用，把 SUI 和 WAL 打到这个地址。</p>`;
  }

  async function ensureWallets() {
    if (loadWallets()) return loadWallets();
    status('正在生成 Arweave 和 Sui 两把钥匙');
    await createWallets();
    renderWallets();
    return loadWallets();
  }

  async function upload(store) {
    if (busy) return;
    setBusy(true);
    resultEl.textContent = '';
    try {
      const wallets = await ensureWallets();
      const bundle = buildBundle(hooks.snapshot());
      const result = await uploadBundle(bundle, wallets, store, status);
      const query = result.store === 'walrus' ? `blob=${result.id}` : `tx=${result.id}`;
      const href = `library.html?${query}`;
      const done = result.paidAll
        ? '已经全部写进 Walrus 主网'
        : (result.usesWalrus ? '100KB 以内写进了 Arweave，超过的写进了 Walrus 主网' : '已经写进 Arweave');
      status(done);
      resultEl.innerHTML = `目录页按条打开：<a href="${href}">${escapeHtml(result.id)}</a>`;
    } catch (error) {
      status(error?.message || '没有传上去');
    } finally {
      setBusy(false);
    }
  }

  root.querySelector('#backup-close').addEventListener('click', () => hooks.onClose());
  root.querySelector('#wallet-create').addEventListener('click', async () => {
    if (busy) return;
    if (loadWallets()) {
      status('两把钥匙已经在这台浏览器里');
      renderWallets();
      return;
    }
    setBusy(true);
    try {
      await ensureWallets();
      status('两把钥匙只留在这台浏览器里');
    } catch (error) {
      status(error?.message || '钥匙没有生成');
    } finally {
      setBusy(false);
    }
  });
  root.querySelector('#wallet-export').addEventListener('click', () => {
    const file = walletFile();
    if (!file) {
      status('还没有钥匙可以导出');
      return;
    }
    hooks.download(file, '宫殿钥匙.json', 'application/json');
    status('私钥在这个文件里，不要传到网上');
  });
  root.querySelector('#backup-export').addEventListener('click', () => {
    const bundle = buildBundle(hooks.snapshot());
    hooks.download(JSON.stringify(bundle, null, 2), '记忆宫殿.json', 'application/json');
    status('文件已经下载，里面是笔记和方块坐标');
  });
  root.querySelector('#backup-import').addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', async () => {
    const file = fileInput.files?.[0];
    fileInput.value = '';
    if (!file || busy) return;
    setBusy(true);
    try {
      status('正在读备份');
      const data = JSON.parse(await file.text());
      const bundle = await resolveBundle(data);
      status('正在放回这座宫殿');
      hooks.onImport(bundle);
    } catch (error) {
      status(error?.message || '这个文件打不开');
      setBusy(false);
    }
  });
  root.querySelector('#backup-ar').addEventListener('click', () => upload('auto'));
  root.querySelector('#backup-sui').addEventListener('click', () => upload('walrus'));
  root.querySelector('#backup-library').addEventListener('click', () => {
    window.location.href = 'library.html';
  });

  return {
    isOpen: () => !root.classList.contains('hidden'),
    open() {
      renderWallets();
      const latest = recentUploads()[0];
      resultEl.textContent = latest ? `最近一次上传：${latest.id}` : '';
      root.classList.remove('hidden');
    },
    close() {
      root.classList.add('hidden');
    },
  };
}
