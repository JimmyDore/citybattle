# City Battle Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a static "battle" website comparing two French cities with an animated tale-of-the-tape display, deployed to citybattle.jimmydore.fr via GitHub Actions.

**Architecture:** Single-page vanilla HTML/CSS/JS app. A Node.js build script converts a CSV of ~35K communes into a lean JSON file committed to the repo. Two autocomplete inputs let users pick cities, a FIGHT! button triggers an animated stat comparison. Deployment is git pull on VPS via SSH from GitHub Actions.

**Tech Stack:** HTML, CSS, vanilla JavaScript, Node.js (build script only)

---

## File Structure

```
├── index.html                  # Single page: inputs, battle area, reset button
├── css/
│   └── style.css               # Neon Fight Club theme, animations, autocomplete dropdown
├── js/
│   ├── data.js                 # Fetch and expose cities array
│   ├── autocomplete.js         # Autocomplete widget for city inputs
│   ├── battle.js               # Comparison logic, DOM rendering, animations
│   └── app.js                  # Wire inputs, button, reset together
├── data/
│   └── cities.json             # Generated, committed (~35K entries)
├── scripts/
│   └── build-data.js           # Node: CSV → JSON
├── communes-france-2025.csv    # Source CSV (gitignored from deploy, but committed)
├── .github/
│   └── workflows/
│       └── deploy.yml          # Push to main → SSH git pull on VPS
└── .gitignore
```

---

### Task 1: Build-Data Script

**Files:**
- Create: `scripts/build-data.js`
- Create: `data/cities.json` (generated output)
- Create: `.gitignore`

- [ ] **Step 1: Create .gitignore**

```gitignore
node_modules/
.superpowers/
```

- [ ] **Step 2: Write the build-data script**

Create `scripts/build-data.js`:

```javascript
const fs = require('fs');
const path = require('path');

const csvPath = path.join(__dirname, '..', 'communes-france-2025.csv');
const outPath = path.join(__dirname, '..', 'data', 'cities.json');

const csv = fs.readFileSync(csvPath, 'utf-8');
const lines = csv.split('\n');
const header = lines[0].split(',');

// Find column indices
const col = (name) => {
  const idx = header.indexOf(name);
  if (idx === -1) throw new Error(`Column "${name}" not found. Available: ${header.join(', ')}`);
  return idx;
};

const iNom = col('nom_standard');
const iDep = col('dep_nom');
const iPop = col('population');
const iSup = col('superficie_km2');
const iDens = col('densite');
const iAlt = col('altitude_moyenne');

const cities = [];

for (let i = 1; i < lines.length; i++) {
  const line = lines[i].trim();
  if (!line) continue;

  // Parse CSV respecting quoted fields (commune names can contain commas)
  const fields = [];
  let field = '';
  let inQuotes = false;
  for (let j = 0; j < line.length; j++) {
    const ch = line[j];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      fields.push(field);
      field = '';
    } else {
      field += ch;
    }
  }
  fields.push(field);

  const nom = fields[iNom];
  const dep = fields[iDep];
  const pop = parseInt(fields[iPop], 10);

  if (!nom || isNaN(pop)) continue;

  const sup = parseFloat(fields[iSup]) || 0;
  const dens = parseFloat(fields[iDens]) || 0;
  const alt = parseInt(fields[iAlt], 10) || 0;

  cities.push({ n: nom, d: dep, p: pop, s: sup, ds: dens, a: alt });
}

// Sort alphabetically by name
cities.sort((a, b) => a.n.localeCompare(b.n, 'fr'));

// Ensure output directory exists
const outDir = path.dirname(outPath);
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

fs.writeFileSync(outPath, JSON.stringify(cities));

console.log(`Generated ${cities.length} cities → ${outPath}`);
console.log(`File size: ${(fs.statSync(outPath).size / 1024 / 1024).toFixed(2)} MB`);
```

- [ ] **Step 3: Run the script and verify output**

Run: `node scripts/build-data.js`
Expected: Output like `Generated 34935 cities → data/cities.json` with file size ~2-3 MB.

Verify a sample: `node -e "const d=require('./data/cities.json'); console.log(d.length, d[0], d[d.length-1])"`
Expected: ~34935 entries, first entry starts with "A", last with a late letter. Each has keys `n`, `d`, `p`, `s`, `ds`, `a`.

- [ ] **Step 4: Commit**

```bash
git add .gitignore scripts/build-data.js data/cities.json
git commit -m "feat: add build-data script and generate cities.json from CSV"
```

---

### Task 2: HTML Structure

**Files:**
- Create: `index.html`

- [ ] **Step 1: Create index.html**

```html
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>City Battle</title>
  <link rel="stylesheet" href="css/style.css">
</head>
<body>
  <header>
    <h1 class="title">CITY <span class="title-accent">BATTLE</span></h1>
    <div class="title-line"></div>
  </header>

  <main>
    <!-- Input area -->
    <section class="input-area">
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

    <button id="fight-btn" class="fight-btn" disabled>FIGHT!</button>

    <!-- Battle area (hidden until fight) -->
    <section id="battle-area" class="battle-area hidden">
      <div class="battle-header">
        <div id="city1-name" class="city-name city1-color"></div>
        <div class="battle-vs">VS</div>
        <div id="city2-name" class="city-name city2-color"></div>
      </div>

      <div id="stats-container" class="stats-container">
        <!-- Stat rows injected by battle.js -->
      </div>

      <div id="winner-banner" class="winner-banner hidden">
        <div class="winner-label">VAINQUEUR</div>
        <div id="winner-name" class="winner-name"></div>
      </div>
    </section>

    <button id="reset-btn" class="reset-btn hidden">NOUVEAU COMBAT</button>
  </main>

  <script src="js/data.js"></script>
  <script src="js/autocomplete.js"></script>
  <script src="js/battle.js"></script>
  <script src="js/app.js"></script>
</body>
</html>
```

- [ ] **Step 2: Verify file opens in browser**

Run: `open index.html` (or check in browser)
Expected: A blank dark page with input fields visible (no styling yet, but structure loads without JS errors). Check browser console for no errors.

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat: add HTML structure for city battle page"
```

---

### Task 3: CSS — Neon Fight Club Theme

**Files:**
- Create: `css/style.css`

- [ ] **Step 1: Create the stylesheet**

Create `css/style.css`:

```css
/* ===== Reset & Base ===== */
*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

:root {
  --bg: #0a0a0a;
  --surface: #1a1a1a;
  --city1: #00f0ff;
  --city2: #ff2d55;
  --city1-glow: rgba(0, 240, 255, 0.3);
  --city2-glow: rgba(255, 45, 85, 0.3);
  --text: #eee;
  --text-dim: #555;
  --text-muted: #666;
}

body {
  background: var(--bg);
  color: var(--text);
  font-family: 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
}

/* ===== Header ===== */
header {
  text-align: center;
  padding: 40px 20px 20px;
}

.title {
  font-size: 2.5rem;
  font-weight: 900;
  letter-spacing: 6px;
  color: var(--text);
  text-transform: uppercase;
}

.title-accent {
  color: var(--city2);
  text-shadow: 0 0 30px var(--city2-glow);
}

.title-line {
  width: 200px;
  height: 2px;
  background: linear-gradient(90deg, transparent, var(--city2), transparent);
  margin: 12px auto 0;
}

/* ===== Input Area ===== */
main {
  width: 100%;
  max-width: 800px;
  padding: 0 20px;
}

.input-area {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 24px;
}

.input-wrapper {
  flex: 1;
  position: relative;
}

.city-input {
  width: 100%;
  padding: 12px 16px;
  background: var(--surface);
  border: 1px solid #333;
  border-radius: 6px;
  color: var(--text);
  font-size: 1rem;
  outline: none;
  transition: border-color 0.2s;
}

.city-input:focus {
  border-color: var(--city2);
}

.city-input::placeholder {
  color: var(--text-dim);
}

.vs-badge {
  font-size: 1.2rem;
  font-weight: 900;
  color: var(--city2);
  padding-top: 10px;
  flex-shrink: 0;
}

/* ===== Autocomplete Suggestions ===== */
.suggestions {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: #1e1e1e;
  border: 1px solid #333;
  border-top: none;
  border-radius: 0 0 6px 6px;
  max-height: 280px;
  overflow-y: auto;
  z-index: 10;
  display: none;
}

.suggestions.active {
  display: block;
}

.suggestion-item {
  padding: 10px 16px;
  cursor: pointer;
  font-size: 0.9rem;
  color: var(--text);
  border-bottom: 1px solid #2a2a2a;
}

.suggestion-item:last-child {
  border-bottom: none;
}

.suggestion-item:hover,
.suggestion-item.highlighted {
  background: #2a2a2a;
}

.suggestion-item .dep {
  color: var(--text-dim);
  font-size: 0.8rem;
}

/* ===== Fight Button ===== */
.fight-btn {
  display: block;
  width: 100%;
  padding: 14px;
  background: var(--city2);
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 1.3rem;
  font-weight: 900;
  letter-spacing: 4px;
  cursor: pointer;
  transition: opacity 0.2s, box-shadow 0.2s;
  text-transform: uppercase;
}

.fight-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.fight-btn:not(:disabled):hover {
  box-shadow: 0 0 20px var(--city2-glow);
}

/* ===== Battle Area ===== */
.battle-area {
  margin-top: 40px;
}

.battle-area.hidden {
  display: none;
}

.battle-header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 24px;
  margin-bottom: 32px;
}

.city-name {
  font-size: 2rem;
  font-weight: 900;
  letter-spacing: 2px;
  text-transform: uppercase;
  opacity: 0;
  transform: translateX(0);
}

.city-name.animate-in-left {
  animation: slam-left 0.4s ease-out forwards;
}

.city-name.animate-in-right {
  animation: slam-right 0.4s ease-out forwards;
}

.city1-color {
  color: var(--city1);
  text-shadow: 0 0 15px var(--city1-glow);
}

.city2-color {
  color: var(--city2);
  text-shadow: 0 0 15px var(--city2-glow);
}

.battle-vs {
  font-size: 1.5rem;
  font-weight: 900;
  color: var(--city2);
  text-shadow: 0 0 20px var(--city2-glow);
  opacity: 0;
}

.battle-vs.visible {
  opacity: 1;
}

/* ===== Stat Rows ===== */
.stats-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.stat-row {
  opacity: 0;
  transform: translateY(10px);
}

.stat-row.animate-in {
  animation: fade-up 0.3s ease-out forwards;
}

.stat-label {
  text-align: center;
  color: var(--text-dim);
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 3px;
  margin-bottom: 6px;
  font-weight: 600;
}

.stat-values {
  display: flex;
  align-items: center;
  gap: 8px;
}

.stat-value {
  width: 90px;
  font-size: 0.9rem;
  font-variant-numeric: tabular-nums;
  color: var(--text-muted);
}

.stat-value.left {
  text-align: right;
}

.stat-value.right {
  text-align: left;
}

.stat-value.winner {
  font-weight: 700;
}

.stat-value.winner.city1 {
  color: var(--city1);
}

.stat-value.winner.city2 {
  color: var(--city2);
}

.stat-bar-track {
  flex: 1;
  height: 6px;
  background: var(--surface);
  border-radius: 3px;
  overflow: hidden;
}

.stat-bar-track.left {
  direction: rtl;
}

.stat-bar {
  height: 100%;
  width: 0;
  border-radius: 3px;
  transition: width 0.6s ease-out;
}

.stat-bar.city1 {
  background: linear-gradient(90deg, #00a8b5, var(--city1));
}

.stat-bar.city2 {
  background: linear-gradient(90deg, var(--city2), #ff6b81);
}

.stat-bar.winner.city1 {
  box-shadow: 0 0 8px var(--city1-glow);
}

.stat-bar.winner.city2 {
  box-shadow: 0 0 8px var(--city2-glow);
}

/* ===== Winner Banner ===== */
.winner-banner {
  text-align: center;
  margin-top: 32px;
  padding: 16px;
  border: 1px solid var(--city2);
  border-radius: 8px;
  background: rgba(255, 45, 85, 0.08);
  opacity: 0;
  transform: translateY(20px);
}

.winner-banner.hidden {
  display: none;
}

.winner-banner.animate-in {
  animation: slide-up 0.4s ease-out forwards;
}

.winner-label {
  font-size: 0.7rem;
  color: var(--text-dim);
  text-transform: uppercase;
  letter-spacing: 3px;
  margin-bottom: 4px;
}

.winner-name {
  font-size: 1.5rem;
  font-weight: 900;
  letter-spacing: 2px;
}

.winner-name.city1 {
  color: var(--city1);
  text-shadow: 0 0 15px var(--city1-glow);
}

.winner-name.city2 {
  color: var(--city2);
  text-shadow: 0 0 15px var(--city2-glow);
}

.winner-name.tie {
  background: linear-gradient(90deg, var(--city1), var(--city2));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.winner-banner.tie {
  border-color: var(--city1);
  background: linear-gradient(135deg, rgba(0, 240, 255, 0.05), rgba(255, 45, 85, 0.05));
}

/* ===== Reset Button ===== */
.reset-btn {
  display: block;
  width: 100%;
  padding: 12px;
  margin-top: 24px;
  margin-bottom: 40px;
  background: transparent;
  border: 1px solid #333;
  border-radius: 6px;
  color: var(--text-dim);
  font-size: 0.9rem;
  font-weight: 600;
  letter-spacing: 2px;
  text-transform: uppercase;
  cursor: pointer;
  transition: border-color 0.2s, color 0.2s;
}

.reset-btn.hidden {
  display: none;
}

.reset-btn:hover {
  border-color: var(--text-muted);
  color: var(--text);
}

/* ===== Screen Flash ===== */
.flash-overlay {
  position: fixed;
  inset: 0;
  background: white;
  z-index: 100;
  animation: flash 0.3s ease-out forwards;
  pointer-events: none;
}

/* ===== Animations ===== */
@keyframes slam-left {
  from { opacity: 0; transform: translateX(-60px); }
  to   { opacity: 1; transform: translateX(0); }
}

@keyframes slam-right {
  from { opacity: 0; transform: translateX(60px); }
  to   { opacity: 1; transform: translateX(0); }
}

@keyframes fade-up {
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
}

@keyframes slide-up {
  from { opacity: 0; transform: translateY(20px); }
  to   { opacity: 1; transform: translateY(0); }
}

@keyframes flash {
  0%   { opacity: 0.7; }
  100% { opacity: 0; }
}

/* ===== Responsive ===== */
@media (max-width: 600px) {
  .title {
    font-size: 1.8rem;
    letter-spacing: 4px;
  }

  .input-area {
    flex-direction: column;
    align-items: stretch;
  }

  .vs-badge {
    text-align: center;
    padding: 4px 0;
  }

  .city-name {
    font-size: 1.4rem;
  }

  .stat-value {
    width: 70px;
    font-size: 0.8rem;
  }
}
```

- [ ] **Step 2: Verify styling in browser**

Run: `open index.html`
Expected: Dark page with neon title "CITY BATTLE", two input fields with VS between them, disabled FIGHT button. The Neon Fight Club look should be visible.

- [ ] **Step 3: Commit**

```bash
git add css/style.css
git commit -m "feat: add Neon Fight Club CSS theme with animations"
```

---

### Task 4: Data Loading Module

**Files:**
- Create: `js/data.js`

- [ ] **Step 1: Create data.js**

```javascript
const CityData = (() => {
  let cities = [];
  let normalized = []; // { norm: "lyon", normNoPrefix: "lyon", idx: 0 }

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
    const resp = await fetch('data/cities.json');
    cities = await resp.json();

    normalized = cities.map((city, idx) => {
      const lower = removeAccents(city.n).toLowerCase();
      const stripped = removeAccents(stripPrefix(city.n)).toLowerCase();
      return { norm: lower, normNoPrefix: stripped, idx };
    });
  }

  function search(query, max = 8) {
    if (!query || query.length < 1) return [];

    const q = removeAccents(query).toLowerCase();
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

  return { load, search, getAll };
})();
```

- [ ] **Step 2: Verify data loads in browser**

Add a temporary test at the end of `index.html` before `</body>`:
```html
<script>
  CityData.load().then(() => {
    console.log('Cities loaded:', CityData.getAll().length);
    console.log('Search "lyon":', CityData.search('lyon'));
    console.log('Search "beziers":', CityData.search('beziers'));
    console.log('Search "abergement":', CityData.search('abergement'));
  });
</script>
```

Open in browser (must be served, not file://, for fetch to work).
Run: `python3 -m http.server 8080` then open `http://localhost:8080`
Expected console output: cities count ~34935, "lyon" returns Lyon entries, "beziers" returns Béziers, "abergement" returns L'Abergement entries.

Remove the temporary test script after verifying.

- [ ] **Step 3: Commit**

```bash
git add js/data.js
git commit -m "feat: add data loading module with accent-aware search"
```

---

### Task 5: Autocomplete Component

**Files:**
- Create: `js/autocomplete.js`

- [ ] **Step 1: Create autocomplete.js**

```javascript
function Autocomplete(inputId, suggestionsId, onSelect) {
  const input = document.getElementById(inputId);
  const suggestionsEl = document.getElementById(suggestionsId);
  let debounceTimer = null;
  let selectedCity = null;
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
      .map((city, i) =>
        `<div class="suggestion-item" data-index="${i}">
          ${city.n} <span class="dep">(${city.d})</span>
        </div>`
      )
      .join('');

    suggestionsEl.classList.add('active');

    suggestionsEl.querySelectorAll('.suggestion-item').forEach((el) => {
      el.addEventListener('mousedown', (e) => {
        e.preventDefault();
        select(results[parseInt(el.dataset.index)]);
      });
    });
  }

  function select(city) {
    selectedCity = city;
    input.value = `${city.n} (${city.d})`;
    suggestionsEl.classList.remove('active');
    suggestionsEl.innerHTML = '';
    onSelect(city);
  }

  function updateHighlight() {
    const items = suggestionsEl.querySelectorAll('.suggestion-item');
    items.forEach((el, i) => {
      el.classList.toggle('highlighted', i === highlightedIdx);
    });
    if (highlightedIdx >= 0 && items[highlightedIdx]) {
      items[highlightedIdx].scrollIntoView({ block: 'nearest' });
    }
  }

  input.addEventListener('input', () => {
    selectedCity = null;
    onSelect(null);
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      const query = input.value.trim();
      const results = CityData.search(query);
      render(results);
    }, 150);
  });

  input.addEventListener('keydown', (e) => {
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

  input.addEventListener('blur', () => {
    // Small delay to allow click on suggestion
    setTimeout(() => {
      suggestionsEl.classList.remove('active');
    }, 200);
  });

  function reset() {
    selectedCity = null;
    input.value = '';
    suggestionsEl.classList.remove('active');
    suggestionsEl.innerHTML = '';
    highlightedIdx = -1;
    currentResults = [];
  }

  function getSelected() {
    return selectedCity;
  }

  return { reset, getSelected };
}
```

- [ ] **Step 2: Verify autocomplete works in browser**

Serve with `python3 -m http.server 8080`, open `http://localhost:8080`.
Type "lyon" in the first input. Expected: dropdown with Lyon and related communes, each with département. Click one — input fills with "Lyon (Rhône)". Arrow keys navigate, Enter selects, Escape closes.

- [ ] **Step 3: Commit**

```bash
git add js/autocomplete.js
git commit -m "feat: add autocomplete component with keyboard navigation"
```

---

### Task 6: Battle Logic & Rendering

**Files:**
- Create: `js/battle.js`

- [ ] **Step 1: Create battle.js**

```javascript
const Battle = (() => {
  // Stat definitions — add new stats here for future criteria
  const STATS = [
    { key: 'p', label: 'Population', format: (v) => v.toLocaleString('fr-FR') },
    // Future stats:
    // { key: 's', label: 'Superficie (km²)', format: (v) => v.toLocaleString('fr-FR') },
    // { key: 'ds', label: 'Densité (hab/km²)', format: (v) => v.toLocaleString('fr-FR') },
    // { key: 'a', label: 'Altitude moyenne (m)', format: (v) => v.toLocaleString('fr-FR') + ' m' },
  ];

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

    STATS.forEach((stat, i) => {
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

      // Staggered animation
      setTimeout(() => {
        row.classList.add('animate-in');
        // Animate bars after row appears
        setTimeout(() => {
          row.querySelectorAll('.stat-bar').forEach((bar) => {
            bar.style.width = bar.dataset.width + '%';
          });
        }, 100);
      }, 500 + i * 200);
    });

    // Winner banner
    const totalDelay = 500 + STATS.length * 200 + 400;
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

- [ ] **Step 2: Verify battle renders (manual test)**

Serve with `python3 -m http.server 8080`. This won't fully work yet (needs app.js to wire things up), but check browser console for no syntax errors when loading the page.

- [ ] **Step 3: Commit**

```bash
git add js/battle.js
git commit -m "feat: add battle comparison logic with animated tale-of-the-tape"
```

---

### Task 7: App Wiring

**Files:**
- Create: `js/app.js`

- [ ] **Step 1: Create app.js**

```javascript
document.addEventListener('DOMContentLoaded', async () => {
  const fightBtn = document.getElementById('fight-btn');
  const resetBtn = document.getElementById('reset-btn');
  const battleArea = document.getElementById('battle-area');

  // Load city data
  await CityData.load();

  let city1 = null;
  let city2 = null;

  function updateFightButton() {
    fightBtn.disabled = !(city1 && city2);
  }

  // Set up autocompletes
  const ac1 = Autocomplete('city-input-1', 'suggestions-1', (city) => {
    city1 = city;
    updateFightButton();
  });

  const ac2 = Autocomplete('city-input-2', 'suggestions-2', (city) => {
    city2 = city;
    updateFightButton();
  });

  // Fight!
  fightBtn.addEventListener('click', () => {
    if (!city1 || !city2) return;
    fightBtn.disabled = true;
    Battle.run(city1, city2);
  });

  // Reset
  resetBtn.addEventListener('click', () => {
    city1 = null;
    city2 = null;
    ac1.reset();
    ac2.reset();
    battleArea.classList.add('hidden');
    resetBtn.classList.add('hidden');
    updateFightButton();
  });
});
```

- [ ] **Step 2: Full end-to-end test in browser**

Run: `python3 -m http.server 8080`, open `http://localhost:8080`.

Test sequence:
1. Page loads — title visible, two empty inputs, FIGHT! button disabled (dimmed) ✓
2. Type "lyon" in left input — dropdown appears with Lyon entries ✓
3. Select "Lyon (Rhône)" — input fills, dropdown closes ✓
4. Type "marseille" in right input — select "Marseille (Bouches-du-Rhône)" ✓
5. FIGHT! button becomes active (full opacity) ✓
6. Click FIGHT! — screen flash, city names slam in, population bars animate, winner banner appears ✓
7. "NOUVEAU COMBAT" button appears ✓
8. Click it — everything resets to initial state ✓

- [ ] **Step 3: Commit**

```bash
git add js/app.js
git commit -m "feat: wire up app with autocomplete, battle, and reset flow"
```

---

### Task 8: GitHub Actions Deploy Workflow

**Files:**
- Create: `.github/workflows/deploy.yml`

- [ ] **Step 1: Create deploy workflow**

```bash
mkdir -p .github/workflows
```

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - name: Deploy via SSH
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.VPS_HOST }}
          username: ${{ secrets.VPS_USER }}
          key: ${{ secrets.VPS_SSH_KEY }}
          script: |
            cd /var/www/citybattle.jimmydore.fr
            git pull origin main
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/deploy.yml
git commit -m "ci: add GitHub Actions deploy workflow for VPS"
```

---

### Task 9: VPS Setup

**Files:** None (server-side configuration)

This task is run manually on the VPS via SSH.

- [ ] **Step 1: Create GitHub repo and push**

```bash
# From local machine — create repo on GitHub first, then:
git remote add origin git@github.com:<your-username>/city-battle.git
git push -u origin main
```

Add the GitHub secrets (`VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`) in the repo settings — same values as the thomas_birthday repo.

- [ ] **Step 2: Clone repo on VPS**

```bash
ssh vpsjim
cd /var/www
git clone git@github.com:<your-username>/city-battle.git citybattle.jimmydore.fr
```

- [ ] **Step 3: Add nginx server block**

```bash
ssh vpsjim
sudo nano /etc/nginx/sites-available/citybattle.jimmydore.fr
```

Content:

```nginx
server {
    listen 80;
    server_name citybattle.jimmydore.fr;
    root /var/www/citybattle.jimmydore.fr;
    index index.html;

    location / {
        try_files $uri $uri/ =404;
    }

    # Enable gzip for JSON data file
    gzip on;
    gzip_types application/json;
    gzip_min_length 1000;
}
```

Enable and reload:

```bash
sudo ln -s /etc/nginx/sites-available/citybattle.jimmydore.fr /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

- [ ] **Step 4: Set up DNS**

Add an A record for `citybattle.jimmydore.fr` → `194.32.76.43` in your DNS provider.

- [ ] **Step 5: Optional — HTTPS with certbot**

```bash
sudo certbot --nginx -d citybattle.jimmydore.fr
```

- [ ] **Step 6: Verify deployment**

Push a small change to `main` from local. Check that the GitHub Action runs and the site updates at `citybattle.jimmydore.fr`.
