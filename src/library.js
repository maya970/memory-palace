import { BLOCKS } from './blocks.js';
import { buildBundle, bundleToSave, joinWorld } from './bundle.js';
import { excerpt, isEmptyNote, parseShelf, sanitizeHtml, sortNotes } from './notes.js';
import { loadSave, writeSave } from './storage.js';
import { pieceRef, pieceStore, readStored, recentUploads, resolveBundle } from './remote.js';

const statusEl = document.querySelector('#library-status');
const indexEl = document.querySelector('#library-index');
const listEl = document.querySelector('#note-list');
const noteEl = document.querySelector('#library-note');
const summaryEl = document.querySelector('#block-summary');
const canvas = document.querySelector('#block-map');
const recentEl = document.querySelector('#recent');
const adoptEl = document.querySelector('#adopt');

let view = null;

function status(message) {
  statusEl.textContent = message;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[ch]));
}

function where(note) {
  const pos = parseShelf(note.shelf);
  if (!pos) return '在背包里';
  return `${pos.x}, ${pos.y}, ${pos.z}`;
}

function drawMap(world) {
  const placed = world?.placed || [];
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = '#241910';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const counts = new Map();
  const top = new Map();
  for (const item of placed) {
    const [x, y, z, type] = item;
    if (!BLOCKS[type]) continue;
    counts.set(type, (counts.get(type) || 0) + 1);
    const key = `${x},${z}`;
    const prev = top.get(key);
    if (!prev || y >= prev.y) top.set(key, { x, z, y, type });
  }
  const removed = world?.removed?.length || 0;
  if (!top.size) {
    ctx.fillStyle = '#f0d7b0';
    ctx.font = '16px Microsoft YaHei';
    ctx.fillText(removed ? `拆掉了 ${removed} 处，没有新放的方块` : '方块还是最初的岛', 24, 48);
    summaryEl.textContent = removed ? `拆掉 ${removed} 处` : '没有额外的方块记录';
    return;
  }
  const cells = [...top.values()];
  const minX = Math.min(...cells.map((cell) => cell.x));
  const maxX = Math.max(...cells.map((cell) => cell.x));
  const minZ = Math.min(...cells.map((cell) => cell.z));
  const maxZ = Math.max(...cells.map((cell) => cell.z));
  const spanX = maxX - minX + 1;
  const spanZ = maxZ - minZ + 1;
  const size = Math.max(6, Math.min(18, Math.floor(Math.min((canvas.width - 48) / spanX, (canvas.height - 48) / spanZ))));
  const originX = Math.floor((canvas.width - spanX * size) / 2);
  const originY = Math.floor((canvas.height - spanZ * size) / 2);
  for (const cell of cells) {
    ctx.fillStyle = BLOCKS[cell.type].color;
    ctx.fillRect(originX + (cell.x - minX) * size, originY + (cell.z - minZ) * size, size - 1, size - 1);
  }
  ctx.fillStyle = '#f0d7b0';
  ctx.font = '13px Microsoft YaHei';
  ctx.fillText('北', originX + (spanX * size) / 2 - 6, Math.max(16, originY - 8));
  const names = [...counts.entries()].map(([type, count]) => `${BLOCKS[type].name} ${count}`).join('，');
  summaryEl.textContent = `新放 ${placed.length} 块，拆掉 ${removed} 处。${names}`;
}

function renderList() {
  const notes = sortNotes((view?.notes || []).filter((note) => note.ref || !isEmptyNote(note)));
  listEl.innerHTML = notes.length
    ? notes.map((note, index) => `<button type="button" class="library-row" data-index="${index}">
        <span>${note.order != null ? `第 ${note.order} 处` : '未编号'}</span>
        <strong>${escapeHtml(note.cue || '（没有线索词）')}</strong>
        <em>${escapeHtml(note.title || '未命名')}</em>
        <small>${escapeHtml(excerpt(note.html || '') || where(note))}</small>
      </button>`).join('')
    : '<p class="empty-notes">还没有写过的笔记。</p>';
  listEl.querySelectorAll('.library-row').forEach((row) => {
    row.addEventListener('click', () => openNote(notes[Number(row.dataset.index)]));
  });
}

function showIndex() {
  indexEl.classList.remove('hidden');
  noteEl.classList.add('hidden');
  drawMap(view?.world);
  renderList();
  renderRecent();
}

function renderRecent() {
  const items = recentUploads();
  recentEl.innerHTML = items.length
    ? `<p>这台浏览器上传过</p>${items.map((item) => `<button type="button" data-store="${item.store}" data-id="${escapeHtml(item.id)}">${item.store === 'walrus' ? 'Walrus' : 'Arweave'} · ${escapeHtml(item.id.slice(0, 18))}…</button>`).join('')}`
    : '';
recentEl.querySelectorAll('button').forEach((button) => {
  button.addEventListener('click', async () => {
    status('正在读取目录');
    try {
      await openRemote(button.dataset.store, button.dataset.id);
    } catch (error) {
      status(error?.message || '这个编号没有打开');
    }
  });
});
}

async function showBundle(bundle, source) {
  view = {
    source,
    store: bundle.store || null,
    notes: bundle.notes || [],
    world: bundle.world || { removed: [], placed: [] },
    bundle,
  };
  adoptEl.classList.toggle('hidden', source === 'local');
  status(source === 'local' ? '正在看这台浏览器里的笔记' : '备份已按条列在下面');
  showIndex();
}

async function openNote(entry) {
  status('正在打开这一条');
  try {
    const note = entry.html || !entry.ref
      ? entry
      : await readStored(pieceStore(entry, view.store || 'arweave'), entry.ref);
    document.querySelector('#note-kicker').textContent = note.cue || '笔记';
    document.querySelector('#note-title').textContent = note.title || '未命名';
    document.querySelector('#note-where').textContent = `${note.order != null ? `第 ${note.order} 处 · ` : ''}${where(note)}`;
    document.querySelector('#note-body').innerHTML = sanitizeHtml(note.html || '<p><br></p>');
    indexEl.classList.add('hidden');
    noteEl.classList.remove('hidden');
    status('');
  } catch (error) {
    status(error?.message || '这一条没有打开');
  }
}

async function openRemote(store, id) {
  const manifest = await readStored(store, id);
  if (manifest?.kind !== 'memory-palace') throw new Error('这不是宫殿备份');
  const fallback = pieceStore(manifest, store);
  const chunks = [];
  for (const piece of (Array.isArray(manifest.world) ? manifest.world : [])) {
    chunks.push(await readStored(pieceStore(piece, fallback), pieceRef(piece)));
  }
  await showBundle({ ...manifest, store: fallback, world: joinWorld(chunks) }, 'remote');
}

document.querySelector('#note-back').addEventListener('click', () => {
  if (view) showIndex();
});
document.querySelector('#use-local').addEventListener('click', () => {
  const save = loadSave();
  if (!save) {
    status('这台浏览器里还没有宫殿');
    return;
  }
  showBundle(buildBundle(save), 'local');
});
document.querySelector('#open-remote').addEventListener('click', async () => {
  const id = document.querySelector('#remote-id').value.trim();
  if (!id) return;
  status('正在读取目录');
  try {
    await openRemote('arweave', id);
  } catch {
    try {
      await openRemote('walrus', id);
    } catch (error) {
      status(error?.message || '这个编号没有打开');
    }
  }
});
document.querySelector('#open-file').addEventListener('click', () => document.querySelector('#library-file').click());
document.querySelector('#library-file').addEventListener('change', async (event) => {
  const file = event.target.files?.[0];
  event.target.value = '';
  if (!file) return;
  try {
    status('正在读文件');
    const bundle = await resolveBundle(JSON.parse(await file.text()));
    await showBundle(bundle, 'file');
  } catch (error) {
    status(error?.message || '这个文件打不开');
  }
});
adoptEl.addEventListener('click', () => {
  if (!view?.bundle && view?.source !== 'remote') return;
  const bundle = view.bundle?.notes?.some((note) => note.html) ? view.bundle : null;
  if (!bundle) {
    status('正在把每一条笔记取回来');
    resolveBundle(view.bundle).then((full) => {
      view.bundle = full;
      view.notes = full.notes;
      writeSave(bundleToSave(full));
      window.location.href = '/';
    }).catch((error) => status(error?.message || '没有放回去'));
    return;
  }
  writeSave(bundleToSave(bundle));
  window.location.href = '/';
});

const params = new URLSearchParams(location.search);
const tx = params.get('tx');
const blob = params.get('blob');
if (tx) openRemote('arweave', tx).catch((error) => status(error?.message || '这个编号没有打开'));
else if (blob) openRemote('walrus', blob).catch((error) => status(error?.message || '这个编号没有打开'));
else document.querySelector('#use-local').click();
