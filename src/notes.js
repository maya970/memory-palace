const ALLOW = new Set([
  'P', 'BR', 'B', 'STRONG', 'I', 'EM', 'U', 'S', 'STRIKE', 'DEL',
  'H1', 'H2', 'H3', 'UL', 'OL', 'LI', 'TABLE', 'THEAD', 'TBODY', 'TR',
  'TD', 'TH', 'BLOCKQUOTE', 'SPAN', 'A', 'SUB', 'SUP', 'HR', 'DIV',
]);

function filterStyle(style) {
  if (!style) return '';
  const keep = [];
  for (const rule of style.split(';')) {
    const idx = rule.indexOf(':');
    if (idx < 0) continue;
    const key = rule.slice(0, idx).trim().toLowerCase();
    const val = rule.slice(idx + 1).trim();
    if (!/^(color|background-color|text-align|font-weight|font-style|text-decoration)$/.test(key)) continue;
    if (/url\(|expression|javascript/i.test(val)) continue;
    keep.push(`${key}: ${val}`);
  }
  return keep.join('; ');
}

function cleanChildren(node) {
  const out = document.createDocumentFragment();
  node.childNodes.forEach((child) => {
    if (child.nodeType === Node.TEXT_NODE) {
      out.append(document.createTextNode(child.textContent));
      return;
    }
    if (child.nodeType !== Node.ELEMENT_NODE) return;
    const tag = child.tagName;
    if (['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'LINK', 'META'].includes(tag)) return;
    const kids = cleanChildren(child);
    if (!ALLOW.has(tag)) {
      out.append(kids);
      return;
    }
    const el = document.createElement(tag.toLowerCase());
    if (tag === 'A') {
      const href = child.getAttribute('href') || '';
      if (/^(https?:|mailto:)/i.test(href)) {
        el.setAttribute('href', href);
        el.setAttribute('target', '_blank');
        el.setAttribute('rel', 'noreferrer');
      }
    }
    if (tag === 'TD' || tag === 'TH') {
      const colspan = Number.parseInt(child.getAttribute('colspan') || '', 10);
      const rowspan = Number.parseInt(child.getAttribute('rowspan') || '', 10);
      if (colspan > 1) el.setAttribute('colspan', String(Math.min(12, colspan)));
      if (rowspan > 1) el.setAttribute('rowspan', String(Math.min(40, rowspan)));
    }
    const style = filterStyle(child.getAttribute('style') || '');
    if (style) el.setAttribute('style', style);
    el.append(kids);
    out.append(el);
  });
  return out;
}

export function sanitizeHtml(html) {
  const doc = new DOMParser().parseFromString(String(html || ''), 'text/html');
  const holder = document.createElement('div');
  holder.append(cleanChildren(doc.body));
  return holder.innerHTML || '<p><br></p>';
}

export function plainText(html) {
  const holder = document.createElement('div');
  holder.innerHTML = html || '';
  return (holder.textContent || '').replace(/\s+/g, ' ').trim();
}

export function excerpt(html, limit = 52) {
  const text = plainText(html);
  if (text.length <= limit) return text;
  return `${text.slice(0, limit)}…`;
}

export function isEmptyNote(note) {
  if (!note) return true;
  if ((note.title || '').trim()) return false;
  if ((note.cue || '').trim()) return false;
  if (note.order != null && note.order !== '') return false;
  if (/<table/i.test(note.html || '')) return false;
  return plainText(note.html) === '';
}

export function createNote(shelf = null) {
  return {
    id: crypto.randomUUID(),
    shelf,
    title: '',
    cue: '',
    order: null,
    html: '<p><br></p>',
    updated: Date.now(),
  };
}

export function sortNotes(notes) {
  return [...notes].sort((a, b) => {
    const ao = a.order == null || a.order === '' ? Infinity : Number(a.order);
    const bo = b.order == null || b.order === '' ? Infinity : Number(b.order);
    if (ao !== bo) return ao - bo;
    return (b.updated || 0) - (a.updated || 0);
  });
}

export function normalizeNote(raw) {
  const note = {
    id: typeof raw?.id === 'string' && raw.id ? raw.id : crypto.randomUUID(),
    shelf: typeof raw?.shelf === 'string' ? raw.shelf : null,
    title: String(raw?.title || '').slice(0, 40),
    cue: String(raw?.cue || '').slice(0, 32),
    order: raw?.order == null || raw.order === '' ? null : Math.max(1, Math.min(999, Number(raw.order) || 1)),
    html: sanitizeHtml(raw?.html || '<p><br></p>'),
    updated: Number(raw?.updated) || Date.now(),
  };
  if (!Number.isFinite(note.order)) note.order = null;
  return note;
}

export function regionName(x, z) {
  const ns = z <= -6 ? '北' : z >= 6 ? '南' : '';
  const ew = x >= 6 ? '东' : x <= -6 ? '西' : '';
  if (!ns && !ew) return '十字路口';
  if (!ns) return `${ew}侧`;
  return `${ew}${ns}`;
}

export function shelfKey(x, y, z) {
  return `${x},${y},${z}`;
}

export function parseShelf(key) {
  if (!key) return null;
  const [x, y, z] = key.split(',').map(Number);
  if (![x, y, z].every(Number.isFinite)) return null;
  return { x, y, z };
}

export function tableHtml(rows, cols, header) {
  const safeRows = Math.max(1, Math.min(20, rows));
  const safeCols = Math.max(1, Math.min(8, cols));
  let html = '<table><tbody>';
  for (let r = 0; r < safeRows; r++) {
    html += '<tr>';
    for (let c = 0; c < safeCols; c++) {
      const tag = header && r === 0 ? 'th' : 'td';
      html += `<${tag}><br></${tag}>`;
    }
    html += '</tr>';
  }
  html += '</tbody></table><p><br></p>';
  return html;
}

export function tsvToTable(text) {
  const lines = text.replace(/\r/g, '').split('\n').filter((line) => line.length);
  if (!lines.length) return '';
  const cells = lines.map((line) => line.split('\t'));
  const cols = Math.max(...cells.map((row) => row.length));
  let html = '<table><tbody>';
  cells.forEach((row, r) => {
    html += '<tr>';
    for (let c = 0; c < cols; c++) {
      const tag = r === 0 ? 'th' : 'td';
      const value = (row[c] || '').replace(/[&<>]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[ch]));
      html += `<${tag}>${value || '<br>'}</${tag}>`;
    }
    html += '</tr>';
  });
  html += '</tbody></table><p><br></p>';
  return html;
}

export const VOCAB_TEMPLATE = `<table><tbody>
<tr><th>脑中的画面</th><th>要记住的</th><th>为什么连得上</th></tr>
<tr><td><br></td><td><br></td><td><br></td></tr>
<tr><td><br></td><td><br></td><td><br></td></tr>
<tr><td><br></td><td><br></td><td><br></td></tr>
</tbody></table><p><br></p>`;
