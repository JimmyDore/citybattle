# BPE Data Enrichment — Design Spec

## Goal

Add 6 new battle stats from INSEE BPE (Base Permanente des Equipements) data: raw count + per capita ratio for bars/cafes, restaurants, and swimming pools. Add emojis to all stat labels and visual grouping between geography and fun stats.

## Data Source

- **BPE 2024** from INSEE via data.gouv.fr
- CSV with individual facility records, each linked to a commune by INSEE code
- Relevant BPE type codes:
  - `A504` — Café, bar, débit de boissons (to confirm from actual BPE codebook)
  - `A501` — Restaurant (to confirm)
  - `F303` — Piscine (to confirm)
- Exact type codes to be verified when downloading the dataset

## Data Pipeline

1. **Download** BPE 2024 CSV, store as `bpe-2024.csv` in project root (alongside `communes-france-2025.csv`)
2. **Update `scripts/build-data.js`**:
   - Parse BPE CSV, filter for the 3 relevant facility types
   - Count occurrences per commune (by INSEE code)
   - Join with existing communes data using `code_insee` (column index 1 in communes CSV)
   - Add 6 new fields per city in output JSON:
     - `bars` — raw count of bars/cafes
     - `resto` — raw count of restaurants
     - `pisc` — raw count of swimming pools
     - `bars_r` — bars per 10,000 inhabitants (1 decimal)
     - `resto_r` — restaurants per 10,000 inhabitants (1 decimal)
     - `pisc_r` — swimming pools per 10,000 inhabitants (1 decimal)
   - Communes with no BPE entries for a type get 0

## Frontend Changes

### `js/battle.js` — STATS array

Add emojis to existing stats and add 6 new entries, with a visual group separator:

**Geography group:**
| Key | Emoji + Label |
|-----|---------------|
| `p` | 👥 Population |
| `s` | 📐 Superficie (km²) |
| `ds` | 🏘️ Densité (hab/km²) |
| `a` | ⛰️ Altitude (m) |

**--- separator ---**

**Fun group:**
| Key | Emoji + Label |
|-----|---------------|
| `bars` | 🍺 Bars |
| `resto` | 🍽️ Restaurants |
| `pisc` | 🏊 Piscines |
| `bars_r` | 🍺 Bars / 10k hab |
| `resto_r` | 🍽️ Restos / 10k hab |
| `pisc_r` | 🏊 Piscines / 10k hab |

### Visual separator

Add a subtle CSS separator (thin line or extra spacing) between geography and fun stat groups in the battle area.

## Files Modified

- `scripts/build-data.js` — add BPE parsing + enrichment logic
- `js/battle.js` — add 6 stat definitions + emojis on all stats + group separator
- `css/style.css` (or equivalent) — separator style between stat groups

## New Files

- `bpe-2024.csv` — raw BPE dataset (source data)
