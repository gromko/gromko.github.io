(() => {
  'use strict';

  const LEVELS = window.KRYSTALIA_LEVELS || [];
  const SAVE_KEY = 'krystalia-sokoban-v1';
  const DIRS = {
    up: { x: 0, y: -1 },
    down: { x: 0, y: 1 },
    left: { x: -1, y: 0 },
    right: { x: 1, y: 0 },
  };
  const DIR_KEYS = Object.keys(DIRS);
  const KEY_CODES = {
    ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
    KeyW: 'up', KeyS: 'down', KeyA: 'left', KeyD: 'right',
  };
  const KEY_LETTERS = {
    w: 'up', s: 'down', a: 'left', d: 'right',
    ц: 'up', і: 'down', ф: 'left', в: 'right',
  };
  const $ = (id) => document.getElementById(id);
  const clamp = (v, min = 0, max = 1) => Math.min(max, Math.max(min, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = (t) => t * t * (3 - 2 * t);
  const moveEase = (t) => t; // лінійно: рух починається одразу, без розгону
  const keyOf = (x, y) => y * 100 + x;
  const pad2 = (n) => String(n).padStart(2, '0');
  const formatTime = (ms) => {
    const total = Math.max(0, Math.floor(ms / 1000));
    return `${pad2(Math.floor(total / 60))}:${pad2(total % 60)}`;
  };
  const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
  const hash = (x, y) => {
    let n = (x * 374761393 + y * 668265263) | 0;
    n = ((n ^ (n >> 13)) * 1274126177) | 0;
    return ((n ^ (n >> 16)) >>> 0) / 4294967296;
  };

  /* ── DOM ─────────────────────────────────────────────────────── */
  const canvas = $('board');
  const ctx = canvas.getContext('2d');
  const wrap = $('canvasWrap');
  const levelNumberEl = $('levelNumber');
  const levelNameEl = $('levelName');
  const stageRoomLabel = $('stageRoomLabel');
  const timeText = $('timeText');
  const movesText = $('movesText');
  const placedText = $('placedText');
  const crystalsText = $('crystalsText');
  const pushesText = $('pushesText');
  const bestText = $('bestText');
  const parNote = $('parNote');
  const placedBar = $('placedBar');
  const undoBtn = $('undoBtn');
  const restartBtn = $('restartBtn');
  const soundBtn = $('soundBtn');
  const levelsBtn = $('levelsBtn');
  const helpBtn = $('helpBtn');
  const levelsModal = $('levelsModal');
  const helpModal = $('helpModal');
  const winModal = $('winModal');
  const finalModal = $('finalModal');
  const levelsGrid = $('levelsGrid');
  const toastEl = $('toast');

  /* ── crystal sprite ──────────────────────────────────────────── */
  const crystalSprite = new Image();
  let crystalSpriteReady = false;
  crystalSprite.decoding = 'async';
  crystalSprite.addEventListener('load', () => { crystalSpriteReady = true; });
  crystalSprite.addEventListener('error', () => { crystalSpriteReady = false; });
  crystalSprite.src = 'images/diamond.png';

  /* ── hero sprite sheet ───────────────────────────────────────── */
  // 768×512: 2 ряди × 6 кадрів, кадр 128×256.
  // Верхній ряд — рух без кристала, нижній — поштовх кристала.
  // Кадри 0–2 — персонаж повернений праворуч, 3–5 — вгору.
  const HERO_FRAME_W = 128;
  const HERO_FRAME_H = 256;
  const heroSheet = new Image();
  let heroSheetReady = false;
  heroSheet.decoding = 'async';
  heroSheet.addEventListener('load', () => { heroSheetReady = true; });
  heroSheet.addEventListener('error', () => { heroSheetReady = false; });
  heroSheet.src = 'images/spritesheet.png';

  // 512×256: 4 кадри 128×256 в одному ряді.
  // Кадр 0 — персонаж стоїть обличчям уперед, кадри 1–3 — хода вниз.
  const heroFrontSheet = new Image();
  let heroFrontSheetReady = false;
  heroFrontSheet.decoding = 'async';
  heroFrontSheet.addEventListener('load', () => { heroFrontSheetReady = true; });
  heroFrontSheet.addEventListener('error', () => { heroFrontSheetReady = false; });
  heroFrontSheet.src = 'images/spritesheet0.png';

  /* ── save ────────────────────────────────────────────────────── */
  function loadSave() {
    const base = { sound: true, unlocked: 1, best: {} };
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === 'object') {
          if (typeof parsed.sound === 'boolean') base.sound = parsed.sound;
          if (Number.isFinite(parsed.unlocked)) base.unlocked = parsed.unlocked;
          if (parsed.best && typeof parsed.best === 'object') base.best = parsed.best;
        }
      }
    } catch (err) { /* приватний режим — просто без збереження */ }
    base.unlocked = clamp(base.unlocked, 1, LEVELS.length || 1);
    return base;
  }
  let save = loadSave();
  function persist() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (err) { /* ignore */ }
  }

  /* ── game state ──────────────────────────────────────────────── */
  const G = {
    levelIndex: 0,
    level: null,
    walls: new Set(),
    goals: new Set(),
    boxes: [],
    player: { x: 1, y: 1 },
    facing: 'down',
    moves: 0,
    pushes: 0,
    history: [],
    anim: null,
    bump: null,
    held: [],
    queueDir: null,
    won: false,
    winScheduled: false,
    lastRecord: false,
    elapsed: 0,
    runningSince: null,
    shakeUntil: 0,
    shakeDur: 200,
    shakeMag: 0,
    flashUntil: 0,
    particles: [],
    time: 0,
    lastFrame: performance.now(),
    lastClockText: '',
    layout: { tile: 40, w: 400, h: 400, dpr: 1 },
    roomRect: null,
    staticCanvas: document.createElement('canvas'),
    staticCtx: null,
    reducedMotion: window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  };

  const isWall = (x, y) => {
    if (!G.level || x < 0 || y < 0 || x >= G.level.cols || y >= G.level.rows) return true;
    return G.walls.has(keyOf(x, y));
  };
  const isFloor = (x, y) => {
    if (!G.level || x < 0 || y < 0 || x >= G.level.cols || y >= G.level.rows) return false;
    const row = G.level.grid[y];
    const c = row ? row[x] : undefined;
    return c !== undefined && c !== '#' && c !== ' ';
  };
  const inRoom = (x, y) => {
    const r = G.roomRect;
    return !!r && x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h;
  };
  const boxIndexAt = (x, y) => G.boxes.findIndex((b) => b.x === x && b.y === y);
  const placedCount = () => G.boxes.reduce((n, b) => n + (G.goals.has(keyOf(b.x, b.y)) ? 1 : 0), 0);
  const isModalOpen = () => Array.from(document.querySelectorAll('.modal')).some((m) => !m.hidden);
  const nowMs = () => performance.now();

  function parseLevel(level) {
    const walls = new Set();
    const goals = new Set();
    const boxes = [];
    let player = { x: 1, y: 1 };
    let cols = 0;
    for (let y = 0; y < level.grid.length; y++) {
      cols = Math.max(cols, level.grid[y].length);
      for (let x = 0; x < level.grid[y].length; x++) {
        const c = level.grid[y][x];
        const k = keyOf(x, y);
        if (c === '#') walls.add(k);
        if (c === 'o' || c === '*' || c === '+') goals.add(k);
        if (c === '$' || c === '*') boxes.push({ x, y });
        if (c === '@' || c === '+') player = { x, y };
      }
    }
    return { walls, goals, boxes, player, cols, rows: level.grid.length };
  }

  function getElapsed(now = nowMs()) {
    return G.elapsed + (G.runningSince != null ? Math.max(0, now - G.runningSince) : 0);
  }
  function pauseTimer(now = nowMs()) {
    if (G.runningSince != null) {
      G.elapsed += Math.max(0, now - G.runningSince);
      G.runningSince = null;
    }
  }
  function resumeTimer(now = nowMs()) {
    if (G.level && !G.won && G.runningSince == null && !isModalOpen()) G.runningSince = now;
  }

  /* ── level loading ───────────────────────────────────────────── */
  function loadLevel(index) {
    closeAllModals();
    G.levelIndex = clamp(index, 0, LEVELS.length - 1);
    const source = LEVELS[G.levelIndex];
    const parsed = parseLevel(source);
    G.level = { ...source, cols: parsed.cols, rows: parsed.rows };
    G.walls = parsed.walls;
    G.goals = parsed.goals;
    G.boxes = parsed.boxes.map((b) => ({ x: b.x, y: b.y }));
    G.player = { ...parsed.player };
    G.roomRect = source.room || null;
    G.facing = 'down';
    G.moves = 0;
    G.pushes = 0;
    G.history = [];
    G.anim = null;
    G.bump = null;
    G.held = [];
    G.queueDir = null;
    G.won = false;
    G.winScheduled = false;
    G.lastRecord = false;
    G.elapsed = 0;
    G.runningSince = null;
    G.particles = [];
    G.flashUntil = 0;
    G.lastClockText = '';
    G.lastFrame = nowMs();
    updateLevelUI();
    updateHud();
    layoutBoard(true);
    resumeTimer();
    requestAnimationFrame(() => { layoutBoard(); });
  }

  function updateLevelUI() {
    const source = LEVELS[G.levelIndex];
    levelNumberEl.textContent = pad2(G.levelIndex + 1);
    levelNameEl.textContent = source.name;
    stageRoomLabel.textContent = `зала ${pad2(G.levelIndex + 1)}`;
    parNote.textContent = `Мінімум: ${source.par} поштовхів`;
    document.title = `Кришталія — ${source.name}`;
  }

  /* ── layout ──────────────────────────────────────────────────── */
  let layoutRaf = 0;
  function scheduleLayout() {
    if (layoutRaf) return;
    layoutRaf = requestAnimationFrame(() => {
      layoutRaf = 0;
      layoutBoard();
    });
  }

  function layoutBoard(force = false) {
    if (!G.level || !wrap) return;
    const rect = wrap.getBoundingClientRect();
    const availW = Math.max(140, rect.width - 24);
    const availH = Math.max(140, rect.height - 24);
    const tile = Math.max(16, Math.min(availW / G.level.cols, availH / G.level.rows, 78));
    const w = tile * G.level.cols;
    const h = tile * G.level.rows;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const pxW = Math.round(w * dpr);
    const pxH = Math.round(h * dpr);
    const prev = G.layout;
    if (!force && prev && canvas.width === pxW && canvas.height === pxH
      && Math.abs(prev.w - w) < 0.5 && Math.abs(prev.h - h) < 0.5) {
      return;
    }
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    canvas.width = pxW;
    canvas.height = pxH;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    G.layout = { tile, w, h, dpr };
    buildStatic();
  }

  /* ── static board rendering ──────────────────────────────────── */
  function roundRect(c, x, y, w, h, r) {
    const rr = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
    c.beginPath();
    c.moveTo(x + rr, y);
    c.arcTo(x + w, y, x + w, y + h, rr);
    c.arcTo(x + w, y + h, x, y + h, rr);
    c.arcTo(x, y + h, x, y, rr);
    c.arcTo(x, y, x + w, y, rr);
    c.closePath();
  }

  function buildStatic() {
    const { tile, w, h, dpr } = G.layout;
    const sc = G.staticCanvas;
    sc.width = canvas.width;
    sc.height = canvas.height;
    const s = sc.getContext('2d');
    s.setTransform(dpr, 0, 0, dpr, 0, 0);
    s.clearRect(0, 0, w, h);
    G.staticCtx = s;

    const bg = s.createRadialGradient(w / 2, h * 0.44, 0, w / 2, h * 0.44, Math.max(w, h) * 0.75);
    bg.addColorStop(0, 'rgba(17, 31, 54, 0.94)');
    bg.addColorStop(0.65, 'rgba(8, 15, 28, 0.96)');
    bg.addColorStop(1, 'rgba(3, 6, 12, 0.98)');
    s.fillStyle = bg;
    s.fillRect(0, 0, w, h);

    // зорі у порожнечі
    for (let i = 0; i < 110; i++) {
      const sx = hash(i + 3, 11) * w;
      const sy = hash(7, i + 19) * h;
      const a = 0.05 + hash(i, 31) * 0.22;
      s.fillStyle = `rgba(160, 210, 255, ${a})`;
      s.beginPath();
      s.arc(sx, sy, Math.max(0.5, hash(i, 5) * 1.4), 0, Math.PI * 2);
      s.fill();
    }

    for (let y = 0; y < G.level.rows; y++) {
      for (let x = 0; x < G.level.cols; x++) {
        if (isFloor(x, y)) drawFloor(s, x, y);
      }
    }
    drawRoomBoundaries(s);
    G.goals.forEach((k) => drawSocket(s, k % 100, Math.floor(k / 100)));
    for (let y = 0; y < G.level.rows; y++) {
      for (let x = 0; x < G.level.cols; x++) {
        if (isWall(x, y)) drawWall(s, x, y);
      }
    }
    drawThresholds(s);
    void tile;
  }

  function drawFloor(s, x, y) {
    const t = G.layout.tile;
    const px = x * t;
    const py = y * t;
    const room = inRoom(x, y);
    const h = hash(x, y);
    const pad = Math.max(0.6, t * 0.014);
    const radius = Math.max(2, t * 0.075);

    const g = s.createLinearGradient(px, py, room ? px + t : px, py + t);
    if (room) {
      g.addColorStop(0, h > 0.5 ? '#0d2c31' : '#0b272d');
      g.addColorStop(1, h > 0.5 ? '#071b23' : '#081d25');
    } else {
      g.addColorStop(0, h > 0.55 ? '#131d31' : '#111a2c');
      g.addColorStop(1, h > 0.55 ? '#0a1220' : '#0b1322');
    }
    roundRect(s, px + pad, py + pad, t - pad * 2, t - pad * 2, radius);
    s.fillStyle = g;
    s.fill();
    s.lineWidth = 1;
    s.strokeStyle = room ? 'rgba(94, 235, 211, 0.085)' : 'rgba(128, 168, 228, 0.045)';
    s.stroke();

    if (room) {
      s.save();
      s.globalAlpha = 0.26;
      s.strokeStyle = 'rgba(96, 244, 216, 0.4)';
      s.lineWidth = Math.max(0.7, t * 0.012);
      s.beginPath();
      s.moveTo(px + t * 0.5, py + t * 0.24);
      s.lineTo(px + t * 0.76, py + t * 0.5);
      s.lineTo(px + t * 0.5, py + t * 0.76);
      s.lineTo(px + t * 0.24, py + t * 0.5);
      s.closePath();
      s.stroke();
      s.fillStyle = 'rgba(110, 255, 224, 0.35)';
      s.beginPath();
      s.arc(px + t * 0.5, py + t * 0.5, Math.max(0.7, t * 0.025), 0, Math.PI * 2);
      s.fill();
      s.restore();
    } else if (h > 0.86) {
      s.strokeStyle = 'rgba(120, 160, 220, 0.075)';
      s.lineWidth = 1;
      s.beginPath();
      s.moveTo(px + t * 0.18, py + t * (0.2 + h * 0.4));
      s.lineTo(px + t * (0.3 + h * 0.3), py + t * 0.52);
      s.lineTo(px + t * 0.56, py + t * (0.62 + h * 0.2));
      s.stroke();
    }
  }

  function drawWall(s, x, y) {
    const t = G.layout.tile;
    const px = x * t;
    const py = y * t;
    const h = hash(x + 17, y + 41);
    const g = s.createLinearGradient(px, py, px, py + t);
    g.addColorStop(0, h > 0.5 ? '#273650' : '#243149');
    g.addColorStop(0.46, '#1a263d');
    g.addColorStop(1, '#0c1423');
    roundRect(s, px + 0.6, py + 0.6, t - 1.2, t - 1.2, Math.max(2, t * 0.09));
    s.fillStyle = g;
    s.fill();

    if (!isWall(x, y - 1)) {
      s.fillStyle = 'rgba(174, 210, 255, 0.13)';
      s.fillRect(px + t * 0.06, py + t * 0.02, t * 0.88, Math.max(1, t * 0.035));
    }
    if (!isWall(x - 1, y)) {
      s.fillStyle = 'rgba(174, 210, 255, 0.06)';
      s.fillRect(px + t * 0.02, py + t * 0.08, Math.max(1, t * 0.025), t * 0.84);
    }
    if (!isWall(x, y + 1)) {
      s.fillStyle = 'rgba(2, 5, 12, 0.34)';
      s.fillRect(px + t * 0.06, py + t * 0.95, t * 0.88, Math.max(1, t * 0.03));
    }

    s.strokeStyle = 'rgba(3, 7, 14, 0.38)';
    s.lineWidth = Math.max(0.7, t * 0.016);
    s.beginPath();
    s.moveTo(px + t * 0.06, py + t * 0.55);
    s.lineTo(px + t * 0.94, py + t * 0.55);
    s.stroke();
    s.beginPath();
    s.moveTo(px + (h > 0.5 ? t * 0.52 : t * 0.4), py + t * 0.06);
    s.lineTo(px + (h > 0.5 ? t * 0.52 : t * 0.4), py + t * 0.55);
    s.stroke();
    s.beginPath();
    s.moveTo(px + t * 0.72, py + t * 0.55);
    s.lineTo(px + t * 0.72, py + t * 0.94);
    s.stroke();

    s.strokeStyle = 'rgba(140, 185, 245, 0.055)';
    s.lineWidth = 1;
    roundRect(s, px + 1.2, py + 1.2, t - 2.4, t - 2.4, Math.max(1.5, t * 0.08));
    s.stroke();

    if (h > 0.9) {
      s.fillStyle = 'rgba(95, 231, 255, 0.34)';
      s.shadowColor = 'rgba(95, 231, 255, 0.7)';
      s.shadowBlur = t * 0.12;
      s.beginPath();
      s.arc(px + t * (0.28 + h * 0.36), py + t * (0.25 + h * 0.28), Math.max(1, t * 0.022), 0, Math.PI * 2);
      s.fill();
      s.shadowBlur = 0;
    }
  }

  function drawSocket(s, x, y) {
    const t = G.layout.tile;
    const cx = (x + 0.5) * t;
    const cy = (y + 0.5) * t;
    s.save();
    s.translate(cx, cy);
    s.rotate(Math.PI / 4);
    const r = t * 0.205;
    s.strokeStyle = 'rgba(112, 255, 221, 0.4)';
    s.lineWidth = Math.max(1, t * 0.022);
    s.strokeRect(-r, -r, r * 2, r * 2);
    s.strokeStyle = 'rgba(112, 255, 221, 0.16)';
    s.lineWidth = 1;
    s.strokeRect(-r * 1.28, -r * 1.28, r * 2.56, r * 2.56);
    s.restore();

    s.strokeStyle = 'rgba(112, 255, 221, 0.17)';
    s.lineWidth = 1;
    s.beginPath();
    s.arc(cx, cy, t * 0.31, 0, Math.PI * 2);
    s.stroke();
    for (let i = 0; i < 4; i++) {
      const a = i * Math.PI / 2 + Math.PI / 4;
      s.beginPath();
      s.moveTo(cx + Math.cos(a) * t * 0.29, cy + Math.sin(a) * t * 0.29);
      s.lineTo(cx + Math.cos(a) * t * 0.35, cy + Math.sin(a) * t * 0.35);
      s.stroke();
    }
    s.fillStyle = 'rgba(170, 255, 232, 0.55)';
    s.beginPath();
    s.arc(cx, cy, Math.max(0.8, t * 0.032), 0, Math.PI * 2);
    s.fill();
  }

  function drawRoomBoundaries(s) {
    const r = G.roomRect;
    if (!r) return;
    const t = G.layout.tile;
    s.save();
    s.lineCap = 'round';
    for (let y = r.y; y < r.y + r.h; y++) {
      for (let x = r.x; x < r.x + r.w; x++) {
        for (const d of DIR_KEYS) {
          const v = DIRS[d];
          const nx = x + v.x;
          const ny = y + v.y;
          if (inRoom(nx, ny) || !isWall(nx, ny)) continue;
          const bx = (x + 0.5 + v.x * 0.5) * t;
          const by = (y + 0.5 + v.y * 0.5) * t;
          const len = t * 0.86;
          s.strokeStyle = 'rgba(95, 231, 255, 0.07)';
          s.lineWidth = Math.max(1, t * 0.055);
          s.beginPath();
          if (v.x !== 0) {
            s.moveTo(bx, by - len / 2);
            s.lineTo(bx, by + len / 2);
          } else {
            s.moveTo(bx - len / 2, by);
            s.lineTo(bx + len / 2, by);
          }
          s.stroke();
        }
      }
    }
    s.restore();
  }

  function drawThresholds(s) {
    const r = G.roomRect;
    if (!r) return;
    const t = G.layout.tile;
    s.save();
    s.lineCap = 'round';
    for (let y = r.y; y < r.y + r.h; y++) {
      for (let x = r.x; x < r.x + r.w; x++) {
        for (const d of DIR_KEYS) {
          const v = DIRS[d];
          const nx = x + v.x;
          const ny = y + v.y;
          if (inRoom(nx, ny) || !isFloor(nx, ny)) continue;
          const bx = (x + 0.5 + v.x * 0.5) * t;
          const by = (y + 0.5 + v.y * 0.5) * t;
          const len = t * 0.7;
          s.shadowColor = 'rgba(95, 231, 255, 0.8)';
          s.shadowBlur = t * 0.35;
          s.strokeStyle = 'rgba(95, 231, 255, 0.32)';
          s.lineWidth = Math.max(1.2, t * 0.1);
          s.beginPath();
          if (v.x !== 0) {
            s.moveTo(bx, by - len / 2);
            s.lineTo(bx, by + len / 2);
          } else {
            s.moveTo(bx - len / 2, by);
            s.lineTo(bx + len / 2, by);
          }
          s.stroke();
          s.shadowBlur = 0;
          s.strokeStyle = 'rgba(205, 255, 250, 0.8)';
          s.lineWidth = Math.max(1, t * 0.026);
          s.stroke();
        }
      }
    }
    s.restore();
  }

  /* ── dynamic rendering ───────────────────────────────────────── */
  function render(now) {
    if (!G.level) return;
    const { w, h, dpr } = G.layout;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    let sx = 0;
    let sy = 0;
    if (now < G.shakeUntil) {
      const p = clamp((G.shakeUntil - now) / Math.max(1, G.shakeDur));
      sx = (Math.random() * 2 - 1) * G.shakeMag * p;
      sy = (Math.random() * 2 - 1) * G.shakeMag * p;
    }

    ctx.save();
    ctx.translate(sx, sy);
    ctx.drawImage(G.staticCanvas, 0, 0, w, h);
    drawRoomShimmer(now);
    drawGoalGlows(now);
    drawParticles(now, false);
    for (let i = 0; i < G.boxes.length; i++) drawCrystal(i, now);
    drawHero(now);
    drawParticles(now, true);

    if (now < G.flashUntil) {
      const a = ((G.flashUntil - now) / 220) * 0.1;
      ctx.fillStyle = `rgba(121, 255, 208, ${a})`;
      ctx.fillRect(0, 0, w, h);
    }
    ctx.restore();
  }

  function drawRoomShimmer(now) {
    const r = G.roomRect;
    if (!r || G.reducedMotion) return;
    const t = G.layout.tile;
    const x = r.x * t;
    const y = r.y * t;
    const w = r.w * t;
    const h = r.h * t;
    const cx = x + w * (0.5 + 0.34 * Math.sin(now * 0.00022));
    const cy = y + h * (0.5 + 0.3 * Math.cos(now * 0.00017));
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h) * 0.72);
    g.addColorStop(0, 'rgba(80, 255, 218, 0.055)');
    g.addColorStop(1, 'rgba(80, 255, 218, 0)');
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);
    ctx.restore();
  }

  function drawGoalGlows(now) {
    const t = G.layout.tile;
    G.goals.forEach((k) => {
      const x = k % 100;
      const y = Math.floor(k / 100);
      const cx = (x + 0.5) * t;
      const cy = (y + 0.5) * t;
      const occupied = G.boxes.some((b) => b.x === x && b.y === y);
      const pulse = 0.5 + 0.5 * Math.sin(now * 0.003 + (x + y) * 0.7);
      const rad = t * (occupied ? 0.68 : 0.54 + pulse * 0.1);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad);
      g.addColorStop(0, occupied ? 'rgba(121, 255, 208, 0.34)' : 'rgba(95, 231, 255, 0.15)');
      g.addColorStop(1, 'rgba(95, 231, 255, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(cx, cy, rad, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = occupied ? 'rgba(160, 255, 228, 0.82)' : 'rgba(95, 231, 255, 0.36)';
      ctx.lineWidth = Math.max(1, t * 0.021);
      ctx.beginPath();
      ctx.arc(cx, cy, t * (occupied ? 0.295 : 0.275), 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    });
  }

  function crystalPose(index, now) {
    const t = G.layout.tile;
    const box = G.boxes[index];
    let x = box.x;
    let y = box.y;
    let progress = 1;
    let onGoal = G.goals.has(keyOf(box.x, box.y));
    const a = G.anim;
    if (a && a.box && a.box.index === index) {
      progress = moveEase(clamp((now - a.t0) / a.dur));
      x = lerp(a.box.x0, a.box.x1, progress);
      y = lerp(a.box.y0, a.box.y1, progress);
      onGoal = G.goals.has(keyOf(a.box.x1, a.box.y1)) && progress > 0.84;
    }
    return {
      x: (x + 0.5) * t,
      y: (y + 0.5) * t,
      baseY: (y + 0.5) * t,
      onGoal,
      progress,
    };
  }

  function drawCrystal(index, now) {
    const t = G.layout.tile;
    const pose = crystalPose(index, now);
    const seed = index * 1.73 + 1.2;
    const bob = Math.sin(now * 0.0022 + seed) * t * (pose.onGoal ? 0.012 : 0.028);
    const blink = 0.38 + 0.62 * (0.5 + 0.5 * Math.sin(now * 0.006 + seed * 2.4));
    const alpha = pose.onGoal ? 1 : blink;
    const cx = pose.x;
    const cy = pose.y + bob;
    const w = t * 0.3;
    const h = t * 0.43;

    ctx.save();
    ctx.globalAlpha = 0.34 * alpha;
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.ellipse(pose.x, pose.baseY + t * 0.26, t * 0.25, t * 0.095, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    const spriteReady = crystalSpriteReady
      || (crystalSprite.complete && crystalSprite.naturalWidth > 0);

    if (spriteReady) {
      ctx.save();
      ctx.translate(cx, cy);
      ctx.globalAlpha = alpha;

      if (pose.onGoal) {
        const aura = ctx.createRadialGradient(0, 0, 0, 0, 0, t * 0.52);
        aura.addColorStop(0, 'rgba(121, 255, 208, 0.28)');
        aura.addColorStop(1, 'rgba(121, 255, 208, 0)');
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = aura;
        ctx.beginPath();
        ctx.arc(0, 0, t * 0.52, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      const dw = t * 0.64;
      const dh = dw * (crystalSprite.naturalHeight / crystalSprite.naturalWidth);
      ctx.shadowColor = pose.onGoal ? 'rgba(121, 255, 208, 0.95)' : 'rgba(80, 220, 255, 0.9)';
      ctx.shadowBlur = t * (pose.onGoal ? 0.42 : 0.3);
      ctx.drawImage(crystalSprite, -dw / 2, -dh / 2 + t * 0.015, dw, dh);
      ctx.shadowBlur = 0;
      ctx.restore();
    } else {
    // резервний векторний кристал, якщо PNG не завантажився
    ctx.save();
    ctx.translate(cx, cy);
    ctx.globalAlpha = alpha;
    ctx.shadowColor = pose.onGoal ? 'rgba(121, 255, 208, 0.95)' : 'rgba(80, 220, 255, 0.9)';
    ctx.shadowBlur = t * (pose.onGoal ? 0.42 : 0.3);

    const top = [0, -h];
    const ur = [w * 0.74, -h * 0.22];
    const lr = [w * 0.56, h * 0.54];
    const bottom = [0, h];
    const ll = [-w * 0.56, h * 0.54];
    const ul = [-w * 0.74, -h * 0.22];
    const center = [0, -h * 0.06];

    const g = ctx.createLinearGradient(0, -h, 0, h);
    g.addColorStop(0, '#eaffff');
    g.addColorStop(0.32, '#9bf8ff');
    g.addColorStop(0.66, '#28bcef');
    g.addColorStop(1, '#294ee0');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(top[0], top[1]);
    ctx.lineTo(ur[0], ur[1]);
    ctx.lineTo(lr[0], lr[1]);
    ctx.lineTo(bottom[0], bottom[1]);
    ctx.lineTo(ll[0], ll[1]);
    ctx.lineTo(ul[0], ul[1]);
    ctx.closePath();
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.beginPath();
    ctx.moveTo(top[0], top[1]);
    ctx.lineTo(ur[0], ur[1]);
    ctx.lineTo(center[0], center[1]);
    ctx.lineTo(ul[0], ul[1]);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = 'rgba(10, 36, 110, 0.3)';
    ctx.beginPath();
    ctx.moveTo(ur[0], ur[1]);
    ctx.lineTo(lr[0], lr[1]);
    ctx.lineTo(bottom[0], bottom[1]);
    ctx.lineTo(center[0], center[1]);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = 'rgba(160, 250, 255, 0.22)';
    ctx.beginPath();
    ctx.moveTo(ul[0], ul[1]);
    ctx.lineTo(center[0], center[1]);
    ctx.lineTo(bottom[0], bottom[1]);
    ctx.lineTo(ll[0], ll[1]);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = 'rgba(226, 255, 255, 0.88)';
    ctx.lineWidth = Math.max(0.8, t * 0.012);
    ctx.beginPath();
    ctx.moveTo(top[0], top[1]);
    ctx.lineTo(ur[0], ur[1]);
    ctx.lineTo(lr[0], lr[1]);
    ctx.lineTo(bottom[0], bottom[1]);
    ctx.lineTo(ll[0], ll[1]);
    ctx.lineTo(ul[0], ul[1]);
    ctx.closePath();
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.42)';
    ctx.lineWidth = Math.max(0.6, t * 0.008);
    ctx.beginPath();
    ctx.moveTo(top[0], top[1]);
    ctx.lineTo(center[0], center[1]);
    ctx.lineTo(bottom[0], bottom[1]);
    ctx.moveTo(ul[0], ul[1]);
    ctx.lineTo(center[0], center[1]);
    ctx.lineTo(ur[0], ur[1]);
    ctx.stroke();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.beginPath();
    ctx.moveTo(-w * 0.28, -h * 0.2);
    ctx.lineTo(-w * 0.16, -h * 0.08);
    ctx.lineTo(-w * 0.28, h * 0.02);
    ctx.lineTo(-w * 0.4, -h * 0.08);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    }

    if (pose.onGoal) {
      const ringPulse = 0.5 + 0.5 * Math.sin(now * 0.002 + seed);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = `rgba(150, 255, 226, ${0.36 + ringPulse * 0.22})`;
      ctx.lineWidth = Math.max(1, t * 0.018);
      ctx.beginPath();
      ctx.ellipse(pose.x, pose.baseY + t * 0.24, t * 0.28, t * 0.11, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  function heroPose(now) {
    const t = G.layout.tile;
    let x = G.player.x;
    let y = G.player.y;
    let moving = false;
    let progress = 0;
    let pushing = false;
    const a = G.anim;
    if (a && (a.kind === 'walk' || a.kind === 'push')) {
      moving = true;
      progress = clamp((now - a.t0) / a.dur);
      const p = moveEase(progress);
      x = lerp(a.p0.x, a.p1.x, p);
      y = lerp(a.p0.y, a.p1.y, p);
      pushing = a.kind === 'push';
    }
    if (G.bump && now < G.bump.t0 + G.bump.dur) {
      const p = clamp((now - G.bump.t0) / G.bump.dur);
      const v = DIRS[G.bump.dir];
      x += v.x * Math.sin(p * Math.PI) * 0.085;
      y += v.y * Math.sin(p * Math.PI) * 0.085;
    }
    return {
      cx: (x + 0.5) * t,
      cy: (y + 0.5) * t,
      moving,
      progress,
      pushing,
    };
  }

  function drawHero(now) {
    const t = G.layout.tile;
    const pose = heroPose(now);
    const facing = G.facing;
    const sideReady = heroSheetReady
      || (heroSheet.complete && heroSheet.naturalWidth > 0);
    const frontReady = heroFrontSheetReady
      || (heroFrontSheet.complete && heroFrontSheet.naturalWidth > 0);
    const useFront = facing === 'down' && frontReady;

    if (!useFront && !sideReady) {
      drawHeroVector(now);
      return;
    }

    const bob = pose.moving ? 0 : Math.sin(now * 0.0022) * t * 0.008;
    const h = t;
    const w = h * (HERO_FRAME_W / HERO_FRAME_H);

    ctx.save();
    ctx.globalAlpha = 0.34;
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.ellipse(pose.cx, pose.cy + t * 0.33, t * 0.24, t * 0.085, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.imageSmoothingEnabled = true;

    if (useFront) {
      // окремий лист: 0 — стоїть обличчям уперед, 1–3 — хода вниз
      let col = 0;
      if (pose.moving) col = 1 + Math.min(2, Math.floor(pose.progress * 3));
      // голова в усіх кадрах на однаковій висоті, тому якоримо її,
      // а не низ кадру (у кадрі 1 нога виступає до самого краю)
      const top = pose.cy - t * 0.43 + bob - 25 * (h / HERO_FRAME_H);
      ctx.drawImage(
        heroFrontSheet,
        col * HERO_FRAME_W, 0, HERO_FRAME_W, HERO_FRAME_H,
        pose.cx - w / 2, top, w, h,
      );
    } else {
      const pushing = pose.pushing;
      // Кадри 0–2 — праворуч, 3–5 — вгору (для руху ліворуч дзеркалимо).
      let baseCol = 3;
      let mirror = false;
      if (facing === 'right') {
        baseCol = 0;
      } else if (facing === 'left') {
        baseCol = 0;
        mirror = true;
      }

      let step = 1;
      if (pose.moving) step = Math.min(2, Math.floor(pose.progress * 3));
      const col = baseCol + step;
      const row = pushing ? 1 : 0;

      // у кадрах є прозорий запас знизу; компенсуємо його, щоб ноги
      // стояли на підлозі однаково в обох рядах
      const margin = row === 0 ? h * 0.1 : h * 0.155;
      const feetY = pose.cy + t * 0.33 + bob;
      const top = feetY - h + margin;

      if (mirror) {
        ctx.translate(pose.cx + w / 2, top);
        ctx.scale(-1, 1);
      } else {
        ctx.translate(pose.cx - w / 2, top);
      }
      ctx.drawImage(
        heroSheet,
        col * HERO_FRAME_W, row * HERO_FRAME_H, HERO_FRAME_W, HERO_FRAME_H,
        0, 0, w, h,
      );
    }
    ctx.restore();
  }

  function drawHeroVector(now) {
    const t = G.layout.tile;
    const pose = heroPose(now);
    const facing = G.facing;
    const v = DIRS[facing] || DIRS.down;
    const fx = v.x;
    const fy = v.y;
    const swing = pose.moving ? Math.sin(pose.progress * Math.PI * 2) : 0;
    const bob = pose.moving
      ? -Math.abs(Math.sin(pose.progress * Math.PI * 2)) * t * 0.02
      : Math.sin(now * 0.0022) * t * 0.007;
    const lean = pose.pushing ? t * 0.065 : 0;
    const skin = '#f2c79d';
    const skinShade = '#d9a374';
    const hair = '#352116';
    const cloak = '#e9a948';
    const cloakDark = '#b97528';
    const cloakDeep = '#7c4718';
    const boot = '#2b1a12';

    ctx.save();
    ctx.globalAlpha = 0.4;
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.ellipse(pose.cx, pose.cy + t * 0.29, t * 0.27, t * 0.1, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.translate(pose.cx, pose.cy + bob);
    const s = t;

    // ноги
    const legSpread = s * 0.1;
    const legW = s * 0.082;
    const legLen = s * 0.2;
    const swingAmt = s * 0.075;
    const legSwingL = pose.moving ? swing * swingAmt : 0;
    const legSwingR = pose.moving ? -swing * swingAmt : 0;
    drawLeg(-legSpread, s * 0.075, legSwingL, fx, fy, legW, legLen, boot, s);
    drawLeg(legSpread, s * 0.075, legSwingR, fx, fy, legW, legLen, boot, s);

    // тіло / плащ
    const bodyW = s * 0.34;
    const bodyTop = -s * 0.19 + fy * lean * 0.32;
    const bodyBottom = s * 0.1;
    const leanX = fx * lean;
    const bodyGrad = ctx.createLinearGradient(0, bodyTop, 0, bodyBottom);
    bodyGrad.addColorStop(0, cloak);
    bodyGrad.addColorStop(0.72, cloakDark);
    bodyGrad.addColorStop(1, cloakDeep);
    ctx.beginPath();
    ctx.moveTo(-bodyW / 2 + leanX, bodyTop);
    ctx.quadraticCurveTo(leanX, bodyTop - s * 0.028, bodyW / 2 + leanX, bodyTop);
    ctx.lineTo(bodyW / 2 + leanX * 0.36, bodyBottom);
    ctx.quadraticCurveTo(leanX * 0.2, bodyBottom + s * 0.04, -bodyW / 2 + leanX * 0.36, bodyBottom);
    ctx.closePath();
    ctx.fillStyle = bodyGrad;
    ctx.shadowColor = 'rgba(244, 201, 111, 0.22)';
    ctx.shadowBlur = s * 0.18;
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(65, 37, 12, 0.45)';
    ctx.lineWidth = Math.max(0.7, s * 0.012);
    ctx.stroke();

    // пояс
    ctx.fillStyle = '#4c2d18';
    ctx.beginPath();
    ctx.ellipse(leanX * 0.3, bodyBottom - s * 0.055, bodyW * 0.46, s * 0.028, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f4c96f';
    ctx.beginPath();
    ctx.arc(leanX * 0.3, bodyBottom - s * 0.055, s * 0.022, 0, Math.PI * 2);
    ctx.fill();

    // шарф
    ctx.fillStyle = '#39c7c5';
    ctx.beginPath();
    ctx.ellipse(leanX * 0.8, bodyTop + s * 0.012, bodyW * 0.4, s * 0.033, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(130, 255, 245, 0.55)';
    ctx.beginPath();
    ctx.ellipse(leanX * 0.8 - s * 0.04, bodyTop + s * 0.005, s * 0.035, s * 0.014, 0, 0, Math.PI * 2);
    ctx.fill();

    // руки
    const shoulderY = bodyTop + s * 0.035;
    const perp = { x: -fy, y: fx };
    for (const side of [-1, 1]) {
      const shoulderX = perp.x * bodyW * 0.47 * side + leanX * 0.7;
      const shoulderYY = shoulderY + perp.y * bodyW * 0.47 * side;
      let handX;
      let handY;
      if (pose.pushing) {
        handX = leanX + fx * s * 0.31 + perp.x * s * 0.075 * side;
        handY = shoulderYY + fy * s * 0.27 + perp.y * s * 0.075 * side;
      } else {
        const armSwing = (side === 1 ? -swing : swing) * s * 0.045;
        handX = shoulderX + perp.x * s * 0.09 + fx * armSwing;
        handY = shoulderY + s * 0.16 + perp.y * s * 0.09 + fy * armSwing;
      }
      ctx.strokeStyle = cloakDark;
      ctx.lineWidth = s * 0.072;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(shoulderX, shoulderYY);
      ctx.lineTo(handX, handY);
      ctx.stroke();
      ctx.fillStyle = skin;
      ctx.beginPath();
      ctx.arc(handX, handY, s * 0.041, 0, Math.PI * 2);
      ctx.fill();
    }

    // голова
    const headR = s * 0.145;
    const headX = leanX * 1.25;
    const headY = -s * 0.325 + fy * lean * 0.5;
    ctx.fillStyle = hair;
    ctx.beginPath();
    ctx.arc(headX, headY, headR * 1.04, 0, Math.PI * 2);
    ctx.fill();

    const faceX = headX + fx * headR * 0.24;
    const faceY = headY + fy * headR * 0.2;
    const faceGrad = ctx.createRadialGradient(faceX - headR * 0.25, faceY - headR * 0.3, 0, faceX, faceY, headR);
    faceGrad.addColorStop(0, '#ffe0bc');
    faceGrad.addColorStop(0.7, skin);
    faceGrad.addColorStop(1, skinShade);
    ctx.fillStyle = faceGrad;
    ctx.beginPath();
    ctx.arc(faceX, faceY, headR * 0.84, 0, Math.PI * 2);
    ctx.fill();

    // волосся зверху / ззаду
    ctx.fillStyle = hair;
    ctx.beginPath();
    ctx.arc(headX - fx * headR * 0.2, headY - fy * headR * 0.2, headR * 0.86, Math.PI * 0.88, Math.PI * 2.12);
    ctx.fill();
    if (facing === 'left' || facing === 'right') {
      ctx.beginPath();
      ctx.arc(headX - fx * headR * 0.55, headY, headR * 0.55, 0, Math.PI * 2);
      ctx.fill();
    }

    // обличчя
    const eyeY = faceY + headR * 0.08;
    const blink = ((now * 0.001 + indexSeedForHero()) % 4.6) < 0.1;
    if (facing !== 'up') {
      const eyeOffset = headR * 0.3;
      const ex = faceX + (facing === 'left' ? -eyeOffset * 0.45 : facing === 'right' ? eyeOffset * 0.45 : 0);
      ctx.fillStyle = '#2b1a12';
      if (blink) {
        ctx.strokeStyle = '#2b1a12';
        ctx.lineWidth = Math.max(0.7, s * 0.012);
        ctx.beginPath();
        ctx.moveTo(ex - eyeOffset * 0.45, eyeY);
        ctx.lineTo(ex + eyeOffset * 0.45, eyeY);
        ctx.stroke();
        if (facing === 'down') {
          ctx.beginPath();
          ctx.moveTo(ex + eyeOffset * 0.65, eyeY);
          ctx.lineTo(ex + eyeOffset * 1.55, eyeY);
          ctx.stroke();
        }
      } else {
        if (facing === 'down') {
          ctx.beginPath(); ctx.arc(faceX - eyeOffset, eyeY, s * 0.015, 0, Math.PI * 2); ctx.fill();
          ctx.beginPath(); ctx.arc(faceX + eyeOffset, eyeY, s * 0.015, 0, Math.PI * 2); ctx.fill();
        } else {
          ctx.beginPath(); ctx.arc(ex, eyeY, s * 0.014, 0, Math.PI * 2); ctx.fill();
          if (facing === 'left') {
            ctx.beginPath(); ctx.arc(ex - eyeOffset * 0.8, eyeY, s * 0.013, 0, Math.PI * 2); ctx.fill();
          }
        }
      }
      if (facing === 'down') {
        ctx.strokeStyle = 'rgba(90, 45, 30, 0.55)';
        ctx.lineWidth = Math.max(0.6, s * 0.01);
        ctx.beginPath();
        ctx.arc(faceX, faceY + headR * 0.28, headR * 0.24, 0.25, Math.PI - 0.25);
        ctx.stroke();
      }
    }
    ctx.restore();

    if (pose.pushing) {
      const pushX = pose.cx + fx * t * 0.42;
      const pushY = pose.cy + fy * t * 0.42 + t * 0.05;
      ctx.save();
      ctx.globalAlpha = 0.3;
      ctx.strokeStyle = '#f4c96f';
      ctx.lineWidth = Math.max(1, t * 0.014);
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(pushX - t * 0.06, pushY - t * 0.02);
      ctx.lineTo(pushX + t * 0.06, pushY - t * 0.02);
      ctx.stroke();
      ctx.restore();
    }
  }

  function indexSeedForHero() {
    return G.levelIndex * 0.9 + 2.1;
  }

  function drawLeg(ox, oy, swing, fx, fy, width, length, color, s) {
    const x = ox + fx * swing;
    const y = oy + fy * swing;
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + fx * s * 0.015, y + length);
    ctx.stroke();
    ctx.fillStyle = '#1d120c';
    ctx.beginPath();
    ctx.ellipse(x + fx * s * 0.02, y + length + s * 0.012, width * 0.72, s * 0.032, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  /* ── particles ───────────────────────────────────────────────── */
  function addParticle(x, y, opts = {}) {
    const life = opts.life != null ? opts.life : 0.55;
    G.particles.push({
      x,
      y,
      vx: opts.vx != null ? opts.vx : (Math.random() * 2 - 1) * 42,
      vy: opts.vy != null ? opts.vy : (Math.random() * 2 - 1) * 42,
      g: opts.g != null ? opts.g : 90,
      life,
      maxLife: life,
      size: opts.size != null ? opts.size : 2,
      color: opts.color || 'rgba(121, 255, 208, 1)',
      front: opts.front !== false,
      spark: !!opts.spark,
      rot: Math.random() * Math.PI,
      vr: (Math.random() * 2 - 1) * 6,
    });
    if (G.particles.length > 260) G.particles.splice(0, G.particles.length - 260);
  }

  function spawnDust(x, y, color = 'rgba(180, 220, 255, 0.55)') {
    for (let i = 0; i < 7; i++) {
      const a = Math.random() * Math.PI * 2;
      const speed = 18 + Math.random() * 46;
      addParticle(x, y, {
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed - 12,
        g: 70,
        life: 0.35 + Math.random() * 0.25,
        size: 1 + Math.random() * 2,
        color,
        front: false,
      });
    }
  }

  function spawnBurst(x, y, color = 'rgba(121, 255, 208, 1)', count = 16) {
    for (let i = 0; i < count; i++) {
      const a = Math.random() * Math.PI * 2;
      const speed = 34 + Math.random() * 105;
      addParticle(x, y, {
        vx: Math.cos(a) * speed,
        vy: Math.sin(a) * speed - 22,
        g: 150,
        life: 0.5 + Math.random() * 0.45,
        size: 1.6 + Math.random() * 2.4,
        color,
        spark: Math.random() > 0.45,
      });
    }
  }

  function spawnWinParticles() {
    const t = G.layout.tile;
    G.goals.forEach((k) => {
      spawnBurst((k % 100 + 0.5) * t, (Math.floor(k / 100) + 0.5) * t, 'rgba(121, 255, 208, 1)', 18);
    });
    for (let i = 0; i < 44; i++) {
      addParticle(Math.random() * G.layout.w, Math.random() * G.layout.h * 0.75, {
        vx: (Math.random() * 2 - 1) * 35,
        vy: -30 - Math.random() * 60,
        g: 55,
        life: 1.1 + Math.random() * 0.9,
        size: 1.4 + Math.random() * 2.2,
        color: ['rgba(244, 201, 111, 1)', 'rgba(95, 231, 255, 1)', 'rgba(169, 140, 255, 1)', 'rgba(121, 255, 208, 1)'][i % 4],
        spark: true,
      });
    }
  }

  function updateParticles(now) {
    const dt = Math.min(0.05, Math.max(0, now - G.lastFrame) / 1000);
    G.lastFrame = now;
    for (let i = G.particles.length - 1; i >= 0; i--) {
      const p = G.particles[i];
      p.life -= dt;
      if (p.life <= 0) { G.particles.splice(i, 1); continue; }
      p.vy += p.g * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.985;
      p.rot += p.vr * dt;
    }
  }

  function drawParticles(now, front) {
    for (const p of G.particles) {
      if (p.front !== front) continue;
      const a = clamp(p.life / p.maxLife);
      ctx.save();
      ctx.globalAlpha = a;
      if (p.spark) {
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.strokeStyle = p.color;
        ctx.lineWidth = Math.max(1, p.size * 0.4);
        ctx.lineCap = 'round';
        ctx.shadowColor = p.color;
        ctx.shadowBlur = p.size * 3;
        ctx.beginPath();
        ctx.moveTo(-p.size, 0);
        ctx.lineTo(p.size, 0);
        ctx.moveTo(0, -p.size);
        ctx.lineTo(0, p.size);
        ctx.stroke();
      } else {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
    void now;
  }

  /* ── movement & rules ────────────────────────────────────────── */
  function shake(mag, dur) {
    G.shakeUntil = nowMs() + dur;
    G.shakeDur = dur;
    G.shakeMag = mag;
  }

  function addHeld(dir) {
    if (!G.held.includes(dir)) G.held.push(dir);
    G.queueDir = dir;
  }
  function removeHeld(dir) {
    G.held = G.held.filter((d) => d !== dir);
    if (G.queueDir === dir) G.queueDir = null;
  }
  function nextHeldDir() {
    if (G.held.length) return G.held[G.held.length - 1];
    const q = G.queueDir;
    G.queueDir = null;
    return q;
  }

  function attemptMove(dir, startAt) {
    if (!G.level || G.won) return;
    if (G.anim) { G.queueDir = dir; return; }
    const v = DIRS[dir];
    if (!v) return;
    const prevFacing = G.facing;
    G.facing = dir;
    const nx = G.player.x + v.x;
    const ny = G.player.y + v.y;

    if (isWall(nx, ny)) {
      bump(dir);
      return;
    }
    const bi = boxIndexAt(nx, ny);
    let push = null;
    if (bi >= 0) {
      const bx = nx + v.x;
      const by = ny + v.y;
      if (isWall(bx, by) || boxIndexAt(bx, by) >= 0) {
        bump(dir);
        return;
      }
      push = { index: bi, x0: nx, y0: ny, x1: bx, y1: by };
    }

    G.history.push({
      player: { x: G.player.x, y: G.player.y },
      boxes: G.boxes.map((b) => ({ x: b.x, y: b.y })),
      facing: prevFacing,
      moves: G.moves,
      pushes: G.pushes,
    });
    if (G.history.length > 400) G.history.shift();

    const p0 = { x: G.player.x, y: G.player.y };
    G.player.x = nx;
    G.player.y = ny;
    G.moves += 1;
    if (push) {
      G.boxes[push.index].x = push.x1;
      G.boxes[push.index].y = push.y1;
      G.pushes += 1;
    }

    G.anim = {
      kind: push ? 'push' : 'walk',
      t0: startAt ? Math.max(startAt, nowMs() - 40) : nowMs(),
      dur: push ? 150 : 110,
      p0,
      p1: { x: nx, y: ny },
      box: push,
      dir,
    };

    if (push) {
      const t = G.layout.tile;
      spawnDust((push.x0 + 0.5) * t, (push.y0 + 0.72) * t, 'rgba(150, 220, 255, 0.5)');
      shake(2.2, 180);
      sound.push();
    } else {
      sound.step();
    }
    updateHud();
  }

  function bump(dir) {
    G.bump = { dir, t0: nowMs(), dur: 170 };
    shake(3, 150);
    sound.blocked();
  }

  function finishAnim(now) {
    const a = G.anim;
    G.anim = null;
    if (!a) return;
    if (a.kind === 'push' && a.box) {
      const landed = G.goals.has(keyOf(a.box.x1, a.box.y1));
      if (landed) {
        const t = G.layout.tile;
        spawnBurst((a.box.x1 + 0.5) * t, (a.box.y1 + 0.5) * t, 'rgba(121, 255, 208, 1)', 15);
        sound.place();
      }
    }
    updateHud();
    if (G.won || G.winScheduled) return;
    if (checkWin(now)) return;
    const dir = nextHeldDir();
    if (dir) attemptMove(dir, a.t0 + a.dur);
  }

  function checkWin(now) {
    if (!G.boxes.length || !G.boxes.every((b) => G.goals.has(keyOf(b.x, b.y)))) return false;
    G.won = true;
    G.winScheduled = true;
    pauseTimer(now);
    const rec = save.best[G.levelIndex];
    const elapsed = Math.round(getElapsed(now));
    const better = !rec || G.moves < rec.moves || (G.moves === rec.moves && elapsed < rec.time);
    if (better) {
      save.best[G.levelIndex] = { moves: G.moves, pushes: G.pushes, time: elapsed };
      persist();
      G.lastRecord = true;
    } else {
      G.lastRecord = false;
    }
    save.unlocked = clamp(Math.max(save.unlocked, G.levelIndex + 2), 1, LEVELS.length);
    persist();
    spawnWinParticles();
    sound.win();
    updateHud();
    window.setTimeout(() => {
      G.winScheduled = false;
      if (G.levelIndex >= LEVELS.length - 1) openFinal();
      else openWin();
    }, 760);
    return true;
  }

  function undo() {
    if (!G.history.length || G.anim || G.won) return;
    const snap = G.history.pop();
    G.player = { ...snap.player };
    G.boxes = snap.boxes.map((b) => ({ ...b }));
    G.facing = snap.facing;
    G.moves = snap.moves;
    G.pushes = snap.pushes;
    G.bump = null;
    G.flashUntil = nowMs() + 230;
    sound.undo();
    updateHud();
  }

  function restartLevel() {
    sound.click();
    loadLevel(G.levelIndex);
  }

  /* ── HUD & modal helpers ─────────────────────────────────────── */
  function updateHud() {
    if (!G.level) return;
    const total = G.boxes.length;
    const placed = placedCount();
    movesText.textContent = String(G.moves);
    pushesText.textContent = String(G.pushes);
    placedText.textContent = `${placed} / ${total}`;
    crystalsText.textContent = `${placed} / ${total}`;
    placedBar.style.width = total ? `${(placed / total) * 100}%` : '0%';
    const rec = save.best[G.levelIndex];
    bestText.textContent = rec ? String(rec.moves) : '—';
    bestText.title = rec
      ? `${rec.moves} кроків · ${rec.pushes} поштовхів · ${formatTime(rec.time)}`
      : 'Ще немає рекорду';
    undoBtn.disabled = !G.history.length || !!G.anim || G.won;
  }

  function updateClock(now) {
    const text = formatTime(getElapsed(now));
    if (text !== G.lastClockText) {
      G.lastClockText = text;
      timeText.textContent = text;
    }
  }

  let toastTimer = 0;
  function toast(message) {
    toastEl.textContent = message;
    toastEl.classList.add('is-visible');
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toastEl.classList.remove('is-visible'), 2100);
  }

  let lastFocus = null;
  function openModal(id) {
    const modal = typeof id === 'string' ? $(id) : id;
    if (!modal) return;
    if (!isModalOpen()) lastFocus = document.activeElement;
    pauseTimer();
    modal.hidden = false;
    requestAnimationFrame(() => modal.classList.add('is-open'));
    const focusTarget = modal.querySelector('.modal-close, .btn-gold, button:not([disabled])');
    window.setTimeout(() => {
      if (focusTarget && !modal.hidden) {
        try { focusTarget.focus({ preventScroll: true }); } catch (err) { focusTarget.focus(); }
      }
    }, 50);
  }

  function closeModal(modal) {
    if (!modal || modal.hidden) return;
    modal.classList.remove('is-open');
    window.setTimeout(() => {
      modal.hidden = true;
      if (!isModalOpen()) {
        resumeTimer();
        if (lastFocus && document.contains(lastFocus)) {
          try { lastFocus.focus({ preventScroll: true }); } catch (err) { lastFocus.focus(); }
          lastFocus = null;
        }
      }
    }, 220);
  }

  function closeAllModals() {
    document.querySelectorAll('.modal').forEach((m) => {
      m.classList.remove('is-open');
      m.hidden = true;
    });
    lastFocus = null;
  }

  function closeTopModal() {
    const open = Array.from(document.querySelectorAll('.modal')).filter((m) => !m.hidden);
    if (open.length) closeModal(open[open.length - 1]);
  }

  function renderLevels() {
    if (!levelsGrid) return;
    levelsGrid.innerHTML = LEVELS.map((lvl, i) => {
      const locked = i >= save.unlocked;
      const done = !!save.best[i];
      const current = i === G.levelIndex;
      const best = done ? `Рекорд: ${save.best[i].moves} кр.` : (locked ? 'Зачинено' : 'Ще не пройдено');
      return `<button class="level-tile${current ? ' is-current' : ''}${done ? ' is-done' : ''}" type="button" data-level="${i}"${locked ? ' disabled aria-disabled="true"' : ''}>
        <span class="level-tile-num">${pad2(i + 1)}</span>
        <span class="level-tile-name">${escapeHtml(lvl.name)}</span>
        <span class="level-tile-best">${best}</span>
        <span class="level-tile-mark${locked ? ' is-lock' : ''}" aria-hidden="true"><svg><use href="#i-${locked ? 'lock' : 'check'}"></use></svg></span>
      </button>`;
    }).join('');
  }

  function openLevels() {
    renderLevels();
    openModal('levelsModal');
  }

  function openHelp() {
    openModal('helpModal');
  }

  function openWin() {
    $('winMoves').textContent = String(G.moves);
    $('winPushes').textContent = String(G.pushes);
    $('winTime').textContent = formatTime(getElapsed());
    $('recordBadge').hidden = !G.lastRecord;
    $('nextLevelBtn').style.display = G.levelIndex < LEVELS.length - 1 ? '' : 'none';
    openModal('winModal');
  }

  function openFinal() {
    const bests = Object.values(save.best);
    $('finalRecords').textContent = `${bests.length} / ${LEVELS.length}`;
    const total = bests.reduce((sum, b) => sum + (Number(b.time) || 0), 0);
    $('finalTime').textContent = bests.length ? formatTime(total) : '—';
    openModal('finalModal');
  }

  /* ── sound ───────────────────────────────────────────────────── */
  const sound = (() => {
    let ac = null;
    function audio() {
      if (!save.sound) return null;
      if (!ac) {
        try {
          const AC = window.AudioContext || window.webkitAudioContext;
          if (!AC) return null;
          ac = new AC();
        } catch (err) { return null; }
      }
      if (ac.state === 'suspended') {
        try { ac.resume(); } catch (err) { /* ignore */ }
      }
      return ac;
    }
    function tone(opts) {
      const a = audio();
      if (!a) return;
      const t0 = a.currentTime + (opts.delay || 0);
      const dur = opts.dur || 0.08;
      const osc = a.createOscillator();
      const gain = a.createGain();
      osc.type = opts.type || 'sine';
      osc.frequency.setValueAtTime(Math.max(20, opts.freq || 220), t0);
      if (opts.slide) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(20, (opts.freq || 220) + opts.slide), t0 + dur);
      }
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, opts.vol || 0.02), t0 + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(gain).connect(a.destination);
      osc.start(t0);
      osc.stop(t0 + dur + 0.03);
    }
    return {
      unlock() { audio(); },
      step() { tone({ freq: 150 + Math.random() * 25, dur: 0.045, type: 'triangle', vol: 0.015, slide: -45 }); },
      push() {
        tone({ freq: 94, dur: 0.13, type: 'sawtooth', vol: 0.028, slide: -30 });
        tone({ freq: 156, dur: 0.06, type: 'triangle', vol: 0.012, slide: -50 });
      },
      place() {
        tone({ freq: 660, dur: 0.14, type: 'sine', vol: 0.032 });
        tone({ freq: 990, dur: 0.2, type: 'sine', vol: 0.024, delay: 0.075 });
      },
      blocked() { tone({ freq: 72, dur: 0.075, type: 'square', vol: 0.016, slide: -16 }); },
      undo() { tone({ freq: 300, dur: 0.08, type: 'triangle', vol: 0.016, slide: -90 }); },
      win() {
        [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
          tone({ freq, dur: 0.22, type: 'sine', vol: 0.03, delay: i * 0.11 });
        });
      },
      click() { tone({ freq: 520, dur: 0.045, type: 'triangle', vol: 0.01 }); },
    };
  })();

  function updateSoundUI() {
    soundBtn.innerHTML = `<svg><use href="#i-${save.sound ? 'sound' : 'mute'}"></use></svg>`;
    soundBtn.setAttribute('aria-pressed', String(save.sound));
    soundBtn.setAttribute('aria-label', save.sound ? 'Вимкнути звук' : 'Увімкнути звук');
  }

  function toggleSound() {
    save.sound = !save.sound;
    persist();
    updateSoundUI();
    if (save.sound) sound.click();
    toast(save.sound ? 'Звук увімкнено' : 'Звук вимкнено');
  }

  /* ── input ───────────────────────────────────────────────────── */
  function handleKeyDown(e) {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const key = e.key;
    const lower = key && key.length === 1 ? key.toLowerCase() : key;
    const modalOpen = isModalOpen();

    if (key === 'Escape') {
      if (modalOpen) {
        e.preventDefault();
        closeTopModal();
      }
      return;
    }

    if (modalOpen) {
      if (key === 'Enter') {
        if (!winModal.hidden) {
          e.preventDefault();
          if (G.levelIndex < LEVELS.length - 1) loadLevel(G.levelIndex + 1);
          else openFinal();
        } else if (!finalModal.hidden) {
          e.preventDefault();
          loadLevel(0);
        }
      }
      return;
    }

    const dir = KEY_CODES[e.code] || KEY_LETTERS[lower];
    if (dir) {
      e.preventDefault();
      sound.unlock();
      addHeld(dir);
      if (!G.anim) attemptMove(dir);
      return;
    }

    if (lower === 'z' || key === 'Backspace') {
      e.preventDefault();
      undo();
    } else if (lower === 'r') {
      e.preventDefault();
      restartLevel();
    } else if (lower === 'm') {
      e.preventDefault();
      toggleSound();
    } else if (lower === 'l') {
      e.preventDefault();
      sound.click();
      openLevels();
    } else if (lower === 'h' || key === '?') {
      e.preventDefault();
      sound.click();
      openHelp();
    }
  }

  function handleKeyUp(e) {
    const key = e.key;
    const lower = key && key.length === 1 ? key.toLowerCase() : key;
    const dir = KEY_CODES[e.code] || KEY_LETTERS[lower];
    if (dir) removeHeld(dir);
  }

  function bindInput() {
    window.addEventListener('keydown', handleKeyDown, { passive: false });
    window.addEventListener('keyup', handleKeyUp);

    let swipe = null;
    wrap.addEventListener('pointerdown', (e) => {
      sound.unlock();
      if (e.pointerType === 'mouse' && e.button !== 0) return;
      swipe = { x: e.clientX, y: e.clientY, id: e.pointerId };
    });
    wrap.addEventListener('pointerup', (e) => {
      if (!swipe || swipe.id !== e.pointerId) return;
      const dx = e.clientX - swipe.x;
      const dy = e.clientY - swipe.y;
      swipe = null;
      if (isModalOpen()) return;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 18) return;
      if (Math.abs(dx) > Math.abs(dy)) attemptMove(dx > 0 ? 'right' : 'left');
      else attemptMove(dy > 0 ? 'down' : 'up');
    });
    wrap.addEventListener('pointercancel', () => { swipe = null; });

    document.querySelectorAll('.dpad-btn').forEach((btn) => {
      const dir = btn.dataset.dir;
      const press = (e) => {
        if (isModalOpen()) return;
        e.preventDefault();
        try { btn.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
        btn.classList.add('is-active');
        addHeld(dir);
        if (!G.anim) attemptMove(dir);
      };
      const release = () => {
        btn.classList.remove('is-active');
        removeHeld(dir);
      };
      btn.addEventListener('pointerdown', () => sound.unlock());
      btn.addEventListener('pointerdown', press);
      btn.addEventListener('pointerup', release);
      btn.addEventListener('pointercancel', release);
      btn.addEventListener('lostpointercapture', release);
    });

    undoBtn.addEventListener('click', () => { sound.click(); undo(); });
    restartBtn.addEventListener('click', restartLevel);
    soundBtn.addEventListener('click', toggleSound);
    levelsBtn.addEventListener('click', () => { sound.click(); openLevels(); });
    helpBtn.addEventListener('click', () => { sound.click(); openHelp(); });

    levelsGrid.addEventListener('click', (e) => {
      const tile = e.target.closest('.level-tile');
      if (!tile || tile.disabled) return;
      const index = Number(tile.dataset.level);
      if (!Number.isFinite(index)) return;
      sound.click();
      closeAllModals();
      loadLevel(index);
    });

    document.querySelectorAll('.modal').forEach((modal) => {
      modal.addEventListener('pointerdown', (e) => {
        if (e.target === modal) closeModal(modal);
      });
      modal.querySelectorAll('[data-close]').forEach((btn) => {
        btn.addEventListener('click', () => { sound.click(); closeModal(modal); });
      });
    });

    $('nextLevelBtn').addEventListener('click', () => {
      sound.click();
      if (G.levelIndex < LEVELS.length - 1) loadLevel(G.levelIndex + 1);
      else openFinal();
    });
    $('replayBtn').addEventListener('click', () => { sound.click(); loadLevel(G.levelIndex); });
    $('winLevelsBtn').addEventListener('click', () => { sound.click(); closeAllModals(); openLevels(); });
    $('finalReplayBtn').addEventListener('click', () => { sound.click(); loadLevel(0); });
    $('finalLevelsBtn').addEventListener('click', () => { sound.click(); closeAllModals(); openLevels(); });

    document.addEventListener('visibilitychange', () => {
      if (document.hidden) pauseTimer();
      else if (!G.won && !isModalOpen()) resumeTimer();
    });

    if ('ResizeObserver' in window) {
      const ro = new ResizeObserver(scheduleLayout);
      ro.observe(wrap);
    } else {
      window.addEventListener('resize', scheduleLayout);
    }
    window.addEventListener('orientationchange', () => window.setTimeout(scheduleLayout, 120));
  }

  /* ── loop & init ─────────────────────────────────────────────── */
  function loop(now) {
    if (G.level) {
      G.time = now;
      if (G.anim && now - G.anim.t0 >= G.anim.dur) finishAnim(now);
      updateParticles(now);
      updateClock(now);
      render(now);
    }
    requestAnimationFrame(loop);
  }

  function init() {
    if (!LEVELS.length) {
      toast('Не вдалося завантажити рівні');
      return;
    }
    updateSoundUI();
    renderLevels();
    bindInput();
    loadLevel(0);
    requestAnimationFrame(loop);
    window.setTimeout(() => {
      if (!isModalOpen()) toast('Керуй стрілками — і штовхай кристал до сховища');
    }, 900);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
