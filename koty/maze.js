/*
 * Котигорошко — генератор лабіринтів.
 *
 * Механіка: кулька-смайлик котиться в обраному напрямку, доки не вдариться
 * об стіну. Кожен рівень генерується детерміновано (однаковий для всіх),
 * а розв'язність перевіряється пошуком у ширину по станах
 * (позиція кульки + набір зібраних скарбів).
 */
(function (global) {
  'use strict';

  var DIRS = [
    [-1, 0], // 0 — вгору
    [1, 0],  // 1 — вниз
    [0, -1], // 2 — вліво
    [0, 1]   // 3 — вправо
  ];

  var LEVELS = [
    { name: 'Перші кроки',      w: 7,  h: 7,  density: 0.15, gems: 1, minMoves: 2 },
    { name: 'Тихий закуток',    w: 7,  h: 7,  density: 0.19, gems: 1, minMoves: 3 },
    { name: 'Два скарби',       w: 8,  h: 8,  density: 0.17, gems: 2, minMoves: 4 },
    { name: 'Кам’яний сад',     w: 8,  h: 8,  density: 0.21, gems: 2, minMoves: 5 },
    { name: 'Лабіринт вітрів',  w: 9,  h: 9,  density: 0.19, gems: 2, minMoves: 5 },
    { name: 'Потрійний слід',   w: 9,  h: 9,  density: 0.22, gems: 3, minMoves: 6 },
    { name: 'Срібні стіни',     w: 10, h: 10, density: 0.20, gems: 3, minMoves: 7 },
    { name: 'Загублена зала',   w: 10, h: 10, density: 0.24, gems: 3, minMoves: 8 },
    { name: 'Чотири грані',     w: 11, h: 11, density: 0.21, gems: 4, minMoves: 8 },
    { name: 'Кришталевий шлях', w: 11, h: 11, density: 0.24, gems: 4, minMoves: 9 },
    { name: 'Тіньовий хід',     w: 12, h: 12, density: 0.22, gems: 4, minMoves: 10 },
    { name: 'Останній скарб',   w: 12, h: 12, density: 0.25, gems: 5, minMoves: 12 },
    { name: 'Брама вітрів',     w: 13, h: 13, density: 0.21, gems: 5, minMoves: 11 },
    { name: 'Смарагдова зала',  w: 13, h: 13, density: 0.24, gems: 5, minMoves: 12 },
    { name: 'Мідний лабіринт',  w: 14, h: 14, density: 0.22, gems: 5, minMoves: 12 },
    { name: 'Золотий ключ',     w: 14, h: 14, density: 0.25, gems: 6, minMoves: 13 },
    { name: 'Вежа тіней',       w: 15, h: 15, density: 0.23, gems: 6, minMoves: 13 },
    { name: 'Підземний хід',    w: 15, h: 15, density: 0.26, gems: 6, minMoves: 14 },
    { name: 'Кришталева брама', w: 16, h: 16, density: 0.24, gems: 6, minMoves: 14 },
    { name: 'Остання подорож',  w: 16, h: 16, density: 0.27, gems: 7, minMoves: 16 }
  ];

  /* Детермінований генератор псевдовипадкових чисел. */
  function mulberry32(a) {
    return function () {
      a |= 0;
      a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function pick(arr, rng) {
    return arr[Math.floor(rng() * arr.length)];
  }

  function shuffle(arr, rng) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(rng() * (i + 1));
      var t = arr[i];
      arr[i] = arr[j];
      arr[j] = t;
    }
    return arr;
  }

  /* Створює сітку: 1 — стіна, 0 — підлога. */
  function makeGrid(w, h, density, rng) {
    var g = [];
    var r, c;
    for (r = 0; r < h; r++) g.push(new Array(w).fill(0));
    for (c = 0; c < w; c++) { g[0][c] = 1; g[h - 1][c] = 1; }
    for (r = 0; r < h; r++) { g[r][0] = 1; g[r][w - 1] = 1; }

    var target = Math.round((w - 2) * (h - 2) * density);
    var placed = 0;
    var guard = 0;
    while (placed < target && guard++ < 600) {
      var horizontal = rng() < 0.5;
      var len = 1 + Math.floor(rng() * 4);
      var rr = 1 + Math.floor(rng() * (h - 2));
      var cc = 1 + Math.floor(rng() * (w - 2));
      for (var i = 0; i < len; i++) {
        var y = horizontal ? rr : rr + i;
        var x = horizontal ? cc + i : cc;
        if (y < 1 || y > h - 2 || x < 1 || x > w - 2) break;
        if (g[y][x] === 0) {
          g[y][x] = 1;
          placed++;
        }
      }
    }
    return g;
  }

  /* Для кожної вільної клітинки — усі можливі «прокати» кульки. */
  function buildMoves(grid, w, h) {
    var moves = new Array(w * h);
    for (var r = 0; r < h; r++) {
      for (var c = 0; c < w; c++) {
        var idx = r * w + c;
        moves[idx] = [];
        if (grid[r][c]) continue;
        for (var d = 0; d < 4; d++) {
          var dr = DIRS[d][0];
          var dc = DIRS[d][1];
          var cr = r;
          var cc = c;
          var path = [idx];
          while (true) {
            var nr = cr + dr;
            var nc = cc + dc;
            if (grid[nr][nc]) break;
            cr = nr;
            cc = nc;
            path.push(cr * w + cc);
          }
          if (cr !== r || cc !== c) {
            moves[idx].push({ to: cr * w + cc, path: path, dir: d });
          }
        }
      }
    }
    return moves;
  }

  /* Куди Котигорошко взагалі може докотитися (без урахування скарбів). */
  function explore(moves, startIdx) {
    var seen = new Set([startIdx]);
    var visitable = new Set([startIdx]);
    var queue = [startIdx];
    var head = 0;
    while (head < queue.length) {
      var cur = queue[head++];
      var list = moves[cur];
      for (var i = 0; i < list.length; i++) {
        var m = list[i];
        for (var j = 0; j < m.path.length; j++) visitable.add(m.path[j]);
        if (!seen.has(m.to)) {
          seen.add(m.to);
          queue.push(m.to);
        }
      }
    }
    return { stops: seen, visitable: visitable };
  }

  /* Пошук найкоротшого розв'язку: стан = клітинка + маска скарбів. */
  function solve(moves, w, h, startIdx, gems) {
    var n = gems.length;
    var full = (1 << n) - 1;
    var cellBit = new Int32Array(w * h);
    for (var i = 0; i < n; i++) cellBit[gems[i]] |= (1 << i);

    var stride = 1 << n;
    var total = w * h * stride;
    var dist = new Int32Array(total);
    dist.fill(-1);
    var queue = new Int32Array(total);
    var head = 0;
    var tail = 0;

    var startMask = cellBit[startIdx] || 0;
    var startState = startIdx * stride + startMask;
    dist[startState] = 0;
    queue[tail++] = startState;

    while (head < tail) {
      var st = queue[head++];
      var mask = st & (stride - 1);
      var cell = (st - mask) / stride;
      if (mask === full) return { moves: dist[st] };

      var d = dist[st];
      var list = moves[cell];
      for (var k = 0; k < list.length; k++) {
        var m = list[k];
        var nm = mask;
        for (var j = 0; j < m.path.length; j++) nm |= cellBit[m.path[j]];
        var ns = m.to * stride + nm;
        if (dist[ns] === -1) {
          dist[ns] = d + 1;
          queue[tail++] = ns;
        }
      }
    }
    return null;
  }

  function chebyshev(a, b, w) {
    var ar = Math.floor(a / w), ac = a % w;
    var br = Math.floor(b / w), bc = b % w;
    return Math.max(Math.abs(ar - br), Math.abs(ac - bc));
  }

  var cache = {};

  function generateLevel(index) {
    if (cache[index]) return cache[index];

    var cfg = LEVELS[index];
    var rng = mulberry32((0x9e3779b1 ^ (index * 0x85ebca6b)) >>> 0);
    var fallback = null;
    var attempts = 340;

    for (var attempt = 0; attempt < attempts; attempt++) {
      var relax = attempt > 220 ? 3 : attempt > 140 ? 2 : attempt > 60 ? 1 : 0;
      var minMoves = Math.max(1, cfg.minMoves - relax);

      var w = cfg.w;
      var h = cfg.h;
      var grid = makeGrid(w, h, cfg.density, rng);
      var moves = buildMoves(grid, w, h);

      var free = [];
      for (var i = 0; i < w * h; i++) {
        if (!grid[Math.floor(i / w)][i % w]) free.push(i);
      }
      if (free.length < 12) continue;

      var starts = free.filter(function (idx) { return moves[idx].length >= 3; });
      if (!starts.length) {
        starts = free.filter(function (idx) { return moves[idx].length >= 2; });
      }
      if (!starts.length) continue;

      var startIdx = pick(starts, rng);
      var info = explore(moves, startIdx);
      if (info.stops.size < 5) continue;

      var candidates = [];
      info.visitable.forEach(function (idx) {
        if (idx !== startIdx) candidates.push(idx);
      });
      if (candidates.length < cfg.gems) continue;
      shuffle(candidates, rng);

      var gems = [];
      for (var c2 = 0; c2 < candidates.length && gems.length < cfg.gems; c2++) {
        var cand = candidates[c2];
        var ok = true;
        for (var g2 = 0; g2 < gems.length; g2++) {
          if (chebyshev(cand, gems[g2], w) < 2) { ok = false; break; }
        }
        if (ok) gems.push(cand);
      }
      if (gems.length < cfg.gems) continue;

      var sol = solve(moves, w, h, startIdx, gems);
      if (!sol) continue;

      var level = {
        index: index,
        name: cfg.name,
        w: w,
        h: h,
        grid: grid,
        moves: moves,
        start: startIdx,
        gems: gems,
        solution: sol.moves
      };

      if (!fallback || sol.moves > fallback.solution) fallback = level;
      if (sol.moves >= minMoves) {
        cache[index] = level;
        return level;
      }
    }

    if (fallback) {
      cache[index] = fallback;
      return fallback;
    }

    /* Практично недосяжний запасний варіант. */
    return makeFallback(index);
  }

  function makeFallback(index) {
    var w = 7, h = 7;
    var grid = [];
    for (var r = 0; r < h; r++) {
      var row = [];
      for (var c = 0; c < w; c++) {
        row.push((r === 0 || c === 0 || r === h - 1 || c === w - 1) ? 1 : 0);
      }
      grid.push(row);
    }
    grid[2][2] = 1;
    grid[2][4] = 1;
    grid[4][2] = 1;
    grid[4][4] = 1;
    var moves = buildMoves(grid, w, h);
    var start = 3 * w + 3;
    var gems = [1 * w + 3, 3 * w + 1, 5 * w + 3, 3 * w + 5];
    var level = {
      index: index,
      name: LEVELS[index].name,
      w: w,
      h: h,
      grid: grid,
      moves: moves,
      start: start,
      gems: gems.slice(0, Math.min(4, LEVELS[index].gems)),
      solution: 4
    };
    cache[index] = level;
    return level;
  }

  global.Maze = {
    LEVELS: LEVELS,
    DIRS: DIRS,
    generateLevel: generateLevel
  };
})(typeof window !== 'undefined' ? window : globalThis);
