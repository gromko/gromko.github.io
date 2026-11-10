/*
 * Котигорошко — логіка гри.
 */
(function () {
  'use strict';

  var Maze = window.Maze;
  var LEVELS = Maze.LEVELS;
  var TOTAL = LEVELS.length;
  var STORAGE_KEY = 'kotyhoroshko-v1';
  var REDUCED = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- DOM ---------- */
  var boardEl = document.getElementById('board');
  var levelNumEl = document.getElementById('levelNum');
  var levelTotalEl = document.getElementById('levelTotal');
  var levelNameEl = document.getElementById('levelName');
  var difficultyEl = document.getElementById('difficulty');
  var gemDotsEl = document.getElementById('gemDots');
  var gemCountEl = document.getElementById('gemCount');
  var movesEl = document.getElementById('moves');
  var timeEl = document.getElementById('time');
  var undoBtn = document.getElementById('undoBtn');
  var restartBtn = document.getElementById('restartBtn');
  var soundBtn = document.getElementById('soundBtn');
  var fullscreenBtn = document.getElementById('fullscreenBtn');
  var helpBtn = document.getElementById('helpBtn');
  var helpModal = document.getElementById('helpModal');
  var helpClose = document.getElementById('helpClose');
  var helpOk = document.getElementById('helpOk');
  var levelGrid = document.getElementById('levelGrid');
  var doneCountEl = document.getElementById('doneCount');
  var progressFill = document.getElementById('progressFill');
  var progressBar = document.getElementById('progressBar');
  var progressText = document.getElementById('progressText');
  var resetProgressBtn = document.getElementById('resetProgressBtn');
  var winLayer = document.getElementById('winLayer');
  var winKicker = document.getElementById('winKicker');
  var winTitle = document.getElementById('winTitle');
  var winMoves = document.getElementById('winMoves');
  var winTime = document.getElementById('winTime');
  var winBest = document.getElementById('winBest');
  var nextBtn = document.getElementById('nextBtn');
  var againBtn = document.getElementById('againBtn');
  var winClose = document.getElementById('winClose');
  var confettiEl = document.getElementById('confetti');
  var toastEl = document.getElementById('toast');
  var liveEl = document.getElementById('live');

  /* ---------- Стан ---------- */
  var level = null;
  var levelIndex = 0;
  var pos = 0;
  var mask = 0;
  var moveCount = 0;
  var history = [];
  var animating = false;
  var won = false;
  var elapsed = 0;
  var timerId = null;
  var timerStartedAt = 0;
  var cellEls = [];
  var gemEls = [];
  var gemIndexByCell = new Map();
  var ballEl = null;
  var pendingTimers = [];
  var toastTimer = null;
  var swipeStart = null;
  var resetArmed = false;
  var resetArmTimer = null;
  var levelButtons = [];
  var soundOn = true;
  var audioCtx = null;

  var progress = loadProgress();
  soundOn = progress.sound;

  /* ============================================================
     Збереження прогресу
     ============================================================ */

  function defaultProgress() {
    return { solved: [], best: {}, last: 0, sound: true };
  }

  function loadProgress() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return defaultProgress();
      var data = JSON.parse(raw);
      var solved = Array.isArray(data.solved)
        ? data.solved.filter(function (n) { return Number.isInteger(n) && n >= 0 && n < TOTAL; })
        : [];
      return {
        solved: solved,
        best: data.best && typeof data.best === 'object' ? data.best : {},
        last: Number.isInteger(data.last) && data.last >= 0 && data.last < TOTAL ? data.last : 0,
        sound: data.sound !== false
      };
    } catch (err) {
      return defaultProgress();
    }
  }

  function saveProgress() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    } catch (err) {
      /* приватний режим або переповнене сховище — просто ігноруємо */
    }
  }

  /* ============================================================
     Звук
     ============================================================ */

  function getAudio() {
    if (!soundOn) return null;
    try {
      if (!audioCtx) {
        var Ctx = window.AudioContext || window.webkitAudioContext;
        if (!Ctx) return null;
        audioCtx = new Ctx();
      }
      if (audioCtx.state === 'suspended') audioCtx.resume();
      return audioCtx;
    } catch (err) {
      return null;
    }
  }

  function tone(freq, duration, options) {
    options = options || {};
    var ac = getAudio();
    if (!ac) return;
    try {
      var start = ac.currentTime + (options.when || 0);
      var osc = ac.createOscillator();
      var gain = ac.createGain();
      osc.type = options.type || 'sine';
      osc.frequency.setValueAtTime(freq, start);
      if (options.to) {
        osc.frequency.exponentialRampToValueAtTime(Math.max(20, options.to), start + duration);
      }
      var peak = options.gain || 0.045;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(peak, start + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      osc.connect(gain);
      gain.connect(ac.destination);
      osc.start(start);
      osc.stop(start + duration + 0.03);
    } catch (err) {
      /* звук не критичний */
    }
  }

  function playRoll(distance) {
    var d = Math.min(distance || 1, 10);
    tone(180 + d * 11, 0.075, { type: 'triangle', gain: 0.026, to: 128 });
  }

  function playGem() {
    tone(880, 0.12, { gain: 0.045 });
    tone(1320, 0.17, { gain: 0.035, when: 0.065 });
  }

  function playWin() {
    var notes = [523.25, 659.25, 783.99, 1046.5];
    notes.forEach(function (n, i) {
      tone(n, 0.28, { gain: 0.05, when: i * 0.105, type: 'sine' });
    });
    tone(1568, 0.5, { gain: 0.03, when: 0.46, type: 'sine' });
  }

  function playBlocked() {
    tone(88, 0.09, { type: 'square', gain: 0.022, to: 60 });
  }

  function playClick() {
    tone(520, 0.05, { type: 'sine', gain: 0.025 });
  }

  function updateSoundButton() {
    soundBtn.classList.toggle('sound-off', !soundOn);
    soundBtn.setAttribute('aria-label', soundOn ? 'Вимкнути звук' : 'Увімкнути звук');
    soundBtn.title = soundOn ? 'Звук увімкнено' : 'Звук вимкнено';
  }

  /* ============================================================
     Допоміжне
     ============================================================ */

  function formatTime(seconds) {
    seconds = Math.max(0, Math.floor(seconds || 0));
    var m = Math.floor(seconds / 60);
    var s = seconds % 60;
    return m + ':' + (s < 10 ? '0' : '') + s;
  }

  function clamp(n, min, max) {
    return Math.min(max, Math.max(min, n));
  }

  function later(fn, ms) {
    var id = setTimeout(function () {
      var i = pendingTimers.indexOf(id);
      if (i !== -1) pendingTimers.splice(i, 1);
      fn();
    }, Math.max(0, ms));
    pendingTimers.push(id);
    return id;
  }

  function clearPendingTimers() {
    pendingTimers.forEach(function (id) { clearTimeout(id); });
    pendingTimers = [];
  }

  function fullMask() {
    return (1 << level.gems.length) - 1;
  }

  function countCollected() {
    var n = 0;
    var m = mask;
    while (m) { n += m & 1; m >>= 1; }
    return n;
  }

  function difficultyFor(index) {
    var ratio = index / TOTAL;
    if (ratio < 0.25) return 'легкий';
    if (ratio < 0.55) return 'середній';
    return 'складний';
  }

  function announce(text) {
    liveEl.textContent = '';
    setTimeout(function () { liveEl.textContent = text; }, 20);
  }

  function showToast(text) {
    toastEl.textContent = text;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toastEl.classList.remove('show');
    }, 2600);
  }

  function scrollToBoard() {
    var stage = document.querySelector('.stage');
    if (!stage) return;
    stage.scrollIntoView({ behavior: REDUCED ? 'auto' : 'smooth', block: 'start' });
  }

  function setHash(index) {
    try {
      var hash = '#' + (index + 1);
      if (window.location.hash !== hash) {
        window.history.replaceState(null, '', hash);
      }
    } catch (err) {
      /* file:// у деяких браузерах — не критично */
    }
  }

  function indexFromHash() {
    var match = /^#(\d{1,2})$/.exec(window.location.hash || '');
    if (!match) return null;
    var n = parseInt(match[1], 10) - 1;
    return n >= 0 && n < TOTAL ? n : null;
  }

  /* ============================================================
     Таймер
     ============================================================ */

  function startTimer() {
    if (timerId !== null || won) return;
    timerStartedAt = performance.now() - elapsed * 1000;
    timerId = setInterval(function () {
      elapsed = Math.floor((performance.now() - timerStartedAt) / 1000);
      timeEl.textContent = formatTime(elapsed);
    }, 250);
  }

  function stopTimer() {
    if (timerId !== null) {
      clearInterval(timerId);
      timerId = null;
    }
  }

  function currentElapsed() {
    if (timerId !== null) {
      return Math.floor((performance.now() - timerStartedAt) / 1000);
    }
    return elapsed;
  }

  /* ============================================================
     Рендер поля
     ============================================================ */

  function renderBoard() {
    boardEl.textContent = '';
    boardEl.style.setProperty('--cols', level.w);
    boardEl.style.setProperty('--rows', level.h);
    boardEl.setAttribute('aria-label', 'Лабіринт ' + level.w + ' на ' + level.h + '. Керуйте Котигорошком стрілками.');

    cellEls = new Array(level.w * level.h);
    gemEls = new Array(level.gems.length);
    gemIndexByCell = new Map();

    level.gems.forEach(function (cellIndex, gemIndex) {
      gemIndexByCell.set(cellIndex, gemIndex);
    });

    var frag = document.createDocumentFragment();

    for (var r = 0; r < level.h; r++) {
      for (var c = 0; c < level.w; c++) {
        var idx = r * level.w + c;
        var cell = document.createElement('div');
        cell.className = 'cell' + (level.grid[r][c] ? ' wall' : '');
        cell.dataset.index = idx;

        var tile = document.createElement('span');
        tile.className = 'tile';

        var gemIndex = gemIndexByCell.get(idx);
        if (gemIndex !== undefined) {
          var gem = document.createElement('span');
          gem.className = 'gem';
          gem.setAttribute('aria-hidden', 'true');
          tile.appendChild(gem);
          gemEls[gemIndex] = gem;
        }

        cell.appendChild(tile);
        frag.appendChild(cell);
        cellEls[idx] = cell;
      }
    }

    boardEl.appendChild(frag);

    ballEl = document.createElement('div');
    ballEl.className = 'ball';
    ballEl.setAttribute('aria-hidden', 'true');
    ballEl.innerHTML =
      '<svg class="ball-svg" viewBox="0 0 100 100" aria-hidden="true" focusable="false">' +
        '<circle cx="50" cy="50" r="45" fill="url(#smileyBody)"/>' +
        '<circle cx="50" cy="50" r="45" fill="url(#smileyRim)"/>' +
        '<ellipse cx="33" cy="27" rx="17" ry="11.5" transform="rotate(-28 33 27)" fill="url(#smileySpec)"/>' +
        '<g class="smiley-eyes">' +
          '<ellipse cx="35.5" cy="44.5" rx="8.7" ry="10.4" fill="url(#smileyEye)"/>' +
          '<ellipse cx="64.5" cy="44.5" rx="8.7" ry="10.4" fill="url(#smileyEye)"/>' +
          '<circle cx="37" cy="46.5" r="5.3" fill="#4a2103"/>' +
          '<circle cx="63" cy="46.5" r="5.3" fill="#4a2103"/>' +
          '<circle cx="38.7" cy="44" r="1.9" fill="#ffffff"/>' +
          '<circle cx="64.7" cy="44" r="1.9" fill="#ffffff"/>' +
        '</g>' +
        '<ellipse cx="34.5" cy="57.5" rx="6" ry="3.2" fill="#ff8a3d" opacity=".45"/>' +
        '<ellipse cx="65.5" cy="57.5" rx="6" ry="3.2" fill="#ff8a3d" opacity=".45"/>' +
        '<path d="M30 60.5Q50 81 70 60.5Q50 69.5 30 60.5Z" fill="url(#smileyMouth)"/>' +
        '<ellipse cx="50" cy="69.5" rx="7.6" ry="3.8" fill="#ff7b6e" clip-path="url(#smileyMouthClip)"/>' +
        '<path d="M33.5 62.4Q50 68.4 66.5 62.4" fill="none" stroke="#ffd9a8" stroke-width="2.2" stroke-linecap="round" opacity=".7"/>' +
      '</svg>';
    boardEl.appendChild(ballEl);

    setBallPosition(pos, 0);

    boardEl.classList.remove('enter');
    void boardEl.offsetWidth;
    boardEl.classList.add('enter');
  }

  function setBallPosition(cellIndex, duration) {
    if (!ballEl) return;
    ballEl.style.setProperty('--roll', (REDUCED ? 0 : duration) + 'ms');
    ballEl.style.setProperty('--r', Math.floor(cellIndex / level.w));
    ballEl.style.setProperty('--c', cellIndex % level.w);
  }

  function addTrail(path) {
    for (var i = 0; i < path.length; i++) {
      var cell = cellEls[path[i]];
      if (!cell || cell.classList.contains('wall')) continue;
      cell.classList.remove('trail');
      void cell.offsetWidth;
      cell.style.setProperty('--trail-delay', (i * 42) + 'ms');
      cell.classList.add('trail');
    }
  }

  function clearTrails() {
    for (var i = 0; i < cellEls.length; i++) {
      if (cellEls[i]) cellEls[i].classList.remove('trail', 'collecting');
    }
  }

  /* ============================================================
     HUD
     ============================================================ */

  function updateHud() {
    if (!level) return;
    levelNumEl.textContent = levelIndex + 1;
    levelTotalEl.textContent = TOTAL;
    levelNameEl.textContent = level.name;
    difficultyEl.textContent = difficultyFor(levelIndex);

    var collected = countCollected();
    gemCountEl.textContent = collected + ' / ' + level.gems.length;

    gemDotsEl.textContent = '';
    for (var i = 0; i < level.gems.length; i++) {
      var dot = document.createElement('span');
      dot.className = 'gem-dot' + (i < collected ? ' filled' : '');
      gemDotsEl.appendChild(dot);
    }

    movesEl.textContent = moveCount;
    timeEl.textContent = formatTime(elapsed);
    undoBtn.disabled = history.length === 0 || animating || won;
  }

  function updateGems(clearAnimations) {
    for (var i = 0; i < gemEls.length; i++) {
      var on = !!(mask & (1 << i));
      if (gemEls[i]) gemEls[i].classList.toggle('collected', on);
    }
    if (clearAnimations) clearTrails();
  }

  function updateProgressUI() {
    var done = progress.solved.length;
    doneCountEl.textContent = done + ' / ' + TOTAL;
    progressFill.style.width = ((done / TOTAL) * 100).toFixed(2) + '%';
    progressBar.setAttribute('aria-valuemax', TOTAL);
    progressBar.setAttribute('aria-valuenow', done);
    progressText.textContent = 'Пройдено ' + done + ' з ' + TOTAL + ' рівнів';

    levelButtons.forEach(function (btn, i) {
      btn.classList.toggle('solved', progress.solved.indexOf(i) !== -1);
      btn.classList.toggle('current', i === levelIndex);
      var best = progress.best[i];
      var label = 'Рівень ' + (i + 1) + ': ' + LEVELS[i].name;
      if (best) {
        label += '. Рекорд: ' + best.moves + ' ходів, ' + formatTime(best.time);
      }
      btn.title = label;
      btn.setAttribute('aria-label', label);
    });
  }

  /* ============================================================
     Рівні
     ============================================================ */

  function buildLevelGrid() {
    levelButtons = [];
    levelGrid.textContent = '';
    LEVELS.forEach(function (cfg, i) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'level-btn';
      btn.textContent = i + 1;
      btn.addEventListener('click', function () {
        selectLevel(i);
      });
      levelGrid.appendChild(btn);
      levelButtons.push(btn);
    });
  }

  function loadLevel(index) {
    index = clamp(index, 0, TOTAL - 1);

    clearPendingTimers();
    stopTimer();
    hideWin();

    levelIndex = index;
    progress.last = index;
    saveProgress();

    level = Maze.generateLevel(index);
    pos = level.start;
    mask = 0;
    moveCount = 0;
    history = [];
    elapsed = 0;
    timerStartedAt = 0;
    animating = false;
    won = false;

    renderBoard();
    updateGems(true);
    updateHud();
    updateProgressUI();
    setHash(index);
    schedulePreload();
  }

  function selectLevel(index) {
    if (index === levelIndex && !won) {
      showToast('Це поточний рівень. Натисни «Спочатку», щоб почати заново.');
      return;
    }
    loadLevel(index);
    playClick();
    if (window.innerWidth < 981) {
      setTimeout(scrollToBoard, 60);
    }
  }

  function schedulePreload() {
    if (levelIndex + 1 >= TOTAL) return;
    var next = levelIndex + 1;
    setTimeout(function () {
      try { Maze.generateLevel(next); } catch (err) { /* ignore */ }
    }, 450);
  }

  /* ============================================================
     Ходи
     ============================================================ */

  function move(dir) {
    if (!level || animating || won) return;

    var options = level.moves[pos];
    var chosen = null;
    for (var i = 0; i < options.length; i++) {
      if (options[i].dir === dir) { chosen = options[i]; break; }
    }

    if (!chosen) {
      bump(dir);
      playBlocked();
      return;
    }

    startTimer();
    history.push({ pos: pos, mask: mask, moves: moveCount });

    var duration = REDUCED ? 0 : Math.min(130 + (chosen.path.length - 1) * 82, 950);
    animating = true;
    pos = chosen.to;
    moveCount++;
    setBallPosition(pos, duration);
    addTrail(chosen.path);
    updateHud();
    playRoll(chosen.path.length - 1);

    var path = chosen.path;
    var pathLength = Math.max(1, path.length - 1);

    for (var p = 0; p < path.length; p++) {
      (function (pathIndex) {
        var gemIndex = gemIndexByCell.get(path[pathIndex]);
        if (gemIndex === undefined) return;
        if (mask & (1 << gemIndex)) return;

        var at = duration * (pathIndex / pathLength);
        later(function () {
          if (mask & (1 << gemIndex)) return;
          mask |= (1 << gemIndex);
          collectGem(gemIndex);
          updateHud();
        }, Math.max(20, at));
      })(p);
    }

    later(function () {
      animating = false;
      updateHud();
      if (mask === fullMask() && !won) {
        finishLevel();
      }
    }, duration + 45);
  }

  function bump(dir) {
    if (!ballEl) return;
    var cls = ['bump-up', 'bump-down', 'bump-left', 'bump-right'][dir];
    ballEl.classList.remove('bump-up', 'bump-down', 'bump-left', 'bump-right');
    void ballEl.offsetWidth;
    ballEl.classList.add(cls);
    setTimeout(function () { ballEl.classList.remove(cls); }, 260);
  }

  function collectGem(gemIndex) {
    var gem = gemEls[gemIndex];
    if (!gem) return;
    gem.classList.add('collected');
    var cell = gem.closest('.cell');
    if (cell) {
      cell.classList.add('collecting');
      later(function () { cell.classList.remove('collecting'); }, 540);
    }
    playGem();
    var left = level.gems.length - countCollected();
    announce(left > 0
      ? 'Скарб зібрано. Залишилося ' + left + '.'
      : 'Усі скарби зібрано!');
  }

  function undo() {
    if (!level || animating || won || history.length === 0) return;

    var prev = history.pop();
    var pr = Math.floor(pos / level.w);
    var pc = pos % level.w;
    var nr = Math.floor(prev.pos / level.w);
    var nc = prev.pos % level.w;
    var distance = Math.abs(pr - nr) + Math.abs(pc - nc);
    var duration = REDUCED ? 0 : Math.min(130 + distance * 82, 950);

    animating = true;
    pos = prev.pos;
    mask = prev.mask;
    moveCount = prev.moves;

    setBallPosition(pos, duration);
    updateGems(true);
    updateHud();
    playRoll(distance);

    later(function () {
      animating = false;
      updateHud();
    }, duration + 35);
  }

  function restart() {
    if (!level) return;

    clearPendingTimers();
    stopTimer();
    hideWin();

    pos = level.start;
    mask = 0;
    moveCount = 0;
    history = [];
    elapsed = 0;
    timerStartedAt = 0;
    animating = false;
    won = false;

    setBallPosition(pos, 0);
    updateGems(true);
    updateHud();
    playClick();
  }

  /* ============================================================
     Завершення рівня
     ============================================================ */

  function finishLevel() {
    if (won) return;
    won = true;
    animating = false;
    elapsed = currentElapsed();
    stopTimer();

    var seconds = Math.max(0, elapsed);
    var prevBest = progress.best[levelIndex];
    var isRecord = !prevBest
      || moveCount < prevBest.moves
      || (moveCount === prevBest.moves && seconds < prevBest.time);

    if (isRecord) {
      progress.best[levelIndex] = { moves: moveCount, time: seconds };
    }
    if (progress.solved.indexOf(levelIndex) === -1) {
      progress.solved.push(levelIndex);
    }
    progress.last = levelIndex;
    saveProgress();

    updateHud();
    updateProgressUI();
    playWin();
    showWin(isRecord, seconds);
  }

  function showWin(isRecord, seconds) {
    var allDone = progress.solved.length === TOTAL;

    winKicker.textContent = allDone ? 'Усі рівні пройдено' : 'Рівень ' + (levelIndex + 1) + ' пройдено';
    if (allDone) {
      winTitle.textContent = 'Усі скарби зібрано!';
    } else if (isRecord) {
      winTitle.textContent = 'Новий рекорд!';
    } else {
      winTitle.textContent = 'Чудова робота!';
    }

    winMoves.textContent = moveCount;
    winTime.textContent = formatTime(seconds);
    winBest.textContent = level.solution;

    if (levelIndex >= TOTAL - 1) {
      nextBtn.innerHTML = 'До мапи рівнів';
    } else {
      nextBtn.innerHTML = 'Наступний рівень <span aria-hidden="true">→</span>';
    }

    winLayer.hidden = false;
    spawnConfetti();
    setTimeout(function () { nextBtn.focus(); }, 80);
    announce('Рівень пройдено. Ходів: ' + moveCount + '. Час: ' + formatTime(seconds) + '.');
  }

  function hideWin() {
    winLayer.hidden = true;
    confettiEl.textContent = '';
  }

  function spawnConfetti() {
    confettiEl.textContent = '';
    if (REDUCED) return;
    var colors = ['#ffb648', '#57e6ff', '#63e6a8', '#ffffff', '#ff8a2a', '#8ea7ff'];
    for (var i = 0; i < 54; i++) {
      var piece = document.createElement('i');
      piece.style.left = (Math.random() * 100).toFixed(2) + '%';
      piece.style.background = colors[Math.floor(Math.random() * colors.length)];
      piece.style.width = (5 + Math.random() * 5).toFixed(1) + 'px';
      piece.style.height = (8 + Math.random() * 7).toFixed(1) + 'px';
      piece.style.setProperty('--dur', (1.6 + Math.random() * 1.5).toFixed(2) + 's');
      piece.style.setProperty('--delay', (Math.random() * 0.35).toFixed(2) + 's');
      piece.style.setProperty('--drift', (Math.random() * 140 - 70).toFixed(0) + 'px');
      piece.style.setProperty('--spin', (360 + Math.random() * 720).toFixed(0) + 'deg');
      confettiEl.appendChild(piece);
    }
  }

  function nextLevel() {
    if (levelIndex >= TOTAL - 1) {
      hideWin();
      showToast(progress.solved.length === TOTAL
        ? 'Вітаємо! Усі ' + TOTAL + ' рівнів пройдено.'
        : 'Це останній рівень. Спробуй покращити рекорд!');
      if (window.innerWidth < 981) {
        setTimeout(scrollToBoard, 60);
      }
      return;
    }
    loadLevel(levelIndex + 1);
    playClick();
  }

  /* ============================================================
     Модальне вікно правил
     ============================================================ */

  var helpReturnFocus = null;

  function openHelp() {
    helpReturnFocus = document.activeElement;
    helpModal.hidden = false;
    document.body.classList.add('no-scroll');
    setTimeout(function () { helpClose.focus(); }, 40);
  }

  function closeHelp() {
    helpModal.hidden = true;
    document.body.classList.remove('no-scroll');
    if (helpReturnFocus && typeof helpReturnFocus.focus === 'function') {
      helpReturnFocus.focus();
    }
  }

  /* ============================================================
     Скидання прогресу
     ============================================================ */

  function disarmReset() {
    resetArmed = false;
    resetProgressBtn.classList.remove('armed');
    resetProgressBtn.textContent = 'Скинути прогрес';
    clearTimeout(resetArmTimer);
  }

  function handleResetClick() {
    if (!resetArmed) {
      resetArmed = true;
      resetProgressBtn.classList.add('armed');
      resetProgressBtn.textContent = 'Справді скинути?';
      showToast('Натисни ще раз, щоб скинути весь прогрес');
      clearTimeout(resetArmTimer);
      resetArmTimer = setTimeout(disarmReset, 3800);
      return;
    }

    disarmReset();
    progress = defaultProgress();
    progress.last = levelIndex;
    progress.sound = soundOn;
    saveProgress();
    updateProgressUI();
    loadLevel(levelIndex);
    showToast('Прогрес скинуто');
  }

  /* ============================================================
     Події
     ============================================================ */

  function bindEvents() {
    var padButtons = document.querySelectorAll('.pad-btn');
    padButtons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        move(parseInt(btn.dataset.dir, 10));
      });
    });

    undoBtn.addEventListener('click', undo);
    restartBtn.addEventListener('click', restart);

    nextBtn.addEventListener('click', nextLevel);
    againBtn.addEventListener('click', function () {
      loadLevel(levelIndex);
      playClick();
    });
    winClose.addEventListener('click', function () {
      hideWin();
      showToast('Обери наступний рівень на мапі або натисни «Ще раз».');
    });

    soundBtn.addEventListener('click', function () {
      soundOn = !soundOn;
      progress.sound = soundOn;
      saveProgress();
      updateSoundButton();
      if (soundOn) playClick();
    });

    fullscreenBtn.addEventListener('click', function () {
      try {
        if (!document.fullscreenElement) {
          if (document.documentElement.requestFullscreen) {
            document.documentElement.requestFullscreen();
          }
        } else if (document.exitFullscreen) {
          document.exitFullscreen();
        }
      } catch (err) {
        showToast('Повноекранний режим недоступний');
      }
    });

    helpBtn.addEventListener('click', openHelp);
    helpClose.addEventListener('click', closeHelp);
    helpOk.addEventListener('click', closeHelp);
    helpModal.querySelector('.modal-backdrop').addEventListener('click', closeHelp);

    resetProgressBtn.addEventListener('click', handleResetClick);

    /* Свайпи по полю */
    boardEl.addEventListener('pointerdown', function (event) {
      if (event.pointerType === 'mouse' && event.button !== 0) return;
      swipeStart = { x: event.clientX, y: event.clientY };
    });

    window.addEventListener('pointerup', function (event) {
      if (!swipeStart) return;
      var dx = event.clientX - swipeStart.x;
      var dy = event.clientY - swipeStart.y;
      swipeStart = null;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
      if (Math.abs(dx) > Math.abs(dy)) {
        move(dx > 0 ? 3 : 2);
      } else {
        move(dy > 0 ? 1 : 0);
      }
    });

    window.addEventListener('pointercancel', function () { swipeStart = null; });

    /* Клавіатура */
    document.addEventListener('keydown', function (event) {
      if (!helpModal.hidden) {
        if (event.key === 'Escape') {
          event.preventDefault();
          closeHelp();
        } else if (event.key === 'Tab') {
          trapFocus(event, helpModal);
        }
        return;
      }

      if (!winLayer.hidden) {
        if (event.key === 'Escape') {
          event.preventDefault();
          hideWin();
        } else if (event.key === 'Enter') {
          event.preventDefault();
          nextLevel();
        }
        return;
      }

      var target = event.target;
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return;

      var arrows = { ArrowUp: 0, ArrowDown: 1, ArrowLeft: 2, ArrowRight: 3 };
      if (arrows[event.key] !== undefined) {
        event.preventDefault();
        move(arrows[event.key]);
        return;
      }

      switch (event.code) {
        case 'KeyW': move(0); break;
        case 'KeyS': move(1); break;
        case 'KeyA': move(2); break;
        case 'KeyD': move(3); break;
        case 'KeyZ':
        case 'Backspace':
          event.preventDefault();
          undo();
          break;
        case 'KeyR':
          restart();
          break;
      }
    });

    /* Зміна hash (наприклад, кнопки «назад/вперед») */
    window.addEventListener('hashchange', function () {
      var fromHash = indexFromHash();
      if (fromHash !== null && fromHash !== levelIndex) {
        loadLevel(fromHash);
      }
    });
  }

  function trapFocus(event, container) {
    var focusable = container.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    if (!focusable.length) return;
    var first = focusable[0];
    var last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  /* ============================================================
     Старт
     ============================================================ */

  function init() {
    if (!document.documentElement.requestFullscreen) {
      fullscreenBtn.hidden = true;
    }

    updateSoundButton();
    buildLevelGrid();
    bindEvents();

    var fromHash = indexFromHash();
    var start = fromHash !== null ? fromHash : progress.last;
    loadLevel(start);
  }

  init();
})();
