# City Battle — Design Spec

## Overview

A static website that lets users compare two French cities in a "battle" format. Users pick two communes, hit "FIGHT!", and see an animated tale-of-the-tape stat comparison. MVP criterion is population; the design supports adding more stats later.

**URL:** citybattle.jimmydore.fr
**Stack:** Vanilla HTML, CSS, JavaScript — no framework, no backend
**Hosting:** Personal VPS, auto-deployed via GitHub Actions on push to main
**UI Language:** French

## Data

### Source

CSV file `communes-france-2025.csv` from opendata.gouv.fr — ~34,935 communes, 46 columns.

### Build-Time Processing

A Node.js script (`scripts/build-data.js`) reads the CSV and outputs `data/cities.json` with only battle-relevant fields and short keys to minimize file size.

**JSON format:**
```json
[
  { "n": "L'Abergement-Clémenciat", "d": "Ain", "p": 832, "s": 16, "ds": 53, "a": 242 },
  ...
]
```

**Field mapping:**
| Key | Source Column       | Description           |
|-----|--------------------|-----------------------|
| `n` | `nom_standard`     | Commune name          |
| `d` | `dep_nom`          | Département name      |
| `p` | `population`       | Population            |
| `s` | `superficie_km2`   | Area in km²           |
| `ds`| `densite`          | Density (hab/km²)     |
| `a` | `altitude_moyenne`  | Average altitude (m)  |

**Size estimate:** ~2.5-3 MB uncompressed, ~700-900 KB gzipped. The generated `cities.json` is committed to the repo.

Sorted alphabetically by name for consistent ordering.

### Future Extensibility

Adding new stats means:
1. Add the field to `build-data.js` extraction
2. Add a stat row definition in `battle.js`
3. Regenerate and commit `cities.json`

## Architecture

### File Structure

```
├── index.html
├── css/
│   └── style.css
├── js/
│   ├── data.js          # Load & parse cities JSON
│   ├── autocomplete.js  # Search input with suggestions
│   ├── battle.js        # Comparison logic & rendering
│   └── app.js           # Main entry, wires everything together
├── data/
│   └── cities.json      # Generated from CSV (committed)
├── scripts/
│   └── build-data.js    # Node script: CSV → JSON
├── communes-france-2025.csv  # Source data (not deployed)
└── .github/
    └── workflows/
        └── deploy.yml
```

### Flow

1. Page loads → `data.js` fetches `data/cities.json` into memory
2. User types in either input → `autocomplete.js` filters and suggests matches
3. User selects both cities → "FIGHT!" button activates
4. Click FIGHT → `battle.js` compares stats, renders tale-of-the-tape with animations
5. "Nouveau combat" button resets the UI

## Visual Identity: Neon Fight Club

### Color Palette

| Role            | Color     | Usage                          |
|-----------------|-----------|--------------------------------|
| Background      | `#0a0a0a` | Page background                |
| City 1 (cyan)   | `#00f0ff` | Left city name, bars, glow     |
| City 2 (magenta)| `#ff2d55` | Right city name, bars, glow    |
| Accent dim      | `#666`    | Losing stat values             |
| Text primary    | `#eee`    | General text                   |
| Text secondary  | `#555`    | Labels, category names         |
| Surface         | `#1a1a1a` | Bar backgrounds, input fields  |

### Typography

- Sans-serif, condensed/bold for city names and headings
- Monospace or tabular numerals for stat values (alignment)
- Uppercase throughout for headings and stat labels
- Letter-spacing on labels for dramatic effect

### Glow Effects

- City names: `text-shadow` with their respective color at 30% opacity
- Winning stat bars: `box-shadow` glow effect
- Title "CITY BATTLE": magenta glow

## Autocomplete

### Search Logic

- On page load, build a normalized index: lowercase, no accents, stripped of common prefixes ("L'", "Le ", "La ", "Les ")
- Debounced filtering (~150ms) on keypress
- Match using `startsWith` on the normalized name
- Max 8 suggestions in dropdown

### Display Format

**Suggestion:** `Nom (Département)` — e.g. "Lyon (Rhône)" to disambiguate communes with the same name in different départements.

### Edge Cases

- **Duplicate names:** Départément shown in parentheses for disambiguation
- **Accented characters:** "Beziers" matches "Béziers" via normalized index
- **Prefixes:** "abergement" matches "L'Abergement-Clémenciat" via prefix stripping in secondary search

## Battle Display

### Layout: Tale of the Tape

- City names displayed large at the top in their respective neon colors
- Each stat row:
  - Category label centered (uppercase, letter-spaced, dim)
  - Values on each side
  - Bars extending from center outward, proportional to values
  - Winner bar glows, winner value highlighted in its color
  - Loser value dimmed (#666)
- Winner banner at the bottom with winning city name

### Animations (on FIGHT! click)

1. **Screen flash** — brief flicker effect (~300ms)
2. **City names** — slam in from left and right
3. **Stat bars** — animate from 0 to proportional width, staggered (~200ms delay between each)
4. **Winner banner** — slides up from bottom

### Winner Logic

- **MVP:** Only population → single stat, direct comparison
- **Future (multiple stats):** City winning the most categories wins overall
- **Tie:** Display "Égalité!" with both colors

### Reset

- "Nouveau combat" button appears after battle result
- Clears inputs, hides battle display with fade-out
- FIGHT! button returns to disabled state

## Deployment

### VPS Configuration

- **Domain:** citybattle.jimmydore.fr
- **Server:** 194.32.76.43 (SSH alias: `vpsjim`, user: `jimmydore`)
- **Web root:** `/var/www/citybattle.jimmydore.fr/`
- **Web server:** nginx — new server block for `citybattle.jimmydore.fr`

### GitHub Actions Workflow

Triggers on push to `main`. Uses `appleboy/ssh-action@v1` to SSH into the VPS and run `git pull origin main` in the web root.

**Secrets (same as thomas_birthday):**
- `VPS_HOST`
- `VPS_USER`
- `VPS_SSH_KEY`

### Initial VPS Setup (manual, one-time)

1. Clone the repo into `/var/www/citybattle.jimmydore.fr/`
2. Add nginx server block for `citybattle.jimmydore.fr` → root `/var/www/citybattle.jimmydore.fr/`
3. Set up DNS A record for `citybattle.jimmydore.fr` → `194.32.76.43`
4. Optional: certbot for HTTPS

## MVP Scope

**In scope:**
- Build-data script (CSV → JSON)
- Single-page HTML with two autocomplete inputs
- FIGHT! button + tale-of-the-tape battle display
- Population stat only (with design ready for more)
- Neon Fight Club visual identity with animations
- GitHub Actions deploy to VPS

**Out of scope (future):**
- Additional stats (superficie, densité, altitude)
- Sharing/social features
- Mobile app
- Backend/API
