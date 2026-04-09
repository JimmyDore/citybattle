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
