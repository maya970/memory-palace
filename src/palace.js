import { createNote } from './notes.js';

export const ISLAND_MIN = -32;
export const ISLAND_MAX = 31;

export const SPAWN = { x: 0.5, y: 1, z: 26.5, yaw: 0, pitch: -0.08 };

const HOW_TO = `
<p>这是一本要走路才能翻开的记事本。没有饥饿，没有怪物，只有方块，和你放进书架里的东西。</p>
<p>每一格书架是一个记忆位点。打开它，写下三样东西：</p>
<ol>
<li><b>线索词</b>：一个夸张、鲜艳、你能看见的画面</li>
<li><b>标题</b>：这格书架到底在记什么</li>
<li><b>正文</b>：像在 Word 里那样写。可以加粗、分栏标题、列表，也可以插入表格</li>
</ol>
<p>左手拆，右手放。对准书架按 <b>F</b>，或者直接右键，就会打开这本笔记。按住 Shift 再右键，才会把方块放在书架表面上。</p>
<p>按 <b>E</b> 打开背包，把方块拖进物品栏再放置。拆掉写过字的书架，整格连同笔记一起进背包，再放回去还是这一本。</p>
`.trim();

const METHOD = `
<p>人记得住地点，不太记得住清单。所以把清单放进地点里。</p>
<p>先走一条固定的路。每个拐角、每块颜色、每一格书架，只放一件事。回想的时候把这条路再走一遍，事情会按你路过的顺序冒出来。</p>
<h2>怎么放才记得住</h2>
<ul>
<li>一条路线只记一个主题</li>
<li>线索词要能看见。用「着火的小提琴」，不用「音乐史」</li>
<li>给书架编上行走顺序，回想时按这个顺序再走一遍</li>
<li>用羊毛给不同主题的房间铺上不同的颜色</li>
</ul>
<p>从这格往东，红地毯上有一张表示范例。看完往西，是怎样新开一间房。北面那格是留给你的。</p>
`.trim();

const TABLE_DEMO = `
<p>线索要能看见。下面这张表是一组单词，照着改成你自己的就行。</p>
<table>
<tbody>
<tr><th>脑中的画面</th><th>要记住的</th><th>为什么连得上</th></tr>
<tr><td>红苹果滚进键盘</td><td>apple</td><td>又红又圆，撞出一声响</td></tr>
<tr><td>香蕉皮滑在南门口</td><td>banana</td><td>门口是这条路的起点</td></tr>
<tr><td>一只猫坐在书架顶上</td><td>cat</td><td>你抬头就能看见它</td></tr>
</tbody>
</table>
<p>工具栏可以插入表格，也能一键放下这样的词表。从 Word、Excel 复制过来会保持表格。已经写好的文稿，用「导入 Word」放进这格书架。</p>
`.trim();

const ROOM_DEMO = `
<h2>新主题，就新开一间房</h2>
<p>不要把所有笔记堆在同一面墙上。给它一间自己的房间，走路时才分得清。</p>
<ol>
<li>用一种没人用过的羊毛铺地</li>
<li>沿墙放上书架，一格只放一个知识点</li>
<li>打开笔记，给它们编连续的序号</li>
<li>用线索词把房间画进脑子：蓝墨水、漏雨的窗、半扇门</li>
</ol>
<blockquote>房间是分类，路线是顺序，线索词是挂钩。</blockquote>
<p>拆掉书架时，笔记跟着这格书架进背包。放到别处，还是原来那一本。</p>
`.trim();

const YOURS = `
<p>这格是空的，留给你自己的第一则记忆。</p>
<p>先把线索词换成一个你忘不了的画面，再写下你真正想记住的东西。可以是一段话，也可以是一张表。</p>
`.trim();

export const STATIONS = [
  {
    x: 0, y: 1, z: 12, wool: 'wool_white',
    order: 1, title: '怎么使用', cue: '一扇敞开的木门', html: HOW_TO,
  },
  {
    x: 0, y: 1, z: 0,
    order: 2, title: '记忆宫殿', cue: '脚下的十字路口', html: METHOD,
  },
  {
    x: 12, y: 1, z: 0, wool: 'wool_red',
    order: 3, title: '用表格来记', cue: '一颗滚烫的红苹果', html: TABLE_DEMO,
  },
  {
    x: -12, y: 1, z: 0, wool: 'wool_blue',
    order: 4, title: '新开一间房', cue: '一瓶打翻的蓝墨水', html: ROOM_DEMO,
  },
  {
    x: 0, y: 1, z: -12, wool: 'wool_yellow',
    order: 5, title: '留给你', cue: '一盏还没点的灯', html: YOURS,
  },
];

function tree(set, x, z) {
  for (let y = 1; y <= 4; y++) set(x, y, z, 'log');
  for (let y = 3; y <= 5; y++) {
    const radius = y === 5 ? 1 : 2;
    for (let dz = -radius; dz <= radius; dz++) {
      for (let dx = -radius; dx <= radius; dx++) {
        if (dx === 0 && dz === 0 && y < 5) continue;
        if (Math.abs(dx) === radius && Math.abs(dz) === radius) continue;
        set(x + dx, y, z + dz, 'wool_green');
      }
    }
  }
}

function pad(set, x, z, wool) {
  for (let dz = -1; dz <= 1; dz++) {
    for (let dx = -1; dx <= 1; dx++) set(x + dx, 0, z + dz, wool);
  }
}

export function buildBase(set) {
  for (let z = ISLAND_MIN; z <= ISLAND_MAX; z++) {
    for (let x = ISLAND_MIN; x <= ISLAND_MAX; x++) {
      set(x, 0, z, 'grass');
      set(x, -1, z, 'dirt');
      set(x, -2, z, 'dirt');
      set(x, -3, z, 'bedrock');
    }
  }

  for (let i = -22; i <= 22; i++) {
    for (let w = -1; w <= 1; w++) {
      set(i, 0, w, 'stone');
      set(w, 0, i, 'stone');
    }
  }
  for (let z = 14; z <= 24; z++) {
    for (let x = -1; x <= 1; x++) set(x, 0, z, 'stone');
  }

  for (let i = -14; i <= 14; i++) {
    if (Math.abs(i) <= 1) continue;
    const post = Math.abs(i) % 4 === 0;
    const glass = Math.abs(i) % 5 === 0;
    const kind = glass ? 'glass' : 'planks';
    for (const edge of [-14, 14]) {
      set(i, 1, edge, kind);
      set(edge, 1, i, kind);
      if (post) {
        set(i, 2, edge, 'planks');
        set(edge, 2, i, 'planks');
      }
    }
  }

  tree(set, 22, 22);
  tree(set, 22, -22);
  tree(set, -22, 22);
  tree(set, -22, -22);

  for (const station of STATIONS) {
    if (station.wool) pad(set, station.x, station.z, station.wool);
    set(station.x, station.y, station.z, 'bookshelf');
  }
}

export function starterNotes() {
  return STATIONS.map((station) => {
    const note = createNote(`${station.x},${station.y},${station.z}`);
    note.title = station.title;
    note.cue = station.cue;
    note.order = station.order;
    note.html = station.html;
    note.updated = Date.now();
    return note;
  });
}
