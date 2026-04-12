# Classement (Leaderboard) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a "Classement" mode to City Battle — a leaderboard ranking ~35k French communes by any stat, with département filtering, top/flop toggle, and infinite scroll.

**Architecture:** Single-page app with mode toggle between Combat and Classement. All data is already client-side (~35k cities in memory). New `Leaderboard` module sorts/filters/renders. Shared stat definitions extracted to `Stats` module used by both `Battle` and `Leaderboard`. Existing `Autocomplete` constructor generalized for reuse with département search.

**Tech Stack:** Vanilla JS (IIFE modules, no bundler), CSS3, static HTML. No test framework — verification is manual in browser.

**Spec:** `docs/superpowers/specs/2026-04-12-classement-leaderboard-design.md`

---

### Task 1: Extract shared stat definitions to `js/stats.js`

**Files:**
- Create: `js/stats.js`
- Modify: `js/battle.js`
- Modify: `index.html`

- [ ] **Step 1: Create `js/stats.js`**

```javascript
const Stats = (() => {
  const ALL = [
    { key: 'p', label: '👥 Population', format: (v) => v.toLocaleString('fr-FR') },
    { key: 's', label: '📐 Superficie', format: (v) => v.toLocaleString('fr-FR') + ' km²' },
    { key: 'ds', label: '🏘️ Densité', format: (v) => v.toLocaleString('fr-FR') + ' hab/km²' },
    { key: 'a', label: '⛰️ Altitude', format: (v) => v.toLocaleString('fr-FR') + ' m' },
    { key: 'bars', label: '🍺 Bars', format: (v) => v.toLocaleString('fr-FR') },
    { key: 'resto', label: '🍽️ Restaurants', format: (v) => v.toLocaleString('fr-FR') },
    { key: 'pisc', label: '🏊 Piscines', format: (v) => v.toLocaleString('fr-FR') },
    { key: 'bars_r', label: '🍺 Bars / 10k hab', format: (v) => v.toLocaleString('fr-FR', { maximumFractionDigits: 1 }) },
    { key: 'resto_r', label: '🍽️ Restos / 10k hab', format: (v) => v.toLocaleString('fr-FR', { maximumFractionDigits: 1 }) },
    { key: 'pisc_r', label: '🏊 Piscines / 10k hab', format: (v) => v.toLocaleString('fr-FR', { maximumFractionDigits: 1 }) },
  ];

  const GROUPS = [
    { label: null, stats: ALL.slice(0, 4) },
    { label: null, stats: ALL.slice(4) },
  ];

  return { ALL, GROUPS };
})();
```

- [ ] **Step 2: Update `js/battle.js` to use `Stats.GROUPS`**

Remove the `STAT_GROUPS` constant (lines 3-24) and replace the single reference to it. The full updated `battle.js`:

```javascript
const Battle = (() => {
  function run(city1, city2) {
    const battleArea = document.getElementById('battle-area');
    const statsContainer = document.getElementById('stats-container');
    const winnerBanner = document.getElementById('winner-banner');
    const winnerName = document.getElementById('winner-name');
    const resetBtn = document.getElementById('reset-btn');

    // Screen flash
    const flash = document.createElement('div');
    flash.className = 'flash-overlay';
    document.body.appendChild(flash);
    flash.addEventListener('animationend', () => flash.remove());

    // Show battle area
    battleArea.classList.remove('hidden');
    statsContainer.innerHTML = '';
    winnerBanner.classList.add('hidden');
    winnerBanner.classList.remove('animate-in', 'tie');
    winnerName.className = 'winner-name';

    // City names
    const name1El = document.getElementById('city1-name');
    const name2El = document.getElementById('city2-name');
    const vsEl = battleArea.querySelector('.battle-vs');

    name1El.textContent = city1.n;
    name2El.textContent = city2.n;

    // Show department under city names
    const dept1El = document.getElementById('city1-dept');
    const dept2El = document.getElementById('city2-dept');
    dept1El.textContent = city1.d;
    dept2El.textContent = city2.d;
    name1El.className = 'city-name city1-color';
    name2El.className = 'city-name city2-color';
    vsEl.classList.remove('visible');

    // Trigger name animations
    requestAnimationFrame(() => {
      name1El.classList.add('animate-in-left');
      name2El.classList.add('animate-in-right');
      vsEl.classList.add('visible');
    });

    // Build stat rows
    let city1Wins = 0;
    let city2Wins = 0;
    let statIndex = 0;

    Stats.GROUPS.forEach((group, groupIdx) => {
      // Add separator before second group
      if (groupIdx > 0) {
        const sep = document.createElement('div');
        sep.className = 'stat-group-separator';
        statsContainer.appendChild(sep);

        setTimeout(() => {
          sep.classList.add('animate-in');
        }, 500 + statIndex * 200);
      }

      group.stats.forEach((stat) => {
        const v1 = city1[stat.key] || 0;
        const v2 = city2[stat.key] || 0;
        const maxVal = Math.max(v1, v2);
        const pct1 = maxVal > 0 ? (v1 / maxVal) * 100 : 0;
        const pct2 = maxVal > 0 ? (v2 / maxVal) * 100 : 0;
        const winner = v1 > v2 ? 1 : v2 > v1 ? 2 : 0;

        if (winner === 1) city1Wins++;
        if (winner === 2) city2Wins++;

        const row = document.createElement('div');
        row.className = 'stat-row';
        row.innerHTML = `
          <div class="stat-label">${stat.label}</div>
          <div class="stat-values">
            <div class="stat-value left ${winner === 1 ? 'winner city1' : ''}">${stat.format(v1)}</div>
            <div class="stat-bar-track left">
              <div class="stat-bar city1 ${winner === 1 ? 'winner' : ''}" data-width="${pct1}"></div>
            </div>
            <div class="stat-bar-track">
              <div class="stat-bar city2 ${winner === 2 ? 'winner' : ''}" data-width="${pct2}"></div>
            </div>
            <div class="stat-value right ${winner === 2 ? 'winner city2' : ''}">${stat.format(v2)}</div>
          </div>
        `;
        statsContainer.appendChild(row);

        const currentIdx = statIndex;
        setTimeout(() => {
          row.classList.add('animate-in');
          setTimeout(() => {
            row.querySelectorAll('.stat-bar').forEach((bar) => {
              bar.style.width = bar.dataset.width + '%';
            });
          }, 100);
        }, 500 + currentIdx * 200);

        statIndex++;
      });
    });

    // Winner banner
    const totalStats = Stats.GROUPS.reduce((sum, g) => sum + g.stats.length, 0);
    const totalDelay = 500 + totalStats * 200 + 400;
    setTimeout(() => {
      winnerBanner.classList.remove('hidden');

      if (city1Wins > city2Wins) {
        winnerName.textContent = city1.n;
        winnerName.classList.add('city1');
      } else if (city2Wins > city1Wins) {
        winnerName.textContent = city2.n;
        winnerName.classList.add('city2');
      } else {
        winnerName.textContent = 'ÉGALITÉ !';
        winnerName.classList.add('tie');
        winnerBanner.classList.add('tie');
      }

      requestAnimationFrame(() => {
        winnerBanner.classList.add('animate-in');
      });

      // Show reset button
      resetBtn.classList.remove('hidden');
    }, totalDelay);
  }

  return { run };
})();
```

- [ ] **Step 3: Add `stats.js` script tag to `index.html`**

Add it before `battle.js` and `leaderboard.js` (which doesn't exist yet) so both can reference `Stats`. Insert after the `data.js` script tag:

```html
  <script src="js/data.js?v=5"></script>
  <script src="js/stats.js?v=5"></script>
  <script src="js/autocomplete.js?v=5"></script>
  <script src="js/battle.js?v=5"></script>
  <script src="js/app.js?v=5"></script>
```

Also bump all `?v=4` to `?v=5` in the script and CSS tags.

- [ ] **Step 4: Verify battle still works**

Open `index.html` in browser. Select two cities and click FIGHT. Confirm all 10 stats render correctly with proper formatting, bars animate, and winner is declared. The battle should behave identically to before the refactor.

- [ ] **Step 5: Commit**

```bash
git add js/stats.js js/battle.js index.html
git commit -m "refactor: extract shared stat definitions to stats.js"
```

---

### Task 2: Refactor Autocomplete for reusability

**Files:**
- Modify: `js/autocomplete.js`

- [ ] **Step 1: Add options parameter to Autocomplete constructor**

Replace the entire `autocomplete.js` with:

```javascript
function Autocomplete(inputId, suggestionsId, onSelect, options) {
  const opts = options || {};
  const searchFn = opts.search || function (q) { return CityData.search(q); };
  const formatItem = opts.formatItem || function (item) {
    return item.n + ' <span class="dep">(' + item.d + ')</span>';
  };
  const formatSelected = opts.formatSelected || function (item) {
    return item.n + ' (' + item.d + ')';
  };

  const input = document.getElementById(inputId);
  const suggestionsEl = document.getElementById(suggestionsId);
  let debounceTimer = null;
  let selectedItem = null;
  let highlightedIdx = -1;
  let currentResults = [];

  function render(results) {
    currentResults = results;
    highlightedIdx = -1;

    if (results.length === 0) {
      suggestionsEl.classList.remove('active');
      suggestionsEl.innerHTML = '';
      return;
    }

    suggestionsEl.innerHTML = results
      .map(function (item, i) {
        return '<div class="suggestion-item" data-index="' + i + '">' +
          formatItem(item) +
          '</div>';
      })
      .join('');

    suggestionsEl.classList.add('active');

    suggestionsEl.querySelectorAll('.suggestion-item').forEach(function (el) {
      el.addEventListener('mousedown', function (e) {
        e.preventDefault();
        select(results[parseInt(el.dataset.index)]);
      });
    });
  }

  function select(item) {
    selectedItem = item;
    input.value = formatSelected(item);
    suggestionsEl.classList.remove('active');
    suggestionsEl.innerHTML = '';
    onSelect(item);
  }

  function updateHighlight() {
    var items = suggestionsEl.querySelectorAll('.suggestion-item');
    items.forEach(function (el, i) {
      el.classList.toggle('highlighted', i === highlightedIdx);
    });
    if (highlightedIdx >= 0 && items[highlightedIdx]) {
      items[highlightedIdx].scrollIntoView({ block: 'nearest' });
    }
  }

  input.addEventListener('input', function () {
    selectedItem = null;
    onSelect(null);
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(function () {
      var query = input.value.trim();
      var results = searchFn(query);
      render(results);
    }, 150);
  });

  input.addEventListener('keydown', function (e) {
    if (!suggestionsEl.classList.contains('active')) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      highlightedIdx = Math.min(highlightedIdx + 1, currentResults.length - 1);
      updateHighlight();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      highlightedIdx = Math.max(highlightedIdx - 1, 0);
      updateHighlight();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIdx >= 0 && currentResults[highlightedIdx]) {
        select(currentResults[highlightedIdx]);
      }
    } else if (e.key === 'Escape') {
      suggestionsEl.classList.remove('active');
    }
  });

  input.addEventListener('blur', function () {
    setTimeout(function () {
      suggestionsEl.classList.remove('active');
    }, 200);
  });

  function reset() {
    selectedItem = null;
    input.value = '';
    suggestionsEl.classList.remove('active');
    suggestionsEl.innerHTML = '';
    highlightedIdx = -1;
    currentResults = [];
  }

  function getSelected() {
    return selectedItem;
  }

  function setCity(item) {
    selectedItem = item;
    input.value = formatSelected(item);
  }

  return { reset, getSelected, setCity };
}
```

Key changes:
- 4th parameter `options` with `search`, `formatItem`, `formatSelected`
- Defaults preserve exact current behavior (city objects with `.n` and `.d`)
- Internal variable renamed from `selectedCity` to `selectedItem` for clarity
- No changes to the public API — `reset()`, `getSelected()`, `setCity()` work the same

- [ ] **Step 2: Verify city autocomplete still works**

Open in browser. Type a city name in both inputs. Confirm suggestions appear with "CityName (Département)" format, keyboard navigation works, selection fills the input, and FIGHT works.

- [ ] **Step 3: Commit**

```bash
git add js/autocomplete.js
git commit -m "refactor: make Autocomplete accept custom search and format functions"
```

---

### Task 3: Add département data methods to `js/data.js`

**Files:**
- Modify: `js/data.js`

- [ ] **Step 1: Add `getDepartements()` and `searchDepartements()` to CityData**

Replace the entire `data.js` with:

```javascript
const CityData = (() => {
  let cities = [];
  let normalized = [];
  let departements = null;
  let deptNormalized = null;

  function removeAccents(str) {
    return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  function stripPrefix(str) {
    return str
      .replace(/^l'/i, '')
      .replace(/^(le |la |les )/i, '')
      .trim();
  }

  async function load() {
    const resp = await fetch('data/cities.json?v=5');
    cities = await resp.json();

    normalized = cities.map((city, idx) => {
      const lower = removeAccents(city.n).toLowerCase().replace(/-/g, ' ');
      const stripped = removeAccents(stripPrefix(city.n)).toLowerCase().replace(/-/g, ' ');
      return { norm: lower, normNoPrefix: stripped, idx };
    });
  }

  function search(query, max) {
    if (max === undefined) max = 8;
    if (!query || query.length < 1) return [];

    const q = removeAccents(query).toLowerCase().replace(/-/g, ' ');
    const results = [];

    for (let i = 0; i < normalized.length && results.length < max; i++) {
      const entry = normalized[i];
      if (entry.norm.startsWith(q) || entry.normNoPrefix.startsWith(q)) {
        results.push(cities[entry.idx]);
      }
    }

    return results;
  }

  function getAll() {
    return cities;
  }

  function getDepartements() {
    if (!departements) {
      const set = new Set();
      for (let i = 0; i < cities.length; i++) {
        set.add(cities[i].d);
      }
      departements = Array.from(set).sort(function (a, b) {
        return a.localeCompare(b, 'fr');
      });
      deptNormalized = departements.map(function (d) {
        return removeAccents(d).toLowerCase().replace(/-/g, ' ');
      });
    }
    return departements;
  }

  function searchDepartements(query, max) {
    if (max === undefined) max = 8;
    if (!query || query.length < 1) return [];

    getDepartements(); // ensure cache is built
    var q = removeAccents(query).toLowerCase().replace(/-/g, ' ');
    var results = [];

    for (var i = 0; i < departements.length && results.length < max; i++) {
      if (deptNormalized[i].startsWith(q)) {
        results.push(departements[i]);
      }
    }

    return results;
  }

  return { load, search, getAll, getDepartements, searchDepartements };
})();
```

Key additions:
- `getDepartements()` — extracts unique département names from loaded cities, sorts alphabetically with French locale, caches result
- `searchDepartements(query, max)` — prefix-match search with accent normalization, returns array of strings (not objects)

- [ ] **Step 2: Verify in browser console**

Open the site, wait for data to load, then in the console:

```javascript
CityData.getDepartements().length  // should be ~101 (departments of France)
CityData.searchDepartements('par') // should return ["Paris"]
CityData.searchDepartements('hau') // should return ["Hauets-de-Seine", "Haute-Corse", ...] etc.
```

- [ ] **Step 3: Commit**

```bash
git add js/data.js
git commit -m "feat: add département search to CityData"
```

---

### Task 4: Add mode toggle and classement HTML structure

**Files:**
- Modify: `index.html`
- Modify: `css/style.css`

- [ ] **Step 1: Add mode toggle and classement section to `index.html`**

Insert the mode toggle after `<header>` closing tag and before `<main>`. Then add the classement section inside `<main>`, after the reset button. Also add the `leaderboard.js` script tag.

The full updated `index.html`:

```html
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>City Battle</title>
  <link rel="stylesheet" href="css/style.css?v=5">
</head>
<body>
  <header>
    <h1 class="title">CITY <span class="title-accent">BATTLE</span></h1>
    <div class="title-line"></div>
  </header>

  <!-- Mode toggle -->
  <div class="mode-toggle" id="mode-toggle">
    <button class="mode-btn active" data-mode="combat">⚔️ COMBAT</button>
    <button class="mode-btn" data-mode="classement">🏆 CLASSEMENT</button>
  </div>

  <!-- Loader overlay -->
  <div id="loader" class="loader-overlay">
    <div class="loader-content">
      <div class="spinner"></div>
      <div class="loader-text">Chargement des villes...</div>
    </div>
  </div>

  <main>
    <!-- ===== COMBAT MODE ===== -->
    <section id="combat-section">
      <section class="input-area" id="input-area">
        <div class="input-wrapper" id="input-wrapper-1">
          <input type="text" id="city-input-1" class="city-input" placeholder="Choisir une ville..." autocomplete="off">
          <div class="suggestions" id="suggestions-1"></div>
        </div>

        <div class="vs-badge">VS</div>

        <div class="input-wrapper" id="input-wrapper-2">
          <input type="text" id="city-input-2" class="city-input" placeholder="Choisir une ville..." autocomplete="off">
          <div class="suggestions" id="suggestions-2"></div>
        </div>
      </section>

      <div class="btn-row">
        <button id="random-btn" class="random-btn" title="Combat aléatoire">&#x1F3B2;</button>
        <button id="fight-btn" class="fight-btn" disabled>FIGHT!</button>
      </div>

      <section id="battle-area" class="battle-area hidden">
        <div class="battle-header">
          <div class="city-header-block">
            <div id="city1-name" class="city-name city1-color"></div>
            <div id="city1-dept" class="city-dept city1-color"></div>
          </div>
          <div class="battle-vs">VS</div>
          <div class="city-header-block">
            <div id="city2-name" class="city-name city2-color"></div>
            <div id="city2-dept" class="city-dept city2-color"></div>
          </div>
        </div>

        <div id="stats-container" class="stats-container"></div>

        <div id="winner-banner" class="winner-banner hidden">
          <div class="winner-label">VAINQUEUR</div>
          <div id="winner-name" class="winner-name"></div>
        </div>
      </section>

      <button id="reset-btn" class="reset-btn hidden">NOUVEAU COMBAT</button>
    </section>

    <!-- ===== CLASSEMENT MODE ===== -->
    <section id="classement-section" class="hidden">
      <!-- Controls -->
      <div class="lb-controls">
        <div class="lb-control">
          <div class="lb-control-label">Critère</div>
          <select id="lb-criteria" class="lb-select"></select>
        </div>

        <div class="lb-control">
          <div class="lb-control-label">Département</div>
          <div class="input-wrapper">
            <input type="text" id="lb-dept-input" class="city-input" placeholder="Toute la France..." autocomplete="off">
            <div class="suggestions" id="lb-dept-suggestions"></div>
          </div>
        </div>

        <div class="lb-control lb-control-toggle">
          <div class="lb-toggle" id="lb-toggle">
            <button class="lb-toggle-btn active" data-dir="top">🔝 TOP</button>
            <button class="lb-toggle-btn" data-dir="flop">💀 FLOP</button>
          </div>
        </div>
      </div>

      <!-- Leaderboard table -->
      <div class="lb-table">
        <div class="lb-header">
          <div class="lb-rank">#</div>
          <div class="lb-city">Ville</div>
          <div class="lb-dept">Département</div>
          <div class="lb-value">Valeur</div>
        </div>
        <div id="leaderboard-list"></div>
        <div id="lb-sentinel" class="lb-sentinel">▼ Scroll pour voir plus ▼</div>
      </div>
    </section>
  </main>

  <script src="js/data.js?v=5"></script>
  <script src="js/stats.js?v=5"></script>
  <script src="js/autocomplete.js?v=5"></script>
  <script src="js/battle.js?v=5"></script>
  <script src="js/leaderboard.js?v=5"></script>
  <script src="js/app.js?v=5"></script>
</body>
</html>
```

- [ ] **Step 2: Add generic `.hidden` utility and mode toggle CSS to `css/style.css`**

Add after the `:root` variables block, before `body`:

```css
.hidden {
  display: none;
}
```

Then add after the `/* ===== Header ===== */` section (after `.title-line`):

```css
/* ===== Mode Toggle ===== */
.mode-toggle {
  display: flex;
  justify-content: center;
  gap: 0;
  margin: 20px auto 24px;
}

.mode-btn {
  padding: 10px 28px;
  background: var(--surface);
  border: 1px solid #333;
  color: #888;
  font-weight: 700;
  font-size: 0.85rem;
  letter-spacing: 1px;
  cursor: pointer;
  transition: all 0.2s;
}

.mode-btn:first-child {
  border-radius: 8px 0 0 8px;
}

.mode-btn:last-child {
  border-radius: 0 8px 8px 0;
  border-left: none;
}

.mode-btn.active {
  background: linear-gradient(135deg, rgba(0, 240, 255, 0.08), rgba(255, 45, 85, 0.08));
  border-color: var(--city1);
  color: var(--city1);
  text-shadow: 0 0 8px rgba(0, 240, 255, 0.4);
}

.mode-btn:not(.active):hover {
  border-color: var(--text-muted);
  color: var(--text);
}
```

- [ ] **Step 3: Add classement controls CSS to `css/style.css`**

Add after the mode toggle section:

```css
/* ===== Classement Controls ===== */
.lb-controls {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
  flex-wrap: wrap;
  justify-content: center;
  align-items: flex-end;
}

.lb-control {
  flex: 1;
  min-width: 200px;
  max-width: 280px;
}

.lb-control-toggle {
  flex: 0;
  min-width: auto;
}

.lb-control-label {
  font-size: 0.65rem;
  color: #888;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 6px;
}

.lb-select {
  width: 100%;
  padding: 12px 16px;
  background: var(--surface);
  border: 1px solid #333;
  border-radius: 6px;
  color: var(--text);
  font-size: 1rem;
  outline: none;
  cursor: pointer;
  appearance: none;
  -webkit-appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%23888' fill='none' stroke-width='1.5'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 14px center;
}

.lb-select:focus {
  border-color: var(--city2);
}

.lb-toggle {
  display: flex;
  gap: 0;
}

.lb-toggle-btn {
  padding: 12px 18px;
  background: var(--surface);
  border: 1px solid #333;
  color: #888;
  font-weight: 700;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.lb-toggle-btn:first-child {
  border-radius: 6px 0 0 6px;
}

.lb-toggle-btn:last-child {
  border-radius: 0 6px 6px 0;
  border-left: none;
}

.lb-toggle-btn.active {
  background: rgba(0, 240, 255, 0.08);
  border-color: var(--city1);
  color: var(--city1);
}
```

- [ ] **Step 4: Add leaderboard table CSS to `css/style.css`**

Add after the classement controls section:

```css
/* ===== Leaderboard Table ===== */
.lb-table {
  border: 1px solid #222;
  border-radius: 8px;
  overflow: hidden;
  margin-bottom: 40px;
}

.lb-header {
  display: flex;
  padding: 10px 16px;
  background: #111;
  border-bottom: 1px solid #333;
  font-size: 0.65rem;
  color: #888;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.lb-row {
  display: flex;
  padding: 12px 16px;
  border-bottom: 1px solid #1a1a1a;
  align-items: center;
}

.lb-rank {
  width: 40px;
  font-weight: 700;
  color: var(--text-muted);
  font-size: 0.9rem;
}

.lb-city {
  flex: 1;
  font-weight: 600;
  color: #ccc;
  font-size: 0.9rem;
}

.lb-dept {
  width: 120px;
  text-align: right;
  color: #888;
  font-size: 0.8rem;
}

.lb-value {
  width: 100px;
  text-align: right;
  font-weight: 600;
  color: var(--city1);
  font-size: 0.9rem;
  font-variant-numeric: tabular-nums;
  opacity: 0.8;
}

/* Header text overrides */
.lb-header .lb-rank,
.lb-header .lb-city,
.lb-header .lb-dept,
.lb-header .lb-value {
  font-weight: 400;
  color: #888;
  font-size: 0.65rem;
}

/* Podium styling */
.lb-podium .lb-city {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--text);
}

.lb-podium .lb-value {
  font-size: 0.95rem;
  font-weight: 700;
  opacity: 1;
}

.lb-podium .lb-rank {
  font-weight: 900;
  font-size: 1.1rem;
}

.lb-rank-1 {
  background: rgba(255, 215, 0, 0.03);
}

.lb-rank-1 .lb-rank {
  color: #ffd700;
  text-shadow: 0 0 10px rgba(255, 215, 0, 0.4);
}

.lb-rank-2 {
  background: rgba(192, 192, 192, 0.03);
}

.lb-rank-2 .lb-rank {
  color: #c0c0c0;
  text-shadow: 0 0 10px rgba(192, 192, 192, 0.4);
}

.lb-rank-3 {
  background: rgba(205, 127, 50, 0.03);
}

.lb-rank-3 .lb-rank {
  color: #cd7f32;
  text-shadow: 0 0 10px rgba(205, 127, 50, 0.4);
}

/* Sentinel / infinite scroll indicator */
.lb-sentinel {
  padding: 20px;
  text-align: center;
  color: var(--text-dim);
  font-size: 0.8rem;
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 1; }
}
```

- [ ] **Step 5: Add classement responsive rules to `css/style.css`**

Inside the existing `@media (max-width: 600px)` block, add:

```css
  .mode-btn {
    padding: 8px 16px;
    font-size: 0.75rem;
  }

  .lb-controls {
    flex-direction: column;
    align-items: stretch;
  }

  .lb-control {
    max-width: none;
  }

  .lb-control-toggle {
    display: flex;
    justify-content: center;
  }

  .lb-dept {
    display: none;
  }

  .lb-header .lb-dept {
    display: none;
  }

  .lb-value {
    width: 80px;
    font-size: 0.8rem;
  }
```

- [ ] **Step 6: Verify in browser**

Open the site. Confirm:
- Mode toggle appears between header and content
- COMBAT is active by default
- Clicking CLASSEMENT doesn't do anything yet (just visual toggle — JS not wired up)
- The site doesn't crash (leaderboard.js doesn't exist yet, so check there's no script error — we'll create it in the next task)

Note: there WILL be a 404 for `leaderboard.js` in the console — that's expected and fixed in Task 5.

- [ ] **Step 7: Commit**

```bash
git add index.html css/style.css
git commit -m "feat: add mode toggle and classement HTML/CSS structure"
```

---

### Task 5: Implement leaderboard module

**Files:**
- Create: `js/leaderboard.js`

- [ ] **Step 1: Create `js/leaderboard.js`**

```javascript
const Leaderboard = (() => {
  const PAGE_SIZE = 50;
  let currentKey = 'p';
  let currentDept = null;
  let isFlop = false;
  let sortedData = [];
  let displayedCount = 0;
  let observer = null;

  function init() {
    buildCriteriaOptions();
    setupObserver();
    update();
  }

  function buildCriteriaOptions() {
    var select = document.getElementById('lb-criteria');
    Stats.ALL.forEach(function (stat) {
      var opt = document.createElement('option');
      opt.value = stat.key;
      opt.textContent = stat.label;
      select.appendChild(opt);
    });
  }

  function setupObserver() {
    var sentinel = document.getElementById('lb-sentinel');
    observer = new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting && displayedCount < sortedData.length) {
        renderMore();
      }
    }, { rootMargin: '200px' });
    observer.observe(sentinel);
  }

  function setCriterion(key) {
    currentKey = key;
    update();
  }

  function setDepartement(dept) {
    currentDept = dept;
    update();
  }

  function setFlop(flop) {
    isFlop = flop;
    update();
  }

  function update() {
    var data = CityData.getAll();

    if (currentDept) {
      data = data.filter(function (c) { return c.d === currentDept; });
    }

    var key = currentKey;
    sortedData = data.slice().sort(function (a, b) {
      var va = a[key] || 0;
      var vb = b[key] || 0;
      var diff = isFlop ? va - vb : vb - va;
      return diff !== 0 ? diff : a.n.localeCompare(b.n, 'fr');
    });

    displayedCount = 0;
    var list = document.getElementById('leaderboard-list');
    list.innerHTML = '';

    var sentinel = document.getElementById('lb-sentinel');
    sentinel.style.display = '';

    renderMore();

    // Scroll leaderboard back to top
    list.parentElement.scrollTop = 0;
    window.scrollTo({ top: document.getElementById('classement-section').offsetTop - 80, behavior: 'smooth' });
  }

  function renderMore() {
    var list = document.getElementById('leaderboard-list');
    var stat = null;
    for (var i = 0; i < Stats.ALL.length; i++) {
      if (Stats.ALL[i].key === currentKey) { stat = Stats.ALL[i]; break; }
    }

    var end = Math.min(displayedCount + PAGE_SIZE, sortedData.length);

    for (var i = displayedCount; i < end; i++) {
      var city = sortedData[i];
      var rank = i + 1;
      var row = document.createElement('div');
      row.className = 'lb-row';
      if (rank <= 3) row.className += ' lb-podium lb-rank-' + rank;

      row.innerHTML =
        '<div class="lb-rank">' + rank + '</div>' +
        '<div class="lb-city">' + city.n + '</div>' +
        '<div class="lb-dept">' + city.d + '</div>' +
        '<div class="lb-value">' + stat.format(city[stat.key] || 0) + '</div>';

      list.appendChild(row);
    }

    displayedCount = end;

    var sentinel = document.getElementById('lb-sentinel');
    if (displayedCount >= sortedData.length) {
      sentinel.style.display = 'none';
    }
  }

  return { init, setCriterion, setDepartement, setFlop };
})();
```

- [ ] **Step 2: Commit**

```bash
git add js/leaderboard.js
git commit -m "feat: implement leaderboard module with sorting and infinite scroll"
```

---

### Task 6: Wire up mode toggle and leaderboard in `app.js`

**Files:**
- Modify: `js/app.js`

- [ ] **Step 1: Replace `js/app.js` with full wiring**

```javascript
document.addEventListener('DOMContentLoaded', async () => {
  const fightBtn = document.getElementById('fight-btn');
  const randomBtn = document.getElementById('random-btn');
  const resetBtn = document.getElementById('reset-btn');
  const battleArea = document.getElementById('battle-area');
  const loader = document.getElementById('loader');

  // Mode sections
  const combatSection = document.getElementById('combat-section');
  const classementSection = document.getElementById('classement-section');
  const modeBtns = document.querySelectorAll('.mode-btn');

  // Load city data
  await CityData.load();

  // Fade out loader overlay
  loader.classList.add('fade-out');
  loader.addEventListener('transitionend', () => loader.remove());

  // ===== MODE TOGGLE =====
  modeBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const mode = btn.dataset.mode;
      modeBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');

      if (mode === 'combat') {
        combatSection.classList.remove('hidden');
        classementSection.classList.add('hidden');
      } else {
        combatSection.classList.add('hidden');
        classementSection.classList.remove('hidden');
      }
    });
  });

  // ===== COMBAT MODE =====
  let city1 = null;
  let city2 = null;

  function updateFightButton() {
    fightBtn.disabled = !(city1 && city2);
  }

  const ac1 = Autocomplete('city-input-1', 'suggestions-1', (city) => {
    city1 = city;
    updateFightButton();
  });

  const ac2 = Autocomplete('city-input-2', 'suggestions-2', (city) => {
    city2 = city;
    updateFightButton();
  });

  randomBtn.addEventListener('click', () => {
    const all = CityData.getAll();
    const i1 = Math.floor(Math.random() * all.length);
    let i2 = Math.floor(Math.random() * (all.length - 1));
    if (i2 >= i1) i2++;
    city1 = all[i1];
    city2 = all[i2];
    ac1.setCity(city1);
    ac2.setCity(city2);
    updateFightButton();
    fightBtn.click();
  });

  fightBtn.addEventListener('click', () => {
    if (!city1 || !city2) return;
    fightBtn.disabled = true;
    Battle.run(city1, city2);
  });

  resetBtn.addEventListener('click', () => {
    city1 = null;
    city2 = null;
    ac1.reset();
    ac2.reset();
    battleArea.classList.add('hidden');
    resetBtn.classList.add('hidden');
    updateFightButton();
  });

  // ===== CLASSEMENT MODE =====

  // Département autocomplete
  Autocomplete('lb-dept-input', 'lb-dept-suggestions', (dept) => {
    Leaderboard.setDepartement(dept);
  }, {
    search: (q) => CityData.searchDepartements(q),
    formatItem: (dept) => dept,
    formatSelected: (dept) => dept,
  });

  // Criteria picker
  const criteriaSelect = document.getElementById('lb-criteria');
  criteriaSelect.addEventListener('change', () => {
    Leaderboard.setCriterion(criteriaSelect.value);
  });

  // Top/Flop toggle
  const toggleBtns = document.querySelectorAll('.lb-toggle-btn');
  toggleBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      toggleBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      Leaderboard.setFlop(btn.dataset.dir === 'flop');
    });
  });

  // Initialize leaderboard
  Leaderboard.init();
});
```

- [ ] **Step 2: Verify full feature in browser**

Open the site and test:

1. **Combat mode (default):** Pick two cities, click FIGHT — battle works as before
2. **Switch to Classement:** Click 🏆 CLASSEMENT — leaderboard appears with Population ranking
3. **Change criteria:** Select "🍺 Bars / 10k hab" — ranking updates
4. **Top/Flop toggle:** Click 💀 FLOP — shows lowest values first
5. **Département filter:** Type "Paris" — autocomplete shows "Paris", select it — ranking filters to Paris only
6. **Clear département:** Clear the input — goes back to national ranking
7. **Infinite scroll:** Scroll down — more rows load automatically
8. **Switch back to Combat:** Click ⚔️ COMBAT — battle view returns, leaderboard hidden
9. **Mobile:** Resize to <600px — controls stack, département column hides

- [ ] **Step 3: Commit**

```bash
git add js/app.js
git commit -m "feat: wire up mode toggle, classement controls, and leaderboard"
```

---

### Task 7: Full end-to-end verification

- [ ] **Step 1: Full end-to-end test**

Open the site fresh (hard refresh). Verify:
1. Loader appears and fades out
2. Combat mode is shown by default
3. Mode toggle switches cleanly between Combat and Classement
4. All 10 criteria work in the leaderboard
5. Département filter works (type, select, clear)
6. Top/Flop toggles correctly
7. Infinite scroll loads more rows
8. Gold/silver/bronze styling on top 3
9. Switching back to Combat mode preserves battle state if one was in progress
10. Mobile responsive layout at <600px

- [ ] **Step 2: Fix any issues found and commit**

If anything needs fixing, make the change and commit:

```bash
git add -A
git commit -m "fix: address end-to-end verification issues"
```
