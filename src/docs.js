/** 全部文档表：本机笔记、链上索引、投放历史。支持 Word 导入导出，以及可选标亮。 */
import { BLOCKS } from './blocks.js';
import { findManifest, manifestRows } from './chain.js';
import { combinedHistory } from './community.js';
import { readStored } from './remote.js';
import { parseShelf, plainText, sanitizeHtml } from './notes.js';
import { loadWallets } from './wallets.js';

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[ch]));
}

function where(note) {
  const pos = parseShelf(note.shelf);
  return pos ? `${pos.x}, ${pos.y}, ${pos.z}` : '背包';
}

function storeName(store) {
  if (store === 'walrus') return 'Walrus';
  if (store === 'arweave') return 'Arweave';
  return '本地';
}

function fieldOf(note, key) {
  if (key === 'order') return note.order == null || note.order === '' ? Number.POSITIVE_INFINITY : Number(note.order);
  if (key === 'cue') return note.cue || '';
  if (key === 'title') return note.title || '未命名';
  if (key === 'where') return where(note);
  return storeName(note.store);
}

export function createDocs(root, hooks) {
  const body = root.querySelector('#docs-body');
  const statusEl = root.querySelector('[data-status]');
  const countEl = root.querySelector('#docs-count');
  const searchEl = root.querySelector('#docs-search');
  const meter = root.querySelector('.meter');
  const fill = root.querySelector('.meter-fill');
  const reader = root.querySelector('#docs-read');
  const tableWrap = root.querySelector('.doc-table-wrap');
  const palaceButton = root.querySelector('#docs-open-palace');
  const historyEl = root.querySelector('#docs-history-list');
  const wordNew = root.querySelector('#docs-word-new');
  const wordNewFile = root.querySelector('#docs-docx-new');
  const wordExport = root.querySelector('#docs-word-export');
  const wordImport = root.querySelector('#docs-word-import');
  const wordReadFile = root.querySelector('#docs-docx-read');
  const beaconButton = root.querySelector('#docs-beacon');
  let mode = 'local';
  let chain = null;
  let busy = false;
  let source = [];
  let query = '';
  let sortKey = 'order';
  let sortDir = 1;
  let reading = null;

  function paint(ratio, label) {
    meter.hidden = false;
    if (ratio == null) fill.classList.add('indeterminate');
    else {
      fill.classList.remove('indeterminate');
      fill.style.width = `${Math.max(6, Math.round(ratio * 100))}%`;
    }
    statusEl.textContent = label || '';
  }

  function idle(message) {
    meter.hidden = true;
    fill.classList.remove('indeterminate');
    statusEl.textContent = message || '';
  }

  function ordered(notes) {
    const needle = query.trim().toLowerCase();
    return notes.filter((note) => {
      if (!needle) return true;
      const text = `${note.title || ''} ${note.cue || ''} ${where(note)} ${note.html ? plainText(note.html) : ''}`.toLowerCase();
      return text.includes(needle);
    }).sort((a, b) => {
      const av = fieldOf(a, sortKey);
      const bv = fieldOf(b, sortKey);
      let diff = typeof av === 'number' && typeof bv === 'number'
        ? av - bv
        : String(av).localeCompare(String(bv), 'zh');
      if (diff === 0) diff = (b.updated || 0) - (a.updated || 0);
      return diff * sortDir;
    });
  }

  function paintHeaders() {
    root.querySelectorAll('[data-sort]').forEach((button) => {
      const on = button.dataset.sort === sortKey;
      button.classList.toggle('on', on);
      button.querySelector('i').textContent = on ? (sortDir > 0 ? ' ↑' : ' ↓') : '';
    });
  }

  function rowsOf(notes) {
    source = notes;
    const rows = ordered(notes);
    const total = notes.length;
    countEl.textContent = query.trim() ? `${rows.length} / ${total} 篇` : `${total} 篇`;
    const lit = hooks.beaconAt?.();
    body.innerHTML = rows.length
      ? rows.map((note, index) => {
        const pos = parseShelf(note.shelf);
        const on = pos && lit && lit.x === pos.x && lit.y === pos.y && lit.z === pos.z;
        return `<tr data-index="${index}">
          <td>${note.order != null ? note.order : ''}</td>
          <td>${escapeHtml(note.cue || '')}</td>
          <td>${escapeHtml(note.title || '未命名')}${note.publicRef ? ' · 公开' : ''}</td>
          <td>${escapeHtml(where(note))}</td>
          <td>${storeName(note.store)}</td>
          <td>${pos ? `<button type="button" data-mark="${index}">${on ? '取消标亮' : '标亮'}</button>` : ''}</td>
        </tr>`;
      }).join('')
      : `<tr><td colspan="6">${total ? '没有符合的文稿' : '还没有写过的文稿'}</td></tr>`;
    body._rows = rows;
    paintHeaders();
  }

  function showTable() {
    reader.classList.add('hidden');
    historyEl.classList.toggle('hidden', mode !== 'history');
    tableWrap.classList.toggle('hidden', mode === 'history');
    searchEl.parentElement.classList.remove('hidden');
    wordNew.classList.toggle('hidden', mode === 'chain');
  }

  function whenText(at) {
    if (!at) return '';
    try {
      return new Date(at).toLocaleString('zh-CN', { hour12: false });
    } catch {
      return '';
    }
  }

  function paintHistory() {
    const needle = query.trim().toLowerCase();
    const rows = combinedHistory().filter((row) => {
      if (!needle) return true;
      const name = `${row.title || ''} ${row.cue || ''} ${row.type || ''} ${BLOCKS[row.type]?.name || ''}`.toLowerCase();
      return name.includes(needle) || `${row.x},${row.y},${row.z}`.includes(needle);
    });
    countEl.textContent = `${rows.length} 条`;
    const lit = hooks.beaconAt?.();
    historyEl.innerHTML = rows.length
      ? rows.map((row, index) => {
        const title = row.kind === 'block'
          ? (BLOCKS[row.type]?.name || row.title || row.type || '方块')
          : (row.title || row.cue || '未命名笔记');
        const kind = row.kind === 'block' ? '方块' : '笔记';
        const on = lit && lit.x === row.x && lit.y === row.y && lit.z === row.z;
        return `<div class="history-row" data-index="${index}">
          <div>
            <strong>${escapeHtml(title)}</strong>
            <span>${kind} · ${row.x}, ${row.y}, ${row.z} · ${escapeHtml(whenText(row.at))}</span>
          </div>
          <button type="button" data-beacon="${index}">${on ? '取消标亮' : '标亮'}</button>
        </div>`;
      }).join('')
      : '<p class="empty-notes">还没有放过方块或投放过笔记。</p>';
    historyEl._rows = rows;
  }

  function showNote(note) {
    reading = note;
    tableWrap.classList.add('hidden');
    historyEl.classList.add('hidden');
    searchEl.parentElement.classList.add('hidden');
    reader.classList.remove('hidden');
    const pos = parseShelf(note.shelf);
    palaceButton.classList.toggle('hidden', mode !== 'local' || !pos);
    const lit = hooks.beaconAt?.();
    beaconButton.classList.toggle('hidden', !pos);
    beaconButton.textContent = pos && lit && lit.x === pos.x && lit.y === pos.y && lit.z === pos.z ? '取消标亮' : '标亮这一格';
    wordImport.classList.toggle('hidden', mode === 'chain');
    root.querySelector('#docs-kicker').textContent = note.cue || '文稿';
    root.querySelector('#docs-title').textContent = note.title || '未命名';
    const publicBit = note.publicRef ? ` · 已公开` : '';
    root.querySelector('#docs-where').textContent = `${note.order != null ? `第 ${note.order} 处 · ` : ''}${where(note)} · ${storeName(note.store)}${publicBit}`;
    root.querySelector('#docs-body-read').innerHTML = sanitizeHtml(note.html || '<p>这篇还没有正文。</p>');
  }

  async function showChain() {
    const wallets = loadWallets();
    if (!wallets) {
      rowsOf([]);
      idle('先导入或创建一个账户，才能查看链上的文稿');
      return;
    }
    if (!chain) {
      busy = true;
      paint(0.1, '正在查找链上的最新索引');
      try {
        chain = await findManifest(wallets, ({ ratio, label }) => {
          if (mode === 'chain') paint(ratio, label);
        });
        if (mode === 'chain') idle(chain ? '' : '这个账户在链上还没有文稿');
      } catch (error) {
        chain = null;
        if (mode === 'chain') idle(error?.message || '链上的索引没有打开');
      } finally {
        busy = false;
      }
    }
    if (mode === 'chain') rowsOf(chain ? manifestRows(chain) : []);
  }

  function render() {
    showTable();
    root.querySelector('#docs-local').classList.toggle('on', mode === 'local');
    root.querySelector('#docs-chain').classList.toggle('on', mode === 'chain');
    root.querySelector('#docs-history').classList.toggle('on', mode === 'history');
    if (mode === 'history') {
      idle('标亮是可选的，不会自动立光柱');
      paintHistory();
      return;
    }
    if (mode === 'local') {
      idle('');
      rowsOf(hooks.localNotes());
      return;
    }
    showChain();
  }

  body.addEventListener('click', async (event) => {
    const mark = event.target.closest('[data-mark]');
    if (mark) {
      event.stopPropagation();
      const note = body._rows[Number(mark.dataset.mark)];
      const pos = parseShelf(note?.shelf);
      if (!pos) return;
      hooks.onBeacon?.(pos.x, pos.y, pos.z, note.title || note.cue || '这一格');
      rowsOf(source);
      return;
    }
    const row = event.target.closest('tr[data-index]');
    if (!row || busy) return;
    const note = body._rows[Number(row.dataset.index)];
    if (!note) return;
    if (note.html || !note.ref) {
      showNote(note);
      return;
    }
    busy = true;
    paint(null, '正在打开这一篇');
    try {
      const full = await readStored(note.store, note.ref);
      idle('');
      showNote({ ...note, ...full });
    } catch (error) {
      idle(error?.message || '这一篇没有打开');
    } finally {
      busy = false;
    }
  });

  root.querySelector('#docs-close').addEventListener('click', () => hooks.onClose());
  root.querySelector('#docs-back').addEventListener('click', () => {
    reading = null;
    showTable();
  });
  palaceButton.addEventListener('click', () => {
    if (reading) hooks.onOpenLocal(reading);
  });
  beaconButton.addEventListener('click', () => {
    if (!reading) return;
    const pos = parseShelf(reading.shelf);
    if (!pos) return;
    hooks.onBeacon?.(pos.x, pos.y, pos.z, reading.title || reading.cue || '这一格');
    showNote(reading);
  });
  wordExport.addEventListener('click', () => {
    if (reading) hooks.onExportWord?.(reading);
  });
  wordImport.addEventListener('click', () => wordReadFile.click());
  wordReadFile.addEventListener('change', async () => {
    const file = wordReadFile.files?.[0];
    wordReadFile.value = '';
    if (!file || !reading) return;
    idle('正在读 Word');
    try {
      const result = await hooks.onImportWord?.(file, reading);
      idle(result?.skipped ? 'Word 已放入，有少量格式被略过' : 'Word 已放进这篇');
      if (result?.note) showNote(result.note);
    } catch (error) {
      idle(error?.message || '只接受 .docx');
    }
  });
  wordNew.addEventListener('click', () => wordNewFile.click());
  wordNewFile.addEventListener('change', async () => {
    const file = wordNewFile.files?.[0];
    wordNewFile.value = '';
    if (!file) return;
    idle('正在读 Word');
    try {
      const result = await hooks.onImportWord?.(file);
      mode = 'local';
      render();
      if (result?.note) showNote(result.note);
      idle(result?.skipped ? 'Word 已导入成新文稿，有少量格式被略过' : 'Word 已导入成新文稿，在背包里');
    } catch (error) {
      idle(error?.message || '只接受 .docx');
    }
  });
  historyEl.addEventListener('click', (event) => {
    const mark = event.target.closest('[data-beacon]');
    const row = event.target.closest('.history-row');
    const item = historyEl._rows?.[Number((mark || row)?.dataset.index ?? mark?.dataset.beacon)];
    if (!item) return;
    if (mark) {
      event.stopPropagation();
      hooks.onBeacon?.(item.x, item.y, item.z, item.title || item.cue || BLOCKS[item.type]?.name || '这一格');
      paintHistory();
      return;
    }
    hooks.onGoto?.(item.x, item.y, item.z);
  });
  searchEl.addEventListener('input', () => {
    query = searchEl.value;
    rowsOf(source);
  });
  root.querySelectorAll('[data-sort]').forEach((button) => {
    button.addEventListener('click', () => {
      if (sortKey === button.dataset.sort) sortDir *= -1;
      else {
        sortKey = button.dataset.sort;
        sortDir = 1;
      }
      rowsOf(source);
    });
  });
  root.querySelector('#docs-local').addEventListener('click', () => {
    mode = 'local';
    render();
  });
  root.querySelector('#docs-chain').addEventListener('click', () => {
    mode = 'chain';
    render();
  });
  root.querySelector('#docs-history').addEventListener('click', () => {
    mode = 'history';
    render();
  });

  return {
    isOpen: () => !root.classList.contains('hidden'),
    open() {
      chain = null;
      mode = 'local';
      reading = null;
      root.classList.remove('hidden');
      render();
    },
    close() {
      root.classList.add('hidden');
      showTable();
    },
  };
}
