/*
 * Q-GAME — billiard puzzle
 * Mechanics after Q by Henk Vergonet / Q-Game puzzle by Alexei Garbuzenko.
 * 60 classic levels are included in levels.js.
 */
(function () {
  'use strict';

  /* ============================================================
     Constants & helpers
     ============================================================ */

  var LEVELS = window.QGAME_LEVELS || [];
  var TOTAL = LEVELS.length;
  var STORE_KEY = 'qgame.progress.v1';
  var CUSTOM_KEY = 'qgame.custom.v1';
  var REDUCED = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var COLORS = {
    2: { name: 'Смарагд', key: 'green',  hex: '#34d399' },
    3: { name: 'Рубін',   key: 'red',    hex: '#ff5a5f' },
    4: { name: 'Сапфір',  key: 'blue',   hex: '#4f8cff' },
    5: { name: 'Бурштин', key: 'yellow', hex: '#ffd166' },
    6: { name: 'Аметист', key: 'magenta',hex: '#e879f9' },
    7: { name: 'Бірюза',  key: 'cyan',   hex: '#22d3ee' }
  };
  var COLOR_CODES = [3, 4, 2, 5, 6, 7];

  function $(id) { return document.getElementById(id); }
  function pad2(n) { return String(n).padStart(2, '0'); }
  function cloneGrid(g) { return g.map(function (row) { return row.slice(); }); }
  function isStone(code) { return code >= 2 && code <= 7; }
  function isSink(code) { return code >= 22 && code <= 77 && code % 11 === 0; }
  function sinkColor(code) { return code / 11; }
  function colorKey(code) { return COLORS[code] ? COLORS[code].key : 'red'; }
  function colorClass(code) { return 'c-' + colorKey(code); }
  function fmtTime(seconds) {
    var s = Math.max(0, Math.floor(seconds));
    return pad2(Math.floor(s / 60)) + ':' + pad2(s % 60);
  }
  function plural(n, forms) {
    var mod10 = n % 10;
    var mod100 = n % 100;
    if (mod10 === 1 && mod100 !== 11) return forms[0];
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return forms[1];
    return forms[2];
  }
  function clamp(n, min, max) { return Math.max(min, Math.min(max, n)); }
  function safeParse(value, fallback) {
    try { return JSON.parse(value); } catch (e) { return fallback; }
  }

  /* ============================================================
     DOM
     ============================================================ */

  var appEl = document.querySelector('.app');
  var boardHolder = $('boardHolder');
  var boardShell = $('boardShell');
  var boardEl = $('board');
  var tilesEl = $('tiles');
  var ballsLayer = $('ballsLayer');
  var boardCaption = $('boardCaption');

  var levelNumberEl = $('levelNumber');
  var levelNameEl = $('levelName');
  var packNameEl = $('packName');
  var levelTotalEl = $('levelTotal');
  var levelProgressBar = $('levelProgressBar');
  var movesStatEl = $('movesStat');
  var bestStatEl = $('bestStat');
  var timeStatEl = $('timeStat');
  var progressTextEl = $('progressText');
  var progressBarEl = $('progressBar');
  var levelsProgressTextEl = $('levelsProgressText');
  var customCountEl = $('customCount');
  var tipTextEl = $('tipText');

  var soundBtn = $('soundBtn');
  var helpBtn = $('helpBtn');
  var levelsBtn = $('levelsBtn');
  var brandBtn = $('brandBtn');
  var undoBtn = $('undoBtn');
  var restartBtn = $('restartBtn');
  var editorBtn = $('editorBtn');

  var levelsModal = $('levelsModal');
  var helpModal = $('helpModal');
  var editorModal = $('editorModal');
  var winOverlay = $('winOverlay');
  var levelGrid = $('levelGrid');
  var customList = $('customList');
  var tabClassic = $('tabClassic');
  var tabCustom = $('tabCustom');
  var createFromLevels = $('createFromLevels');
  var resetProgressBtn = $('resetProgressBtn');

  var winEyebrow = $('winEyebrow');
  var winTitle = $('winTitle');
  var winSub = $('winSub');
  var winMovesEl = $('winMoves');
  var winTimeEl = $('winTime');
  var winBestEl = $('winBest');
  var newBestEl = $('newBest');
  var nextLevelBtn = $('nextLevelBtn');
  var replayBtn = $('replayBtn');
  var winLevelsBtn = $('winLevelsBtn');
  var confettiCanvas = $('confettiCanvas');

  var editorBoard = $('editorBoard');
  var editorLegend = $('editorLegend');
  var edW = $('edW');
  var edH = $('edH');
  var edResize = $('edResize');
  var edName = $('edName');
  var edPlay = $('edPlay');
  var edSave = $('edSave');
  var edClear = $('edClear');
  var ballPalette = $('ballPalette');
  var sinkPalette = $('sinkPalette');
  var toastEl = $('toast');

  /* ============================================================
     Persistent data
     ============================================================ */

  function defaultProgress() {
    return { completed: {}, lastLevel: 1, sound: true, seenHelp: false };
  }

  function loadProgress() {
    var raw = safeParse(localStorage.getItem(STORE_KEY) || '{}', {});
    var p = defaultProgress();
    if (!raw || typeof raw !== 'object') return p;
    p.sound = raw.sound !== false;
    p.seenHelp = raw.seenHelp === true;
    p.lastLevel = clamp(parseInt(raw.lastLevel, 10) || 1, 1, Math.max(1, TOTAL));
    if (raw.completed && typeof raw.completed === 'object') {
      Object.keys(raw.completed).forEach(function (key) {
        var id = parseInt(key, 10);
        if (!id || id < 1 || id > TOTAL) return;
        var val = raw.completed[key];
        if (typeof val === 'number') {
          p.completed[id] = { moves: val, time: 0 };
        } else if (val && typeof val === 'object' && typeof val.moves === 'number') {
          p.completed[id] = {
            moves: Math.max(0, Math.floor(val.moves)),
            time: Math.max(0, Math.floor(val.time || 0))
          };
        }
      });
    }
    return p;
  }

  function saveProgress() {
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(progress));
    } catch (e) {
      toast('Не вдалося зберегти прогрес у браузері');
    }
  }

  function loadCustomLevels() {
    var raw = safeParse(localStorage.getItem(CUSTOM_KEY) || '[]', []);
    if (!Array.isArray(raw)) return [];
    return raw.filter(validateCustomShape).map(function (item) {
      return {
        id: String(item.id),
        name: String(item.name || 'Мій рівень').slice(0, 40),
        w: item.w,
        h: item.h,
        grid: cloneGrid(item.grid),
        best: typeof item.best === 'number' ? item.best : null,
        bestTime: typeof item.bestTime === 'number' ? item.bestTime : null,
        completed: item.completed === true
      };
    });
  }

  function validateCustomShape(item) {
    if (!item || typeof item !== 'object') return false;
    if (typeof item.id !== 'string' || !item.id) return false;
    var w = parseInt(item.w, 10);
    var h = parseInt(item.h, 10);
    if (w < 5 || w > 13 || h < 5 || h > 13) return false;
    if (!Array.isArray(item.grid) || item.grid.length !== h) return false;
    for (var r = 0; r < h; r++) {
      if (!Array.isArray(item.grid[r]) || item.grid[r].length !== w) return false;
      for (var c = 0; c < w; c++) {
        var code = item.grid[r][c];
        if (code !== 0 && code !== 1 && !isStone(code) && !isSink(code)) return false;
      }
    }
    return true;
  }

  function saveCustomLevels() {
    try {
      localStorage.setItem(CUSTOM_KEY, JSON.stringify(customLevels));
    } catch (e) {
      toast('Не вдалося зберегти рівень: сховище переповнене');
    }
  }

  var progress = loadProgress();
  var customLevels = loadCustomLevels();
  var soundOn = progress.sound !== false;

  /* ============================================================
     Runtime state
     ============================================================ */

  var level = null;
  var levelRef = { pack: 'classic', id: progress.lastLevel || 1 };
  var history = [];
  var moves = 0;
  var selectedId = null;
  var elapsed = 0;
  var timerRunning = false;
  var timerStart = 0;
  var timerHandle = 0;
  var animating = false;
  var cell = 48;
  var layoutRaf = 0;
  var currentTab = 'classic';
  var toastTimer = 0;
  var audioCtx = null;
  var confettiRaf = 0;
  var confettiParticles = [];
  var lastFocusBeforeModal = null;
  var editor = {
    initialized: false,
    editingId: null,
    w: 9,
    h: 9,
    grid: null,
    code: 0,
    name: '',
    painting: false,
    erase: false
  };

  var TIPS = [
    'Думай прямими лініями: куля не зупиниться там, де ти хочеш, лише там, де її щось зупинить.',
    'Своя луза спрацьовує як магніт: куля впаде, щойно дійде до неї. Проскочити не вийде.',
    'Луза іншого кольору — це стіна. Вона допоможе зупинити кулю в потрібному місці.',
    'Інші кулі теж зупиняють. Іноді їх варто залишити на полі як бортики.',
    'Спочатку прибери кулі, які мають найменше варіантів. Так звільниться простір для інших.',
    'Один хід може відкрити одразу два шляхи. Не поспішай — спробуй подумки пройти рівень назад.',
    'Якщо застряг, натисни «Скасувати» і спробуй інший напрямок. Тут немає штрафів.',
    'Куля летить до останньої вільної клітинки. Рахуй клітинки, а не відстань «на око».'
  ];

  /* ============================================================
     Audio
     ============================================================ */

  function ensureAudio() {
    if (!soundOn) return null;
    try {
      if (!audioCtx) {
        var Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) return null;
        audioCtx = new Ctx();
      }
      if (audioCtx.state === 'suspended') audioCtx.resume();
      return audioCtx;
    } catch (e) {
      return null;
    }
  }

  function tone(freq, duration, type, gain, delay, slideTo) {
    var ctx = ensureAudio();
    if (!ctx) return;
    var t0 = ctx.currentTime + (delay || 0);
    var osc = ctx.createOscillator();
    var amp = ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + duration);
    amp.gain.setValueAtTime(0.0001, t0);
    amp.gain.exponentialRampToValueAtTime(gain || 0.04, t0 + 0.012);
    amp.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
    osc.connect(amp);
    amp.connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + duration + 0.02);
  }

  function noiseBurst(duration, gain, cutoff) {
    var ctx = ensureAudio();
    if (!ctx) return;
    var length = Math.max(1, Math.floor(ctx.sampleRate * duration));
    var buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    var data = buffer.getChannelData(0);
    for (var i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    }
    var src = ctx.createBufferSource();
    src.buffer = buffer;
    var filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = cutoff || 900;
    var amp = ctx.createGain();
    amp.gain.value = gain || 0.025;
    src.connect(filter);
    filter.connect(amp);
    amp.connect(ctx.destination);
    src.start();
  }

  function playSelect() {
    tone(620, 0.06, 'sine', 0.028);
    tone(880, 0.08, 'sine', 0.022, 0.045);
  }
  function playMove(cells) {
    noiseBurst(0.11 + Math.min(0.12, cells * 0.012), 0.016, 1100);
    tone(190, 0.13, 'triangle', 0.018, 0, 115);
  }
  function playBump() {
    tone(95, 0.09, 'sine', 0.045, 0, 62);
    noiseBurst(0.05, 0.012, 500);
  }
  function playPocket() {
    tone(520, 0.26, 'sine', 0.052, 0, 86);
    tone(1040, 0.09, 'triangle', 0.02, 0.03);
    tone(1560, 0.08, 'sine', 0.012, 0.09);
  }
  function playUndo() {
    tone(440, 0.07, 'sine', 0.025);
    tone(330, 0.09, 'sine', 0.02, 0.055);
  }
  function playWin() {
    var notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach(function (freq, i) {
      tone(freq, 0.34, 'triangle', 0.038, i * 0.105);
      tone(freq * 2, 0.2, 'sine', 0.012, i * 0.105 + 0.01);
    });
    tone(1318.5, 0.5, 'sine', 0.02, 0.46);
  }

  function updateSoundUI() {
    soundBtn.classList.toggle('is-off', !soundOn);
    soundBtn.setAttribute('aria-label', soundOn ? 'Вимкнути звук' : 'Увімкнути звук');
    soundBtn.setAttribute('title', (soundOn ? 'Вимкнути звук' : 'Увімкнути звук') + ' (M)');
    soundBtn.innerHTML = '<svg><use href="' + (soundOn ? '#i-sound' : '#i-mute') + '"></use></svg>';
  }

  function toggleSound() {
    soundOn = !soundOn;
    progress.sound = soundOn;
    saveProgress();
    updateSoundUI();
    if (soundOn) playSelect();
    toast(soundOn ? 'Звук увімкнено' : 'Звук вимкнено');
  }

  /* ============================================================
     Level utilities
     ============================================================ */

  function levelById(id) {
    for (var i = 0; i < LEVELS.length; i++) {
      if (LEVELS[i].id === id) return LEVELS[i];
    }
    return null;
  }

  function customById(id) {
    for (var i = 0; i < customLevels.length; i++) {
      if (customLevels[i].id === id) return customLevels[i];
    }
    return null;
  }

  function ballsInGrid(grid, h, w) {
    var balls = [];
    var nextId = 1;
    for (var r = 0; r < h; r++) {
      for (var c = 0; c < w; c++) {
        if (isStone(grid[r][c])) {
          balls.push({ id: nextId++, color: grid[r][c], r: r, c: c, alive: true });
        }
      }
    }
    return balls;
  }

  function countBalls(grid) {
    var n = 0;
    for (var r = 0; r < grid.length; r++) {
      for (var c = 0; c < grid[r].length; c++) {
        if (isStone(grid[r][c])) n++;
      }
    }
    return n;
  }

  function uniqueColors(grid) {
    var seen = {};
    var out = [];
    for (var r = 0; r < grid.length; r++) {
      for (var c = 0; c < grid[r].length; c++) {
        var code = grid[r][c];
        if (isStone(code) && !seen[code]) {
          seen[code] = true;
          out.push(code);
        }
      }
    }
    return out;
  }

  function levelMeta(data) {
    var balls = countBalls(data.grid);
    return data.w + '×' + data.h + ' · ' + balls + ' ' + plural(balls, ['куля', 'кулі', 'куль']);
  }

  function getLevelData(ref) {
    if (ref.pack === 'custom') {
      var c = customById(ref.id);
      if (!c) return null;
      return {
        pack: 'custom',
        id: c.id,
        w: c.w,
        h: c.h,
        grid: cloneGrid(c.grid),
        name: c.name,
        meta: c.w + '×' + c.h + ' · ' + countBalls(c.grid) + ' ' + plural(countBalls(c.grid), ['куля', 'кулі', 'куль'])
      };
    }
    var lv = levelById(ref.id) || LEVELS[0];
    if (!lv) return null;
    return {
      pack: 'classic',
      id: lv.id,
      w: lv.w,
      h: lv.h,
      grid: cloneGrid(lv.grid),
      name: 'Класичний рівень',
      meta: levelMeta(lv)
    };
  }

  function bestForLevel() {
    if (!level) return null;
    if (level.pack === 'classic') {
      return progress.completed[level.id] || null;
    }
    var c = customById(level.id);
    if (c && typeof c.best === 'number') return { moves: c.best, time: c.bestTime || 0 };
    return null;
  }

  /* ============================================================
     Rendering
     ============================================================ */

  function renderTiles() {
    tilesEl.innerHTML = '';
    if (!level) return;
    tilesEl.style.gridTemplateColumns = 'repeat(' + level.w + ', var(--cell))';
    tilesEl.style.gridTemplateRows = 'repeat(' + level.h + ', var(--cell))';
    var frag = document.createDocumentFragment();
    for (var r = 0; r < level.h; r++) {
      for (var c = 0; c < level.w; c++) {
        var code = level.base[r][c];
        var tile = document.createElement('div');
        var cls = 'tile';
        if (code === 1) cls += ' wall';
        else if (isSink(code)) cls += ' sink ' + colorClass(sinkColor(code));
        else cls += ' floor';
        tile.className = cls;
        tile.dataset.r = String(r);
        tile.dataset.c = String(c);
        frag.appendChild(tile);
      }
    }
    tilesEl.appendChild(frag);
  }

  function ballElement(id) {
    return ballsLayer.querySelector('.ball[data-id="' + id + '"]');
  }

  function renderBalls() {
    if (!level) return;
    var alive = {};
    level.balls.forEach(function (b) {
      if (b.alive) alive[b.id] = b;
    });

    Array.prototype.slice.call(ballsLayer.children).forEach(function (el) {
      var id = parseInt(el.dataset.id, 10);
      if (!alive[id]) el.remove();
    });

    level.balls.forEach(function (b) {
      if (!b.alive) return;
      var el = ballElement(b.id);
      if (!el) {
        el = document.createElement('div');
        el.className = 'ball ' + colorClass(b.color);
        el.dataset.id = String(b.id);
        el.setAttribute('aria-hidden', 'true');
        ballsLayer.appendChild(el);
      }
      el.style.transform = 'translate(' + (b.c * cell) + 'px,' + (b.r * cell) + 'px)';
      el.classList.toggle('selected', b.id === selectedId);
    });
  }

  function scheduleLayout() {
    if (layoutRaf) return;
    layoutRaf = requestAnimationFrame(function () {
      layoutRaf = 0;
      layoutBoard();
    });
  }

  function layoutBoard() {
    if (!level || !boardHolder) return;
    var rect = boardHolder.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    var frame = 38;
    var availW = Math.max(80, rect.width - frame);
    var availH = Math.max(80, rect.height - frame);
    var size = Math.min(availW / level.w, availH / level.h);
    size = clamp(Math.floor(size), 16, 88);
    cell = size;
    boardEl.style.width = (level.w * cell) + 'px';
    boardEl.style.height = (level.h * cell) + 'px';
    boardEl.style.setProperty('--cell', cell + 'px');

    ballsLayer.classList.add('no-transition');
    level.balls.forEach(function (b) {
      if (!b.alive) return;
      var el = ballElement(b.id);
      if (el) el.style.transform = 'translate(' + (b.c * cell) + 'px,' + (b.r * cell) + 'px)';
    });
    void ballsLayer.offsetWidth;
    ballsLayer.classList.remove('no-transition');
  }

  function updateUI() {
    if (!level) return;
    var classic = level.pack === 'classic';
    packNameEl.textContent = classic ? 'Класика' : 'Мої рівні';
    levelNumberEl.textContent = classic ? pad2(level.id) : 'М';
    levelTotalEl.textContent = classic ? 'з ' + TOTAL : 'власний';
    levelNameEl.textContent = classic ? level.meta : level.name;
    levelNameEl.title = classic ? level.meta : level.name;
    levelProgressBar.style.width = classic ? ((level.id / TOTAL) * 100) + '%' : '100%';

    movesStatEl.textContent = String(moves);
    timeStatEl.textContent = fmtTime(elapsed);
    var best = bestForLevel();
    bestStatEl.textContent = best ? String(best.moves) : '—';
    bestStatEl.classList.toggle('is-best', !!best);

    undoBtn.disabled = history.length === 0 || animating || level.completed;
    restartBtn.disabled = animating;

    updateProgressUI();
    updateCaption();
    updateTip();
  }

  function updateProgressUI() {
    var done = 0;
    Object.keys(progress.completed).forEach(function (id) {
      if (progress.completed[id]) done++;
    });
    progressTextEl.textContent = done + ' / ' + TOTAL;
    progressBarEl.style.width = (TOTAL ? (done / TOTAL) * 100 : 0) + '%';
    levelsProgressTextEl.textContent = done + ' з ' + TOTAL + ' пройдено';
    customCountEl.textContent = String(customLevels.length);
  }

  function updateCaption() {
    if (!level) return;
    if (level.completed) {
      boardCaption.textContent = 'Рівень пройдено — можна йти далі';
      boardCaption.classList.add('is-accent');
      return;
    }
    var sel = getSelectedBall();
    if (sel) {
      boardCaption.textContent = 'Куля обрана — свайпни, натисни стрілку або клікни в потрібний бік';
      boardCaption.classList.add('is-accent');
    } else {
      boardCaption.textContent = 'Обери кулю, щоб почати';
      boardCaption.classList.remove('is-accent');
    }
  }

  function updateTip() {
    if (!level) return;
    var idx = level.pack === 'classic' ? (level.id - 1) % TIPS.length : (customLevels.length + moves) % TIPS.length;
    tipTextEl.textContent = TIPS[idx];
  }

  /* ============================================================
     Selection & movement
     ============================================================ */

  function getSelectedBall() {
    if (selectedId == null || !level) return null;
    for (var i = 0; i < level.balls.length; i++) {
      var b = level.balls[i];
      if (b.id === selectedId && b.alive) return b;
    }
    return null;
  }

  function ballAt(r, c) {
    if (!level) return null;
    for (var i = 0; i < level.balls.length; i++) {
      var b = level.balls[i];
      if (b.alive && b.r === r && b.c === c) return b;
    }
    return null;
  }

  function selectFirstBall() {
    if (!level) return;
    for (var i = 0; i < level.balls.length; i++) {
      if (level.balls[i].alive) {
        selectedId = level.balls[i].id;
        renderBalls();
        updateCaption();
        return;
      }
    }
    selectedId = null;
  }

  function computeSlide(ball, dr, dc) {
    var r = ball.r;
    var c = ball.c;
    var code = ball.color;
    var cr = r;
    var cc = c;
    var path = [];
    var entered = false;
    var sinkR = -1;
    var sinkC = -1;

    for (;;) {
      var nr = cr + dr;
      var nc = cc + dc;
      if (nr < 0 || nr >= level.h || nc < 0 || nc >= level.w) break;
      var next = level.grid[nr][nc];
      if (next === 0) {
        cr = nr;
        cc = nc;
        path.push([cr, cc]);
        continue;
      }
      if (isSink(next) && sinkColor(next) === code) {
        path.push([nr, nc]);
        entered = true;
        sinkR = nr;
        sinkC = nc;
        cr = nr;
        cc = nc;
      }
      break;
    }

    if (!entered && cr === r && cc === c) return null;
    return {
      r: cr,
      c: cc,
      path: path,
      entered: entered,
      sinkR: sinkR,
      sinkC: sinkC
    };
  }

  function snapshot() {
    return {
      grid: cloneGrid(level.grid),
      balls: level.balls.map(function (b) { return { id: b.id, color: b.color, r: b.r, c: b.c, alive: b.alive }; }),
      selectedId: selectedId,
      moves: moves
    };
  }

  function tryMove(dr, dc) {
    if (!level || animating || level.completed) return;
    if (!selectedId) {
      selectFirstBall();
      if (!selectedId) return;
    }
    var ball = getSelectedBall();
    if (!ball) {
      selectFirstBall();
      return;
    }
    var slide = computeSlide(ball, dr, dc);
    if (!slide) {
      bumpBall(ball);
      return;
    }
    executeMove(ball, slide);
  }

  function bumpBall(ball) {
    playBump();
    var el = ballElement(ball.id);
    if (!el) return;
    el.classList.remove('bump');
    void el.offsetWidth;
    el.classList.add('bump');
    window.setTimeout(function () { el.classList.remove('bump'); }, 260);
  }

  function executeMove(ball, slide) {
    history.push(snapshot());
    if (history.length > 400) history.shift();

    var color = ball.color;
    level.grid[ball.r][ball.c] = 0;
    moves++;
    startTimer();

    var duration = REDUCED ? 12 : Math.min(640, 105 + slide.path.length * 58);
    var el = ballElement(ball.id);

    if (slide.entered) {
      ball.alive = false;
      ball.r = slide.r;
      ball.c = slide.c;
      flashSink(slide.sinkR, slide.sinkC);
    } else {
      ball.r = slide.r;
      ball.c = slide.c;
      level.grid[ball.r][ball.c] = color;
    }

    animating = true;
    undoBtn.disabled = true;
    restartBtn.disabled = true;

    if (el) {
      el.style.transition = 'transform ' + duration + 'ms cubic-bezier(.2,.7,.2,1)';
      el.style.transform = 'translate(' + (slide.c * cell) + 'px,' + (slide.r * cell) + 'px)';
    }

    playMove(slide.path.length);
    updateUI();

    window.setTimeout(function () {
      if (el) {
        el.style.transition = '';
        if (slide.entered) el.classList.add('dropping');
      }

      if (slide.entered) {
        playPocket();
        window.setTimeout(function () {
          if (el) el.remove();
          var next = null;
          for (var i = 0; i < level.balls.length; i++) {
            if (level.balls[i].alive) { next = level.balls[i]; break; }
          }
          selectedId = next ? next.id : null;
          animating = false;
          renderBalls();
          updateUI();
          if (!level.balls.some(function (b) { return b.alive; })) {
            winLevel();
          }
        }, REDUCED ? 0 : 180);
      } else {
        animating = false;
        renderBalls();
        updateUI();
      }
    }, duration);
  }

  function flashSink(r, c) {
    var tile = tilesEl.querySelector('.tile[data-r="' + r + '"][data-c="' + c + '"]');
    if (!tile) return;
    tile.classList.remove('flash');
    void tile.offsetWidth;
    tile.classList.add('flash');
    window.setTimeout(function () { tile.classList.remove('flash'); }, 620);
  }

  function undoMove() {
    if (!level || animating || level.completed || !history.length) return;
    var state = history.pop();
    level.grid = state.grid;
    level.balls = state.balls;
    selectedId = state.selectedId;
    moves = state.moves;
    playUndo();
    renderBalls();
    updateUI();
  }

  function resetRuntime() {
    if (!level) return;
    stopTimer();
    history = [];
    moves = 0;
    elapsed = 0;
    animating = false;
    level.completed = false;
    level.grid = cloneGrid(level.base);
    level.balls = ballsInGrid(level.base, level.h, level.w);
    selectedId = level.balls.length ? level.balls[0].id : null;
    renderTiles();
    scheduleLayout();
    renderBalls();
    updateUI();
  }

  function restartLevel() {
    if (!level || animating) return;
    closeWin();
    resetRuntime();
    toast('Рівень розпочато спочатку');
  }

  /* ============================================================
     Timer
     ============================================================ */

  function startTimer() {
    if (!level || level.completed || timerRunning) return;
    timerRunning = true;
    timerStart = performance.now() - elapsed * 1000;
    clearInterval(timerHandle);
    timerHandle = window.setInterval(function () {
      if (!timerRunning) return;
      elapsed = (performance.now() - timerStart) / 1000;
      timeStatEl.textContent = fmtTime(elapsed);
    }, 250);
  }

  function stopTimer() {
    if (timerRunning) {
      elapsed = (performance.now() - timerStart) / 1000;
      timerRunning = false;
    }
    clearInterval(timerHandle);
    timerHandle = 0;
    if (level) timeStatEl.textContent = fmtTime(elapsed);
  }

  /* ============================================================
     Level loading
     ============================================================ */

  function loadLevel(ref, options) {
    options = options || {};
    var data = getLevelData(ref);
    if (!data) {
      toast('Рівень не знайдено');
      return;
    }
    closeWin();
    stopTimer();
    animating = false;
    history = [];
    moves = 0;
    elapsed = 0;
    levelRef = { pack: data.pack, id: data.id };
    level = {
      pack: data.pack,
      id: data.id,
      w: data.w,
      h: data.h,
      name: data.name,
      meta: data.meta,
      base: cloneGrid(data.grid),
      grid: cloneGrid(data.grid),
      balls: ballsInGrid(data.grid, data.h, data.w),
      completed: false
    };
    selectedId = level.balls.length ? level.balls[0].id : null;

    if (level.pack === 'classic') {
      progress.lastLevel = level.id;
      saveProgress();
    }

    renderTiles();
    scheduleLayout();
    renderBalls();
    updateUI();

    boardEl.classList.remove('level-in');
    void boardEl.offsetWidth;
    boardEl.classList.add('level-in');

    if (options.toast) toast(options.toast);
  }

  function nextLevel() {
    if (!level) return;
    if (level.pack === 'classic') {
      if (level.id < TOTAL) {
        closeWin();
        loadLevel({ pack: 'classic', id: level.id + 1 });
      } else {
        closeWin();
        openLevels('classic');
      }
      return;
    }
    var idx = -1;
    for (var i = 0; i < customLevels.length; i++) {
      if (customLevels[i].id === level.id) { idx = i; break; }
    }
    if (idx >= 0 && idx < customLevels.length - 1) {
      closeWin();
      loadLevel({ pack: 'custom', id: customLevels[idx + 1].id });
    } else {
      closeWin();
      openLevels('custom');
    }
  }

  /* ============================================================
     Win flow
     ============================================================ */

  function winLevel() {
    if (!level || level.completed) return;
    level.completed = true;
    stopTimer();
    var time = Math.max(0, Math.round(elapsed));
    var prev = bestForLevel();
    var newBest = !prev || moves < prev.moves || (moves === prev.moves && time < (prev.time || 0));

    if (level.pack === 'classic') {
      progress.completed[level.id] = {
        moves: newBest ? moves : prev.moves,
        time: newBest ? time : (prev.time || 0)
      };
      saveProgress();
    } else {
      var custom = customById(level.id);
      if (custom) {
        if (newBest) {
          custom.best = moves;
          custom.bestTime = time;
        }
        custom.completed = true;
        saveCustomLevels();
      }
    }

    var best = bestForLevel();
    winEyebrow.textContent = level.pack === 'classic'
      ? 'Рівень ' + pad2(level.id) + ' · класика'
      : 'Мій рівень · ' + level.name;
    winTitle.textContent = 'Рівень пройдено!';
    winSub.textContent = level.pack === 'classic' && level.id === TOTAL
      ? 'Усі 60 класичних рівнів пройдено. Ти справжній майстер Q!'
      : 'Усі кулі в лузах. Гарна робота.';
    winMovesEl.textContent = String(moves);
    winTimeEl.textContent = fmtTime(time);
    winBestEl.textContent = best ? String(best.moves) : String(moves);
    newBestEl.hidden = !newBest;

    var isLast = (level.pack === 'classic' && level.id === TOTAL) ||
      (level.pack === 'custom' && customLevels.length > 0 && customLevels[customLevels.length - 1].id === level.id);
    nextLevelBtn.querySelector('span').textContent = isLast ? 'До рівнів' : 'Наступний рівень';

    updateUI();
    renderLevelGrid();
    renderCustomList();
    updateProgressUI();

    playWin();
    openWin();
    startConfetti();
  }

  function openWin() {
    lastFocusBeforeModal = document.activeElement;
    winOverlay.classList.add('open');
    winOverlay.setAttribute('aria-hidden', 'false');
    winOverlay.inert = false;
    syncInert();
    window.setTimeout(function () { nextLevelBtn.focus(); }, 80);
  }

  function closeWin() {
    if (!winOverlay.classList.contains('open')) return;
    winOverlay.classList.remove('open');
    winOverlay.setAttribute('aria-hidden', 'true');
    winOverlay.inert = true;
    stopConfetti();
    syncInert();
    if (lastFocusBeforeModal && document.contains(lastFocusBeforeModal)) {
      try { lastFocusBeforeModal.focus(); } catch (e) {}
    }
  }

  /* ============================================================
     Confetti
     ============================================================ */

  function startConfetti() {
    if (REDUCED || !confettiCanvas) return;
    stopConfetti();
    var dpr = Math.min(2, window.devicePixelRatio || 1);
    var w = window.innerWidth;
    var h = window.innerHeight;
    confettiCanvas.width = Math.floor(w * dpr);
    confettiCanvas.height = Math.floor(h * dpr);
    confettiCanvas.style.width = w + 'px';
    confettiCanvas.style.height = h + 'px';
    var ctx = confettiCanvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    var colors = ['#ff5a5f', '#4f8cff', '#34d399', '#ffd166', '#e879f9', '#22d3ee', '#e8b86a'];
    confettiParticles = [];
    for (var i = 0; i < 130; i++) {
      confettiParticles.push({
        x: w * (0.15 + Math.random() * 0.7),
        y: h * (0.18 + Math.random() * 0.2),
        vx: (Math.random() - 0.5) * 8,
        vy: -3 - Math.random() * 7,
        g: 0.16 + Math.random() * 0.12,
        size: 4 + Math.random() * 7,
        rot: Math.random() * Math.PI * 2,
        spin: (Math.random() - 0.5) * 0.24,
        color: colors[(Math.random() * colors.length) | 0],
        life: 0,
        maxLife: 110 + Math.random() * 90,
        shape: Math.random() > 0.35 ? 'rect' : 'circle'
      });
    }
    var start = performance.now();
    function frame(now) {
      var t = now - start;
      ctx.clearRect(0, 0, w, h);
      var alive = 0;
      for (var i = 0; i < confettiParticles.length; i++) {
        var p = confettiParticles[i];
        p.life++;
        if (p.life > p.maxLife) continue;
        alive++;
        p.vy += p.g;
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.994;
        p.rot += p.spin;
        var alpha = p.life < 12 ? p.life / 12 : Math.max(0, 1 - (p.life - 12) / (p.maxLife - 12));
        ctx.save();
        ctx.globalAlpha = alpha * 0.92;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.fillStyle = p.color;
        if (p.shape === 'rect') {
          ctx.fillRect(-p.size / 2, -p.size / 3, p.size, p.size * 0.66);
        } else {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }
      if (alive > 0 && t < 6500) {
        confettiRaf = requestAnimationFrame(frame);
      } else {
        ctx.clearRect(0, 0, w, h);
        confettiRaf = 0;
      }
    }
    confettiRaf = requestAnimationFrame(frame);
  }

  function stopConfetti() {
    if (confettiRaf) cancelAnimationFrame(confettiRaf);
    confettiRaf = 0;
    confettiParticles = [];
    if (confettiCanvas) {
      var ctx = confettiCanvas.getContext('2d');
      ctx.clearRect(0, 0, confettiCanvas.width, confettiCanvas.height);
    }
  }

  /* ============================================================
     Level select
     ============================================================ */

  function openLevels(tab) {
    closeWin();
    currentTab = tab || (levelRef.pack === 'custom' ? 'custom' : 'classic');
    setTab(currentTab);
    renderLevelGrid();
    renderCustomList();
    updateProgressUI();
    openModal(levelsModal, levelsBtn);
    window.setTimeout(function () {
      var active = levelGrid.querySelector('.level-tile.is-current') || customList.querySelector('.custom-row.is-current');
      if (active && active.scrollIntoView) active.scrollIntoView({ block: 'nearest', behavior: REDUCED ? 'auto' : 'smooth' });
    }, 120);
  }

  function setTab(tab) {
    currentTab = tab;
    var classic = tab === 'classic';
    tabClassic.classList.toggle('is-active', classic);
    tabCustom.classList.toggle('is-active', !classic);
    tabClassic.setAttribute('aria-selected', String(classic));
    tabCustom.setAttribute('aria-selected', String(!classic));
    levelGrid.hidden = !classic;
    customList.hidden = classic;
  }

  function renderLevelGrid() {
    if (!levelGrid) return;
    levelGrid.innerHTML = '';
    var frag = document.createDocumentFragment();
    LEVELS.forEach(function (lv) {
      var done = !!progress.completed[lv.id];
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'level-tile' + (levelRef.pack === 'classic' && levelRef.id === lv.id ? ' is-current' : '');
      btn.dataset.id = String(lv.id);
      btn.setAttribute('aria-label', 'Рівень ' + lv.id + (done ? ', пройдено' : ''));
      if (done) btn.classList.add('is-done');

      var thumb = document.createElement('span');
      thumb.className = 'level-thumb';
      var canvas = document.createElement('canvas');
      canvas.width = 160;
      canvas.height = 136;
      thumb.appendChild(canvas);

      var foot = document.createElement('span');
      foot.className = 'level-tile-foot';
      var num = document.createElement('span');
      num.className = 'level-tile-num';
      num.textContent = pad2(lv.id);
      var dots = document.createElement('span');
      dots.className = 'level-tile-balls';
      uniqueColors(lv.grid).forEach(function (code) {
        var dot = document.createElement('span');
        dot.className = 'mini-ball ' + colorClass(code);
        dots.appendChild(dot);
      });
      foot.appendChild(num);
      foot.appendChild(dots);

      if (done) {
        var check = document.createElement('span');
        check.className = 'level-done';
        check.innerHTML = '<svg><use href="#i-check"></use></svg>';
        btn.appendChild(check);
      }
      btn.appendChild(thumb);
      btn.appendChild(foot);
      frag.appendChild(btn);
      drawThumb(canvas, lv);
    });
    levelGrid.appendChild(frag);
  }

  function drawThumb(canvas, lv) {
    var W = canvas.width;
    var H = canvas.height;
    var ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, W, H);
    var bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, '#0d332b');
    bg.addColorStop(1, '#061b17');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    var pad = 8;
    var s = Math.min((W - pad * 2) / lv.w, (H - pad * 2) / lv.h);
    var ox = (W - lv.w * s) / 2;
    var oy = (H - lv.h * s) / 2;

    for (var r = 0; r < lv.h; r++) {
      for (var c = 0; c < lv.w; c++) {
        var code = lv.grid[r][c];
        var x = ox + c * s;
        var y = oy + r * s;
        if (code === 1) {
          ctx.fillStyle = '#223149';
          ctx.fillRect(x + 0.5, y + 0.5, Math.max(1, s - 1), Math.max(1, s - 1));
          ctx.fillStyle = 'rgba(255,255,255,.08)';
          ctx.fillRect(x + 0.5, y + 0.5, Math.max(1, s - 1), Math.max(1, s * 0.18));
        } else if (isSink(code)) {
          var sc = COLORS[sinkColor(code)] ? COLORS[sinkColor(code)].hex : '#fff';
          var cx = x + s / 2;
          var cy = y + s / 2;
          var rr = s * 0.33;
          ctx.beginPath();
          ctx.arc(cx, cy, rr, 0, Math.PI * 2);
          ctx.fillStyle = sc;
          ctx.fill();
          ctx.beginPath();
          ctx.arc(cx, cy, rr * 0.62, 0, Math.PI * 2);
          ctx.fillStyle = '#03080c';
          ctx.fill();
        } else if (isStone(code)) {
          var bc = COLORS[code] ? COLORS[code].hex : '#fff';
          var bx = x + s / 2;
          var by = y + s / 2;
          var br = s * 0.32;
          var grad = ctx.createRadialGradient(bx - br * 0.35, by - br * 0.4, br * 0.1, bx, by, br);
          grad.addColorStop(0, '#ffffff');
          grad.addColorStop(0.18, bc);
          grad.addColorStop(1, '#07101a');
          ctx.beginPath();
          ctx.arc(bx, by, br, 0, Math.PI * 2);
          ctx.fillStyle = grad;
          ctx.fill();
        }
      }
    }
  }

  function renderCustomList() {
    if (!customList) return;
    customList.innerHTML = '';
    if (!customLevels.length) {
      var empty = document.createElement('div');
      empty.className = 'custom-empty';
      empty.innerHTML =
        '<span class="empty-icon"><svg><use href="#i-edit"></use></svg></span>' +
        '<p>Тут з\u2019являться твої рівні. Намалюй поле, розстав кулі та лузи — і грай.</p>' +
        '<button class="btn btn-gold" type="button" id="emptyCreateBtn"><svg class="btn-icon"><use href="#i-plus"></use></svg><span>Створити рівень</span></button>';
      customList.appendChild(empty);
      var emptyCreate = $('emptyCreateBtn');
      if (emptyCreate) emptyCreate.addEventListener('click', function () { openEditor(); });
      return;
    }

    customLevels.forEach(function (lv) {
      var row = document.createElement('div');
      row.className = 'custom-row' + (levelRef.pack === 'custom' && levelRef.id === lv.id ? ' is-current' : '');
      row.dataset.id = lv.id;

      var thumb = document.createElement('div');
      thumb.className = 'custom-row-thumb';
      var canvas = document.createElement('canvas');
      canvas.width = 108;
      canvas.height = 108;
      thumb.appendChild(canvas);

      var info = document.createElement('div');
      info.className = 'custom-row-info';
      var title = document.createElement('strong');
      title.textContent = lv.name;
      var meta = document.createElement('span');
      var balls = countBalls(lv.grid);
      meta.textContent = lv.w + '×' + lv.h + ' · ' + balls + ' ' + plural(balls, ['куля', 'кулі', 'куль']) +
        (lv.best ? ' · рекорд ' + lv.best : ' · ще не пройдено');
      info.appendChild(title);
      info.appendChild(meta);

      var actions = document.createElement('div');
      actions.className = 'custom-row-actions';
      var play = document.createElement('button');
      play.type = 'button';
      play.className = 'icon-btn';
      play.setAttribute('aria-label', 'Грати рівень ' + lv.name);
      play.innerHTML = '<svg><use href="#i-play"></use></svg>';
      play.addEventListener('click', function () {
        closeModal(levelsModal);
        loadLevel({ pack: 'custom', id: lv.id });
      });
      var edit = document.createElement('button');
      edit.type = 'button';
      edit.className = 'icon-btn';
      edit.setAttribute('aria-label', 'Редагувати рівень ' + lv.name);
      edit.innerHTML = '<svg><use href="#i-edit"></use></svg>';
      edit.addEventListener('click', function () {
        closeModal(levelsModal);
        openEditor(lv.id);
      });
      var del = document.createElement('button');
      del.type = 'button';
      del.className = 'icon-btn';
      del.setAttribute('aria-label', 'Видалити рівень ' + lv.name);
      del.innerHTML = '<svg><use href="#i-trash"></use></svg>';
      del.addEventListener('click', function () {
        if (!window.confirm('Видалити рівень «' + lv.name + '»?')) return;
        customLevels = customLevels.filter(function (x) { return x.id !== lv.id; });
        saveCustomLevels();
        if (levelRef.pack === 'custom' && levelRef.id === lv.id) {
          closeModal(levelsModal);
          loadLevel({ pack: 'classic', id: 1 });
        }
        renderCustomList();
        updateProgressUI();
        toast('Рівень видалено');
      });
      actions.appendChild(play);
      actions.appendChild(edit);
      actions.appendChild(del);

      row.appendChild(thumb);
      row.appendChild(info);
      row.appendChild(actions);
      customList.appendChild(row);
      drawThumb(canvas, lv);
    });
  }

  /* ============================================================
     Modal helpers
     ============================================================ */

  function anyOverlayOpen() {
    return winOverlay.classList.contains('open') ||
      levelsModal.classList.contains('open') ||
      helpModal.classList.contains('open') ||
      editorModal.classList.contains('open');
  }

  function syncInert() {
    var open = anyOverlayOpen();
    appEl.inert = open;
    document.body.classList.toggle('has-overlay', open);
  }

  function openModal(modal, trigger) {
    lastFocusBeforeModal = trigger || document.activeElement;
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    modal.inert = false;
    syncInert();
    window.setTimeout(function () {
      var focusable = modal.querySelector('.modal-close, button, input, [href]');
      if (focusable) {
        try { focusable.focus(); } catch (e) {}
      }
    }, 60);
  }

  function closeModal(modal) {
    if (!modal.classList.contains('open')) return;
    modal.classList.remove('open');
    modal.setAttribute('aria-hidden', 'true');
    modal.inert = true;
    syncInert();
    if (lastFocusBeforeModal && document.contains(lastFocusBeforeModal)) {
      try { lastFocusBeforeModal.focus(); } catch (e) {}
    }
  }

  function closeTopOverlay() {
    if (winOverlay.classList.contains('open')) { closeWin(); return true; }
    if (editorModal.classList.contains('open')) { closeModal(editorModal); return true; }
    if (helpModal.classList.contains('open')) { closeModal(helpModal); return true; }
    if (levelsModal.classList.contains('open')) { closeModal(levelsModal); return true; }
    return false;
  }

  function openHelp() {
    progress.seenHelp = true;
    saveProgress();
    openModal(helpModal, helpBtn);
  }

  /* ============================================================
     Editor
     ============================================================ */

  function emptyGrid(w, h) {
    var g = [];
    for (var r = 0; r < h; r++) {
      g.push(new Array(w).fill(0));
    }
    return g;
  }

  function starterGrid(w, h) {
    var g = emptyGrid(w, h);
    for (var c = 0; c < w; c++) {
      g[0][c] = 1;
      g[h - 1][c] = 1;
    }
    for (var r = 0; r < h; r++) {
      g[r][0] = 1;
      g[r][w - 1] = 1;
    }
    if (w >= 7 && h >= 7) {
      g[2][2] = 3;
      g[h - 3][w - 3] = 33;
      g[2][w - 3] = 4;
      g[h - 3][2] = 44;
    }
    return g;
  }

  function buildEditorPalettes() {
    ballPalette.innerHTML = '';
    sinkPalette.innerHTML = '';
    COLOR_CODES.forEach(function (code) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'palette-btn';
      b.dataset.code = String(code);
      b.title = 'Куля: ' + COLORS[code].name;
      b.setAttribute('aria-label', 'Куля: ' + COLORS[code].name);
      b.innerHTML = '<span class="swatch swatch-ball ' + colorClass(code) + '"></span>';
      ballPalette.appendChild(b);

      var s = document.createElement('button');
      s.type = 'button';
      s.className = 'palette-btn';
      s.dataset.code = String(code * 11);
      s.title = 'Луза: ' + COLORS[code].name;
      s.setAttribute('aria-label', 'Луза: ' + COLORS[code].name);
      s.innerHTML = '<span class="swatch swatch-sink ' + colorClass(code) + '"></span>';
      sinkPalette.appendChild(s);
    });
  }

  function setEditorCode(code) {
    editor.code = code;
    var buttons = editorModal.querySelectorAll('.palette-btn');
    Array.prototype.forEach.call(buttons, function (b) {
      b.classList.toggle('is-active', parseInt(b.dataset.code, 10) === code);
    });
  }

  function openEditor(id) {
    if (id) {
      var custom = customById(id);
      if (!custom) { toast('Рівень не знайдено'); return; }
      editor.initialized = true;
      editor.editingId = custom.id;
      editor.w = custom.w;
      editor.h = custom.h;
      editor.grid = cloneGrid(custom.grid);
      editor.name = custom.name;
    } else {
      if (!editor.initialized) {
        editor.initialized = true;
        editor.w = 9;
        editor.h = 9;
        editor.grid = starterGrid(9, 9);
        editor.name = '';
        editor.editingId = null;
      }
    }
    edW.value = String(editor.w);
    edH.value = String(editor.h);
    edName.value = editor.name;
    setEditorCode(0);
    editorModal.querySelector('#editorTitle').textContent = editor.editingId ? 'Редагувати рівень' : 'Створити рівень';
    openModal(editorModal, editorBtn);
    window.setTimeout(renderEditor, 50);
  }

  function renderEditor() {
    if (!editor.grid) return;
    var wrap = editorModal.querySelector('.editor-board-wrap');
    var availW = Math.max(160, wrap.clientWidth - 58);
    var availH = Math.max(160, wrap.clientHeight - 58);
    var size = Math.floor(Math.min(availW / editor.w, availH / editor.h, 40));
    size = clamp(size, 13, 40);
    editorBoard.style.setProperty('--ed-cell', size + 'px');
    editorBoard.style.gridTemplateColumns = 'repeat(' + editor.w + ', var(--ed-cell))';
    editorBoard.style.gridTemplateRows = 'repeat(' + editor.h + ', var(--ed-cell))';
    editorBoard.innerHTML = '';
    var frag = document.createDocumentFragment();
    for (var r = 0; r < editor.h; r++) {
      for (var c = 0; c < editor.w; c++) {
        var el = document.createElement('div');
        el.className = 'ed-cell';
        el.dataset.r = String(r);
        el.dataset.c = String(c);
        applyEditorCellClass(el, editor.grid[r][c]);
        frag.appendChild(el);
      }
    }
    editorBoard.appendChild(frag);
    var balls = countBalls(editor.grid);
    editorLegend.textContent = editor.w + ' × ' + editor.h + ' · ' + balls + ' ' + plural(balls, ['куля', 'кулі', 'куль']);
  }

  function applyEditorCellClass(el, code) {
    var cls = 'ed-cell';
    if (code === 1) cls += ' wall';
    else if (isSink(code)) cls += ' sink ' + colorClass(sinkColor(code));
    else if (isStone(code)) cls += ' ball ' + colorClass(code);
    el.className = cls;
  }

  function editorCellFromPoint(clientX, clientY) {
    var el = document.elementFromPoint(clientX, clientY);
    if (!el) return null;
    var cellEl = el.closest ? el.closest('.ed-cell') : null;
    if (!cellEl || !editorBoard.contains(cellEl)) return null;
    return {
      el: cellEl,
      r: parseInt(cellEl.dataset.r, 10),
      c: parseInt(cellEl.dataset.c, 10)
    };
  }

  function paintEditorCell(r, c, code) {
    if (r < 0 || r >= editor.h || c < 0 || c >= editor.w) return;
    editor.grid[r][c] = code;
    var el = editorBoard.querySelector('.ed-cell[data-r="' + r + '"][data-c="' + c + '"]');
    if (el) applyEditorCellClass(el, code);
    var balls = countBalls(editor.grid);
    editorLegend.textContent = editor.w + ' × ' + editor.h + ' · ' + balls + ' ' + plural(balls, ['куля', 'кулі', 'куль']);
  }

  function resizeEditor() {
    var w = clamp(parseInt(edW.value, 10) || editor.w, 5, 13);
    var h = clamp(parseInt(edH.value, 10) || editor.h, 5, 13);
    edW.value = String(w);
    edH.value = String(h);
    if (w === editor.w && h === editor.h) return;
    var next = emptyGrid(w, h);
    for (var r = 0; r < Math.min(h, editor.h); r++) {
      for (var c = 0; c < Math.min(w, editor.w); c++) {
        next[r][c] = editor.grid[r][c];
      }
    }
    editor.w = w;
    editor.h = h;
    editor.grid = next;
    renderEditor();
  }

  function validateEditor() {
    var ballsByColor = {};
    var sinksByColor = {};
    for (var r = 0; r < editor.h; r++) {
      for (var c = 0; c < editor.w; c++) {
        var code = editor.grid[r][c];
        if (isStone(code)) ballsByColor[code] = (ballsByColor[code] || 0) + 1;
        if (isSink(code)) sinksByColor[sinkColor(code)] = (sinksByColor[sinkColor(code)] || 0) + 1;
      }
    }
    var ballColors = Object.keys(ballsByColor);
    if (!ballColors.length) return 'Додай хоча б одну кулю.';
    for (var i = 0; i < ballColors.length; i++) {
      var code = parseInt(ballColors[i], 10);
      if (!sinksByColor[code]) {
        return 'Для кулі «' + COLORS[code].name + '» потрібна луза того ж кольору.';
      }
    }
    return null;
  }

  function saveEditor(andPlay) {
    editor.name = edName.value.trim();
    var err = validateEditor();
    if (err) {
      toast(err);
      return false;
    }
    var name = editor.name || 'Мій рівень ' + (customLevels.length + 1);
    var id = editor.editingId;
    if (id) {
      var existing = customById(id);
      if (existing) {
        existing.name = name;
        existing.w = editor.w;
        existing.h = editor.h;
        existing.grid = cloneGrid(editor.grid);
      }
    } else {
      id = 'c' + Date.now().toString(36) + Math.floor(Math.random() * 1000).toString(36);
      customLevels.push({
        id: id,
        name: name,
        w: editor.w,
        h: editor.h,
        grid: cloneGrid(editor.grid),
        best: null,
        bestTime: null,
        completed: false
      });
      editor.editingId = id;
    }
    editor.name = name;
    saveCustomLevels();
    updateProgressUI();
    renderCustomList();
    toast('Рівень збережено');
    if (andPlay) {
      closeModal(editorModal);
      loadLevel({ pack: 'custom', id: id });
    }
    return true;
  }

  /* ============================================================
     Input
     ============================================================ */

  function cellFromEvent(e) {
    if (!level) return null;
    var rect = boardEl.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    var x = e.clientX - rect.left;
    var y = e.clientY - rect.top;
    if (x < 0 || y < 0 || x >= rect.width || y >= rect.height) return null;
    var c = Math.floor(x / (rect.width / level.w));
    var r = Math.floor(y / (rect.height / level.h));
    return { r: clamp(r, 0, level.h - 1), c: clamp(c, 0, level.w - 1) };
  }

  var pointerState = null;

  function onBoardPointerDown(e) {
    if (!level || animating || level.completed) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    var pos = cellFromEvent(e);
    if (!pos) return;
    var ball = ballAt(pos.r, pos.c);
    pointerState = {
      id: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      moved: false,
      ballId: ball ? ball.id : null
    };
    try { boardEl.setPointerCapture(e.pointerId); } catch (err) {}
  }

  function onBoardPointerMove(e) {
    if (!pointerState || pointerState.id !== e.pointerId) return;
    var dx = e.clientX - pointerState.x;
    var dy = e.clientY - pointerState.y;
    if (Math.sqrt(dx * dx + dy * dy) > 16) pointerState.moved = true;
  }

  function onBoardPointerUp(e) {
    if (!pointerState || pointerState.id !== e.pointerId) return;
    var state = pointerState;
    pointerState = null;
    if (!level || animating || level.completed) return;
    var dx = e.clientX - state.x;
    var dy = e.clientY - state.y;
    var dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 22) {
      if (state.ballId != null) {
        selectedId = state.ballId;
        renderBalls();
        updateCaption();
      }
      if (!selectedId) return;
      if (Math.abs(dx) > Math.abs(dy)) tryMove(0, dx > 0 ? 1 : -1);
      else tryMove(dy > 0 ? 1 : -1, 0);
      return;
    }

    var pos = cellFromEvent(e);
    if (!pos) return;
    var ball = ballAt(pos.r, pos.c);
    if (ball) {
      if (selectedId === ball.id) {
        selectedId = null;
        playSelect();
        renderBalls();
        updateCaption();
      } else {
        selectedId = ball.id;
        playSelect();
        renderBalls();
        updateCaption();
      }
      return;
    }

    if (!selectedId) return;
    var sel = getSelectedBall();
    if (!sel) return;
    var dr = pos.r - sel.r;
    var dc = pos.c - sel.c;
    if (dr === 0 && dc === 0) return;
    if (Math.abs(dc) >= Math.abs(dr)) tryMove(0, dc > 0 ? 1 : -1);
    else tryMove(dr > 0 ? 1 : -1, 0);
  }

  function onBoardPointerCancel(e) {
    if (pointerState && pointerState.id === e.pointerId) pointerState = null;
  }

  function onKeyDown(e) {
    var tag = (e.target && e.target.tagName) ? e.target.tagName.toLowerCase() : '';
    var typing = tag === 'input' || tag === 'textarea' || tag === 'select';

    if (e.key === 'Escape') {
      if (closeTopOverlay()) {
        e.preventDefault();
        return;
      }
      if (!typing && selectedId != null) {
        selectedId = null;
        renderBalls();
        updateCaption();
        e.preventDefault();
      }
      return;
    }

    if (winOverlay.classList.contains('open')) {
      if (e.key === 'Enter') {
        e.preventDefault();
        nextLevel();
      }
      return;
    }

    if (levelsModal.classList.contains('open') ||
        helpModal.classList.contains('open') ||
        editorModal.classList.contains('open')) {
      if (e.key === 'Enter' && e.target && e.target.tagName === 'BUTTON') {
        // let the button handle it
      }
      return;
    }

    if (typing) return;

    var code = e.code;
    var handled = true;
    if (code === 'ArrowUp' || code === 'KeyW') tryMove(-1, 0);
    else if (code === 'ArrowDown' || code === 'KeyS') tryMove(1, 0);
    else if (code === 'ArrowLeft' || code === 'KeyA') tryMove(0, -1);
    else if (code === 'ArrowRight' || code === 'KeyD') tryMove(0, 1);
    else if (code === 'KeyZ') undoMove();
    else if (code === 'KeyR') restartLevel();
    else if (code === 'KeyL') openLevels();
    else if (code === 'KeyM') toggleSound();
    else if (code === 'KeyH') openHelp();
    else handled = false;

    if (handled) e.preventDefault();
  }

  /* ============================================================
     Toast
     ============================================================ */

  function toast(message, ms) {
    toastEl.textContent = message;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () {
      toastEl.classList.remove('show');
    }, ms || 2400);
  }

  /* ============================================================
     Wiring
     ============================================================ */

  function bindEvents() {
    brandBtn.addEventListener('click', function () { openLevels(); });
    levelsBtn.addEventListener('click', function () { openLevels(); });
    helpBtn.addEventListener('click', openHelp);
    soundBtn.addEventListener('click', toggleSound);
    undoBtn.addEventListener('click', undoMove);
    restartBtn.addEventListener('click', restartLevel);
    editorBtn.addEventListener('click', function () { openEditor(); });

    boardEl.addEventListener('pointerdown', onBoardPointerDown);
    boardEl.addEventListener('pointermove', onBoardPointerMove);
    boardEl.addEventListener('pointerup', onBoardPointerUp);
    boardEl.addEventListener('pointercancel', onBoardPointerCancel);
    boardEl.addEventListener('contextmenu', function (e) { e.preventDefault(); });

    Array.prototype.forEach.call(document.querySelectorAll('.dpad-btn'), function (btn) {
      btn.addEventListener('click', function () {
        var dir = btn.dataset.dir;
        if (dir === 'up') tryMove(-1, 0);
        else if (dir === 'down') tryMove(1, 0);
        else if (dir === 'left') tryMove(0, -1);
        else if (dir === 'right') tryMove(0, 1);
      });
      btn.addEventListener('pointerdown', function () { btn.classList.add('is-pressed'); });
      btn.addEventListener('pointerup', function () { btn.classList.remove('is-pressed'); });
      btn.addEventListener('pointerleave', function () { btn.classList.remove('is-pressed'); });
    });

    document.addEventListener('keydown', onKeyDown);

    Array.prototype.forEach.call(document.querySelectorAll('[data-close]'), function (btn) {
      btn.addEventListener('click', function () {
        var modal = $(btn.dataset.close);
        if (modal) closeModal(modal);
      });
    });

    [levelsModal, helpModal, editorModal].forEach(function (modal) {
      modal.addEventListener('click', function (e) {
        if (e.target === modal) closeModal(modal);
      });
    });

    tabClassic.addEventListener('click', function () { setTab('classic'); });
    tabCustom.addEventListener('click', function () { setTab('custom'); });

    levelGrid.addEventListener('click', function (e) {
      var tile = e.target.closest('.level-tile');
      if (!tile) return;
      var id = parseInt(tile.dataset.id, 10);
      closeModal(levelsModal);
      loadLevel({ pack: 'classic', id: id });
    });

    createFromLevels.addEventListener('click', function () {
      closeModal(levelsModal);
      openEditor();
    });

    resetProgressBtn.addEventListener('click', function () {
      if (!window.confirm('Скинути прогрес класичних рівнів? Власні рівні залишаться.')) return;
      progress.completed = {};
      progress.lastLevel = 1;
      saveProgress();
      updateProgressUI();
      renderLevelGrid();
      toast('Прогрес класики скинуто');
    });

    nextLevelBtn.addEventListener('click', nextLevel);
    replayBtn.addEventListener('click', function () {
      closeWin();
      resetRuntime();
    });
    winLevelsBtn.addEventListener('click', function () {
      closeWin();
      openLevels();
    });

    /* editor */
    buildEditorPalettes();
    editorModal.addEventListener('click', function (e) {
      var btn = e.target.closest('.palette-btn');
      if (!btn) return;
      setEditorCode(parseInt(btn.dataset.code, 10));
    });
    edResize.addEventListener('click', resizeEditor);
    edW.addEventListener('change', resizeEditor);
    edH.addEventListener('change', resizeEditor);
    edName.addEventListener('input', function () { editor.name = edName.value; });
    edPlay.addEventListener('click', function () { saveEditor(true); });
    edSave.addEventListener('click', function () { saveEditor(false); });
    edClear.addEventListener('click', function () {
      editor.grid = emptyGrid(editor.w, editor.h);
      renderEditor();
      toast('Поле очищено');
    });

    editorBoard.addEventListener('pointerdown', function (e) {
      if (e.pointerType === 'mouse' && e.button !== 0 && e.button !== 2) return;
      var cellPos = editorCellFromPoint(e.clientX, e.clientY);
      if (!cellPos) return;
      e.preventDefault();
      editor.painting = true;
      editor.erase = (e.button === 2);
      paintEditorCell(cellPos.r, cellPos.c, editor.erase ? 0 : editor.code);
      try { editorBoard.setPointerCapture(e.pointerId); } catch (err) {}
    });
    editorBoard.addEventListener('pointermove', function (e) {
      if (!editor.painting) return;
      var cellPos = editorCellFromPoint(e.clientX, e.clientY);
      if (cellPos) paintEditorCell(cellPos.r, cellPos.c, editor.erase ? 0 : editor.code);
    });
    window.addEventListener('pointerup', function () { editor.painting = false; });
    window.addEventListener('pointercancel', function () { editor.painting = false; });
    editorBoard.addEventListener('contextmenu', function (e) { e.preventDefault(); });

    window.addEventListener('resize', function () {
      scheduleLayout();
      if (editorModal.classList.contains('open')) {
        window.clearTimeout(editor.resizeTimer);
        editor.resizeTimer = window.setTimeout(renderEditor, 120);
      }
    });

    document.addEventListener('visibilitychange', function () {
      if (document.hidden) {
        if (timerRunning) stopTimer();
      } else if (level && !level.completed && moves > 0 && !timerRunning) {
        startTimer();
      }
    });

    if (window.ResizeObserver) {
      var ro = new ResizeObserver(function () { scheduleLayout(); });
      ro.observe(boardHolder);
    }
  }

  /* ============================================================
     Init
     ============================================================ */

  function init() {
    if (!LEVELS.length) {
      toast('Не знайдено рівнів. Перевір файл levels.js');
      return;
    }
    [levelsModal, helpModal, editorModal].forEach(function (modal) {
      modal.inert = true;
    });
    winOverlay.inert = true;
    updateSoundUI();
    bindEvents();

    var startId = progress.lastLevel;
    if (!levelById(startId)) startId = 1;
    loadLevel({ pack: 'classic', id: startId });

    if (!progress.seenHelp) {
      window.setTimeout(openHelp, 650);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
