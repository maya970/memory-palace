import { sanitizeHtml, tableHtml, tsvToTable, VOCAB_TEMPLATE, isEmptyNote } from './notes.js';

function closest(node, selector) {
  const el = node?.nodeType === 1 ? node : node?.parentElement;
  return el?.closest?.(selector) || null;
}

export function createEditor(root, hooks) {
  const page = root.querySelector('#page');
  const title = root.querySelector('#note-title');
  const cue = root.querySelector('#note-cue');
  const order = root.querySelector('#note-order');
  const loc = root.querySelector('#book-loc');
  const status = root.querySelector('#book-status');
  const meta = root.querySelector('#book-meta');
  const tablePop = root.querySelector('#table-pop');
  const tableTools = root.querySelector('#table-tools');
  const fileInput = root.querySelector('#docx-input');
  let note = null;
  let savedRange = null;
  let timer = 0;

  function rememberRange() {
    const sel = document.getSelection();
    if (!sel || !sel.rangeCount) return;
    const node = sel.anchorNode;
    if (node && page.contains(node)) savedRange = sel.getRangeAt(0).cloneRange();
  }

  function restoreRange() {
    if (!savedRange) {
      page.focus();
      return;
    }
    const sel = document.getSelection();
    sel.removeAllRanges();
    sel.addRange(savedRange);
  }

  function wordCount() {
    const text = page.innerText.replace(/\s+/g, '');
    return text.length;
  }

  function refreshMeta() {
    if (!note) return;
    const when = new Date(note.updated);
    const stamp = `${when.getMonth() + 1}月${when.getDate()}日 ${String(when.getHours()).padStart(2, '0')}:${String(when.getMinutes()).padStart(2, '0')}`;
    meta.textContent = `${wordCount()} 字 · ${stamp}`;
    const cell = closest(document.getSelection()?.anchorNode, 'td, th');
    tableTools.classList.toggle('hidden', !cell || !page.contains(cell));
  }

  function pull() {
    if (!note) return;
    note.title = title.value.trim().slice(0, 40);
    note.cue = cue.value.trim().slice(0, 32);
    const rawOrder = order.value.trim();
    note.order = rawOrder === '' ? null : Math.max(1, Math.min(999, Number(rawOrder) || 1));
    note.html = sanitizeHtml(page.innerHTML);
    note.updated = Date.now();
  }

  function scheduleSave() {
    status.textContent = '正在记住…';
    window.clearTimeout(timer);
    timer = window.setTimeout(() => {
      pull();
      hooks.onChange(note);
      status.textContent = '已留在这台浏览器里';
      refreshMeta();
    }, 280);
  }

  function exec(command, value = null) {
    restoreRange();
    page.focus();
    document.execCommand('styleWithCSS', false, true);
    document.execCommand(command, false, value);
    rememberRange();
    scheduleSave();
  }

  function formatBlock(tag) {
    restoreRange();
    page.focus();
    const applied = document.execCommand('formatBlock', false, tag);
    if (!applied) document.execCommand('formatBlock', false, `<${tag}>`);
    rememberRange();
    scheduleSave();
  }

  function insertHtml(html) {
    restoreRange();
    page.focus();
    document.execCommand('insertHTML', false, html);
    rememberRange();
    scheduleSave();
  }

  function currentCell() {
    return closest(savedRange?.startContainer || document.getSelection()?.anchorNode, 'td, th');
  }

  function addRow() {
    const cell = currentCell();
    const row = cell?.parentElement;
    if (!row) return;
    const copy = row.cloneNode(true);
    copy.querySelectorAll('th, td').forEach((td) => { td.innerHTML = '<br>'; });
    row.after(copy);
    scheduleSave();
  }

  function addCol() {
    const cell = currentCell();
    const table = cell?.closest('table');
    if (!table || !cell) return;
    const index = [...cell.parentElement.children].indexOf(cell);
    table.querySelectorAll('tr').forEach((row) => {
      const ref = row.children[index];
      const td = document.createElement(ref?.tagName === 'TH' ? 'th' : 'td');
      td.innerHTML = '<br>';
      if (ref) ref.after(td);
      else row.append(td);
    });
    scheduleSave();
  }

  function deleteRow() {
    const cell = currentCell();
    const row = cell?.parentElement;
    const table = row?.closest('table');
    if (!row || !table) return;
    if (table.querySelectorAll('tr').length <= 1) table.remove();
    else row.remove();
    scheduleSave();
  }

  function deleteCol() {
    const cell = currentCell();
    if (!cell) return;
    const index = [...cell.parentElement.children].indexOf(cell);
    const table = cell.closest('table');
    table.querySelectorAll('tr').forEach((row) => row.children[index]?.remove());
    const empty = [...table.querySelectorAll('tr')].every((row) => row.children.length === 0);
    if (empty) table.remove();
    scheduleSave();
  }

  root.querySelector('#toolbar').addEventListener('mousedown', (event) => {
    if (event.target.closest('button')) event.preventDefault();
  });

  root.querySelector('#toolbar').addEventListener('click', (event) => {
    const button = event.target.closest('button');
    if (!button) return;
    const cmd = button.dataset.cmd;
    if (cmd === 'bold') exec('bold');
    else if (cmd === 'italic') exec('italic');
    else if (cmd === 'underline') exec('underline');
    else if (cmd === 'strike') exec('strikeThrough');
    else if (cmd === 'undo') exec('undo');
    else if (cmd === 'redo') exec('redo');
    else if (cmd === 'clear') exec('removeFormat');
    else if (cmd === 'left') exec('justifyLeft');
    else if (cmd === 'center') exec('justifyCenter');
    else if (cmd === 'right') exec('justifyRight');
    else if (cmd === 'ul') exec('insertUnorderedList');
    else if (cmd === 'ol') exec('insertOrderedList');
    else if (cmd === 'p') formatBlock('P');
    else if (cmd === 'h1') formatBlock('H1');
    else if (cmd === 'h2') formatBlock('H2');
    else if (cmd === 'quote') formatBlock('BLOCKQUOTE');
    else if (cmd === 'hr') exec('insertHorizontalRule');
    else if (cmd === 'table') tablePop.classList.toggle('hidden');
    else if (cmd === 'template') insertHtml(VOCAB_TEMPLATE);
    else if (cmd === 'import') fileInput.click();
    else if (cmd === 'export') hooks.onExportWord(snapshot());
  });

  root.querySelector('#fore-color').addEventListener('input', (event) => {
    exec('foreColor', event.target.value);
  });
  root.querySelector('#back-color').addEventListener('input', (event) => {
    restoreRange();
    page.focus();
    const applied = document.execCommand('hiliteColor', false, event.target.value);
    if (!applied) document.execCommand('backColor', false, event.target.value);
    rememberRange();
    scheduleSave();
  });

  root.querySelector('#table-insert').addEventListener('click', () => {
    const rows = Number(root.querySelector('#table-rows').value) || 3;
    const cols = Number(root.querySelector('#table-cols').value) || 3;
    const header = root.querySelector('#table-header').checked;
    insertHtml(tableHtml(rows, cols, header));
    tablePop.classList.add('hidden');
  });

  tableTools.addEventListener('mousedown', (event) => {
    if (event.target.closest('button')) event.preventDefault();
  });
  tableTools.addEventListener('click', (event) => {
    const action = event.target.closest('button')?.dataset.table;
    if (action === 'add-row') addRow();
    if (action === 'add-col') addCol();
    if (action === 'del-row') deleteRow();
    if (action === 'del-col') deleteCol();
    if (action === 'del') {
      currentCell()?.closest('table')?.remove();
      scheduleSave();
    }
  });

  page.addEventListener('input', scheduleSave);
  title.addEventListener('input', scheduleSave);
  cue.addEventListener('input', scheduleSave);
  order.addEventListener('input', scheduleSave);
  page.addEventListener('keyup', refreshMeta);
  page.addEventListener('mouseup', () => {
    rememberRange();
    refreshMeta();
  });
  document.addEventListener('selectionchange', () => {
    const sel = document.getSelection();
    if (!sel?.anchorNode || !page.contains(sel.anchorNode)) return;
    rememberRange();
    refreshMeta();
  });

  page.addEventListener('paste', (event) => {
    const html = event.clipboardData?.getData('text/html') || '';
    const text = event.clipboardData?.getData('text/plain') || '';
    if (!html && text.includes('\t')) {
      event.preventDefault();
      insertHtml(tsvToTable(text));
      return;
    }
    if (html) {
      event.preventDefault();
      insertHtml(sanitizeHtml(html));
    }
  });

  page.addEventListener('keydown', (event) => {
    if (event.key !== 'Tab' || event.isComposing) return;
    event.preventDefault();
    event.stopPropagation();
    const cell = currentCell();
    if (!cell) {
      insertHtml('&nbsp;&nbsp;&nbsp;&nbsp;');
      return;
    }
    const cells = [...page.querySelectorAll('td, th')];
    const index = cells.indexOf(cell);
    const next = event.shiftKey ? cells[index - 1] : cells[index + 1];
    if (!next) return;
    const range = document.createRange();
    range.selectNodeContents(next);
    range.collapse(true);
    const sel = document.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    savedRange = range.cloneRange();
  });

  fileInput.addEventListener('change', async () => {
    const file = fileInput.files?.[0];
    fileInput.value = '';
    if (!file) return;
    status.textContent = '正在读 Word…';
    try {
      const mod = await import('mammoth');
      const mammoth = mod.default ?? mod;
      const arrayBuffer = await file.arrayBuffer();
      const result = await mammoth.convertToHtml({ arrayBuffer });
      insertHtml(sanitizeHtml(result.value));
      hooks.onToast(result.messages?.length ? 'Word 已放入，有少量格式被略过' : 'Word 已放进这格书架');
    } catch {
      status.textContent = '没能读开这个文件';
      hooks.onToast('只接受 .docx');
    }
  });

  root.querySelector('#book-close').addEventListener('click', () => hooks.onClose());
  root.querySelector('#note-detach').addEventListener('click', () => {
    pull();
    hooks.onDetach(note);
  });

  function snapshot() {
    pull();
    return note;
  }

  return {
    isOpen: () => !root.classList.contains('hidden'),
    note: () => note,
    open(next, location) {
      note = next;
      title.value = next.title || '';
      cue.value = next.cue || '';
      order.value = next.order == null ? '' : String(next.order);
      page.innerHTML = sanitizeHtml(next.html || '<p><br></p>');
      loc.textContent = location;
      root.classList.remove('hidden');
      tablePop.classList.add('hidden');
      status.textContent = '写下来就会记住';
      refreshMeta();
      window.setTimeout(() => {
        if (!(next.title || '').trim()) title.focus();
        else page.focus();
      }, 30);
    },
    close() {
      if (note) pull();
      root.classList.add('hidden');
      return note;
    },
    isEmpty: () => (note ? isEmptyNote({ ...note, title: title.value, cue: cue.value, order: order.value, html: page.innerHTML }) : true),
  };
}
