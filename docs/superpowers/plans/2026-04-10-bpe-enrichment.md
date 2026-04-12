# BPE + SIRENE Data Enrichment — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 6 new battle stats (bars, restaurants, swimming pools — raw count + per 10k inhabitants) from BPE (INSEE) and SIRENE datasets, with emojis on all stats and visual group separator.

**Architecture:** Download BPE 2024 CSV and query SIRENE parquet remotely via DuckDB to produce two intermediate CSVs with facility counts per commune. Enrich `build-data.js` to merge these counts into `cities.json`. Update `battle.js` stat definitions and add a CSS separator between geography and fun stat groups.

**Tech Stack:** Node.js (build script), DuckDB CLI (SIRENE query), BPE CSV from INSEE, vanilla JS/CSS frontend.

---

### Task 1: Download BPE data and extract restaurant + pool counts

**Files:**
- Create: `data/bpe-restaurants.csv` (intermediate, generated)
- Create: `data/bpe-pools.csv` (intermediate, generated)

- [ ] **Step 1: Download BPE 2024 ZIP and extract**

```bash
cd /Users/jimmydore/Projets/Vianova/city-battle
curl -L -o bpe-2024.zip "https://www.insee.fr/fr/statistiques/fichier/8217525/BPE24.zip"
unzip bpe-2024.zip -d bpe-tmp/
ls bpe-tmp/
```

Expected: a CSV file (likely `BPE24.csv` or similar) inside `bpe-tmp/`.

- [ ] **Step 2: Identify the CSV filename and verify columns**

```bash
head -1 bpe-tmp/*.csv | tr ';' '\n' | head -20
```

Expected: columns include `DEPCOM`, `TYPEQU`, among others. Note the exact filename.

- [ ] **Step 3: Extract restaurant counts per commune**

Using the BPE CSV (semicolon-delimited), filter for `TYPEQU=A504` and count per `DEPCOM`:

```bash
# Adjust filename if different from BPE24.csv
awk -F';' 'NR==1 { for(i=1;i<=NF;i++) { gsub(/"/, "", $i); if($i=="DEPCOM") dc=i; if($i=="TYPEQU") tq=i } next } { gsub(/"/, "", $dc); gsub(/"/, "", $tq); if($tq=="A504") count[$dc]++ } END { print "code_insee,resto"; for(c in count) print c","count[c] }' bpe-tmp/*.csv > data/bpe-restaurants.csv
```

Verify: `head data/bpe-restaurants.csv && wc -l data/bpe-restaurants.csv`
Expected: header + ~20k+ rows, e.g. `75056,12345`

- [ ] **Step 4: Extract swimming pool counts per commune**

```bash
awk -F';' 'NR==1 { for(i=1;i<=NF;i++) { gsub(/"/, "", $i); if($i=="DEPCOM") dc=i; if($i=="TYPEQU") tq=i } next } { gsub(/"/, "", $dc); gsub(/"/, "", $tq); if($tq=="F101") count[$dc]++ } END { print "code_insee,pisc"; for(c in count) print c","count[c] }' bpe-tmp/*.csv > data/bpe-pools.csv
```

Verify: `head data/bpe-pools.csv && wc -l data/bpe-pools.csv`
Expected: header + ~2k-3k rows

- [ ] **Step 5: Clean up temp files**

```bash
rm -rf bpe-tmp/ bpe-2024.zip
```

- [ ] **Step 6: Commit intermediate data files**

```bash
git add data/bpe-restaurants.csv data/bpe-pools.csv
git commit -m "data: add BPE restaurant and pool counts per commune"
```

---

### Task 2: Query SIRENE for bar/café counts per commune

**Files:**
- Create: `data/sirene-bars.csv` (intermediate, generated)

- [ ] **Step 1: Install DuckDB CLI if not present**

```bash
brew install duckdb
```

Or if already installed, verify: `duckdb --version`

- [ ] **Step 2: Query SIRENE parquet remotely for bar counts**

```bash
duckdb -c "
INSTALL httpfs;
LOAD httpfs;
COPY (
  SELECT codeCommuneEtablissement AS code_insee,
         COUNT(*) AS bars
  FROM read_parquet('https://object.files.data.gouv.fr/data-pipeline-open/siren/stock/StockEtablissement_utf8.parquet')
  WHERE activitePrincipaleEtablissement = '56.30Z'
    AND etatAdministratifEtablissement = 'A'
  GROUP BY codeCommuneEtablissement
) TO 'data/sirene-bars.csv' (HEADER, DELIMITER ',');
"
```

Verify: `head data/sirene-bars.csv && wc -l data/sirene-bars.csv`
Expected: header + ~12k rows, e.g. `75056,4523`

- [ ] **Step 3: Commit**

```bash
git add data/sirene-bars.csv
git commit -m "data: add SIRENE bar/café counts per commune"
```

---

### Task 3: Update build-data.js to merge BPE + SIRENE data

**Files:**
- Modify: `scripts/build-data.js`

- [ ] **Step 1: Add helper function to load a simple two-column CSV into a Map**

Add this function at the top of `scripts/build-data.js`, after the existing `require` statements:

```javascript
function loadCountCsv(filePath, valueCol) {
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const header = lines[0].split(',');
  const iCode = header.indexOf('code_insee');
  const iVal = header.indexOf(valueCol);
  const map = new Map();
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].trim().split(',');
    if (parts[iCode] && parts[iVal]) {
      map.set(parts[iCode], parseInt(parts[iVal], 10) || 0);
    }
  }
  return map;
}
```

- [ ] **Step 2: Load the three count CSVs after the existing path declarations**

Add after `const outPath = ...`:

```javascript
const restoMap = loadCountCsv(path.join(__dirname, '..', 'data', 'bpe-restaurants.csv'), 'resto');
const piscMap = loadCountCsv(path.join(__dirname, '..', 'data', 'bpe-pools.csv'), 'pisc');
const barsMap = loadCountCsv(path.join(__dirname, '..', 'data', 'sirene-bars.csv'), 'bars');
```

- [ ] **Step 3: Extract INSEE code from the communes CSV and add BPE/SIRENE fields**

The communes CSV has `code_insee` at column index 1. Add `iCode` column lookup alongside the existing column lookups:

```javascript
const iCode = col('code_insee');
```

Then update the city object construction inside the loop, replacing:

```javascript
cities.push({ n: nom, d: dep, p: pop, s: sup, ds: dens, a: alt });
```

with:

```javascript
const code = fields[iCode];
const bars = barsMap.get(code) || 0;
const resto = restoMap.get(code) || 0;
const pisc = piscMap.get(code) || 0;
const pop10k = pop / 10000;
cities.push({
  n: nom, d: dep, p: pop, s: sup, ds: dens, a: alt,
  bars, resto, pisc,
  bars_r: pop10k > 0 ? Math.round((bars / pop10k) * 10) / 10 : 0,
  resto_r: pop10k > 0 ? Math.round((resto / pop10k) * 10) / 10 : 0,
  pisc_r: pop10k > 0 ? Math.round((pisc / pop10k) * 10) / 10 : 0,
});
```

- [ ] **Step 4: Rebuild cities.json and verify**

```bash
node scripts/build-data.js
```

Then verify a known city has the new fields:

```bash
node -e "const d=require('./data/cities.json'); const lyon=d.find(c=>c.n==='Lyon'); console.log(lyon);"
```

Expected: Lyon entry should have `bars`, `resto`, `pisc`, `bars_r`, `resto_r`, `pisc_r` fields with non-zero values.

- [ ] **Step 5: Commit**

```bash
git add scripts/build-data.js data/cities.json
git commit -m "feat: enrich cities.json with bars, restaurants, pools from BPE + SIRENE"
```

---

### Task 4: Update battle.js with new stats, emojis, and group separator

**Files:**
- Modify: `js/battle.js`

- [ ] **Step 1: Replace the STATS array with grouped stats + emojis**

Replace the entire `STATS` array definition at the top of `battle.js`:

```javascript
const STAT_GROUPS = [
  {
    label: null, // no header for first group
    stats: [
      { key: 'p', label: '👥 Population', format: (v) => v.toLocaleString('fr-FR') },
      { key: 's', label: '📐 Superficie', format: (v) => v.toLocaleString('fr-FR') + ' km²' },
      { key: 'ds', label: '🏘️ Densité', format: (v) => v.toLocaleString('fr-FR') + ' hab/km²' },
      { key: 'a', label: '⛰️ Altitude', format: (v) => v.toLocaleString('fr-FR') + ' m' },
    ],
  },
  {
    label: null,
    stats: [
      { key: 'bars', label: '🍺 Bars', format: (v) => v.toLocaleString('fr-FR') },
      { key: 'resto', label: '🍽️ Restaurants', format: (v) => v.toLocaleString('fr-FR') },
      { key: 'pisc', label: '🏊 Piscines', format: (v) => v.toLocaleString('fr-FR') },
      { key: 'bars_r', label: '🍺 Bars / 10k hab', format: (v) => v.toLocaleString('fr-FR', { maximumFractionDigits: 1 }) },
      { key: 'resto_r', label: '🍽️ Restos / 10k hab', format: (v) => v.toLocaleString('fr-FR', { maximumFractionDigits: 1 }) },
      { key: 'pisc_r', label: '🏊 Piscines / 10k hab', format: (v) => v.toLocaleString('fr-FR', { maximumFractionDigits: 1 }) },
    ],
  },
];
```

- [ ] **Step 2: Update the `run` function to iterate over groups with separator**

Replace the `STATS.forEach(...)` block (and the `let city1Wins / city2Wins` lines above it) with:

```javascript
let city1Wins = 0;
let city2Wins = 0;
let statIndex = 0;

STAT_GROUPS.forEach((group, groupIdx) => {
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
```

- [ ] **Step 3: Update the winner banner delay calculation**

Replace the `totalDelay` line:

```javascript
const totalStats = STAT_GROUPS.reduce((sum, g) => sum + g.stats.length, 0);
const totalDelay = 500 + totalStats * 200 + 400;
```

- [ ] **Step 4: Commit**

```bash
git add js/battle.js
git commit -m "feat: add BPE/SIRENE stats to battle with emojis and group separator"
```

---

### Task 5: Add CSS for group separator

**Files:**
- Modify: `css/style.css`

- [ ] **Step 1: Add separator styles**

Add right after the `.stat-bar.winner.city2` rule (around line 398):

```css
/* ===== Stat Group Separator ===== */
.stat-group-separator {
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--text-dim), transparent);
  margin: 16px 0;
  opacity: 0;
  transition: opacity 0.4s ease-out;
}

.stat-group-separator.animate-in {
  opacity: 0.3;
}
```

- [ ] **Step 2: Commit**

```bash
git add css/style.css
git commit -m "style: add visual separator between stat groups"
```

---

### Task 6: Bump cache version and test end-to-end

**Files:**
- Modify: `index.html`

- [ ] **Step 1: Bump cache version in index.html**

Update all `?v=3` to `?v=4` in script and style references.

- [ ] **Step 2: Open in browser and test**

Open `index.html` in browser, search for two cities (e.g. Lyon vs Marseille), click FIGHT, and verify:
- All 10 stats display with emojis
- Subtle separator line between geography and fun stats
- Bars, restaurants, and pools show real values
- Per capita ratios display with 1 decimal

- [ ] **Step 3: Commit and push**

```bash
git add index.html
git commit -m "fix: bump cache version for BPE enrichment"
git push
```

---

### Task 7: Add raw data files to .gitignore

**Files:**
- Create or modify: `.gitignore`

- [ ] **Step 1: Ensure large temporary files are ignored**

Add to `.gitignore` (create if it doesn't exist):

```
bpe-2024.zip
bpe-tmp/
```

The intermediate CSVs in `data/` (`bpe-restaurants.csv`, `bpe-pools.csv`, `sirene-bars.csv`) should be committed as they are small and serve as reproducible source data.

- [ ] **Step 2: Commit**

```bash
git add .gitignore
git commit -m "chore: add BPE temp files to gitignore"
```
