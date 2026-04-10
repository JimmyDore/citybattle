const fs = require('fs');
const path = require('path');

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
  // Aggregate arrondissements for Paris, Lyon, Marseille
  const arrondissements = {
    '75056': code => code >= '75101' && code <= '75120',
    '69123': code => code >= '69381' && code <= '69389',
    '13055': code => code >= '13201' && code <= '13216',
  };

  for (const [cityCode, matchFn] of Object.entries(arrondissements)) {
    let total = 0;
    for (const [code, count] of map) {
      if (matchFn(code)) {
        total += count;
      }
    }
    if (total > 0) {
      map.set(cityCode, (map.get(cityCode) || 0) + total);
    }
  }

  return map;
}

const csvPath = path.join(__dirname, '..', 'communes-france-2025.csv');
const outPath = path.join(__dirname, '..', 'data', 'cities.json');

const restoMap = loadCountCsv(path.join(__dirname, '..', 'data', 'bpe-restaurants.csv'), 'resto');
const piscMap = loadCountCsv(path.join(__dirname, '..', 'data', 'bpe-pools.csv'), 'pisc');
const barsMap = loadCountCsv(path.join(__dirname, '..', 'data', 'sirene-bars.csv'), 'bars');

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
const iCode = col('code_insee');

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
}

// Sort alphabetically by name
cities.sort((a, b) => a.n.localeCompare(b.n, 'fr'));

// Ensure output directory exists
const outDir = path.dirname(outPath);
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

fs.writeFileSync(outPath, JSON.stringify(cities));

console.log(`Generated ${cities.length} cities → ${outPath}`);
console.log(`File size: ${(fs.statSync(outPath).size / 1024 / 1024).toFixed(2)} MB`);
