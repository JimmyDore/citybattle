# Classement (Leaderboard) — Design Spec

**Date:** 2026-04-12
**Feature:** Add a "Classement" mode to City Battle — a leaderboard that ranks all ~35,000 French communes by a user-selected criterion, with département filtering and top/flop toggle.

## Overview

The site gains a second mode alongside the existing "Combat" (battle). A toggle below the header lets the user switch between modes. In Classement mode, the battle inputs and area are replaced by:

1. A **criteria picker** (dropdown) to select which stat to rank by
2. A **département autocomplete** filter (defaults to all of France)
3. A **Top / Flop toggle** to switch between highest-first and lowest-first
4. An **infinite-scroll leaderboard** with gold/silver/bronze podium styling for the top 3

## Mode Toggle

- Two joined buttons placed between the header and the main content: **⚔️ COMBAT** | **🏆 CLASSEMENT**
- Active mode gets a neon border + subtle background gradient; inactive mode is dimmed (#1a1a1a, #888 text)
- Switching mode hides/shows the relevant section with no page reload
- Default mode on page load: Combat (preserves current behavior)

## Controls (Classement Mode)

Three controls in a horizontal row, centered. Stacks vertically on mobile (< 600px).

### Criteria Picker

A styled `<select>` matching the neon theme. Options map directly to the existing `STAT_GROUPS` in `battle.js`:

| Label | Data key | Format |
|-------|----------|--------|
| 👥 Population | `p` | locale integer |
| 📐 Superficie | `s` | locale integer + " km²" |
| 🏘️ Densité | `ds` | locale integer + " hab/km²" |
| ⛰️ Altitude | `a` | locale integer + " m" |
| 🍺 Bars | `bars` | locale integer |
| 🍽️ Restaurants | `resto` | locale integer |
| 🏊 Piscines | `pisc` | locale integer |
| 🍺 Bars / 10k hab | `bars_r` | 1 decimal |
| 🍽️ Restos / 10k hab | `resto_r` | 1 decimal |
| 🏊 Piscines / 10k hab | `pisc_r` | 1 decimal |

Default selection: `p` (Population).

### Département Filter

An autocomplete input reusing the same accent-aware normalization logic from `CityData` (`removeAccents`, hyphen-to-space). Searches the unique département names already present in the `d` field of every city object.

- Placeholder text: "Toute la France..."
- When empty or cleared: no filter, ranks all communes nationally
- When a département is selected: ranks only cities in that département
- Max 8 suggestions, keyboard navigation (same UX as city autocomplete)

### Top / Flop Toggle

Two joined buttons:
- **🔝 TOP** — sort descending (highest values first) — default
- **💀 FLOP** — sort ascending (lowest values first)

Active button gets cyan highlight; inactive is dimmed.

## Leaderboard

### Layout

A table-like list with 4 columns:
- **#** — rank number (40px)
- **Ville** — city name (flex: 1)
- **Département** — département name (120px, right-aligned)
- **Valeur** — formatted stat value (100px, right-aligned, cyan color, tabular-nums)

### Podium Styling (Rank 1-3)

- **Rank 1:** gold (#ffd700) rank number with glow, subtle gold-tinted row background
- **Rank 2:** silver (#c0c0c0) rank number with glow, subtle silver-tinted row background
- **Rank 3:** bronze (#cd7f32) rank number with glow, subtle bronze-tinted row background
- Larger font weight and size for podium rows vs regular rows

### Regular Rows (Rank 4+)

- #666 rank number, #ccc city name, #888 département, slightly dimmed cyan value
- Rows separated by 1px #1a1a1a border

### Infinite Scroll

- Render the first 50 rows initially
- Append 50 more rows when the user scrolls near the bottom (IntersectionObserver on a sentinel element)
- Show a pulsing "▼ Scroll pour voir plus ▼" indicator while more data is available
- Hide the indicator when all matching cities are displayed

### Sorting & Filtering Logic

All sorting and filtering is done client-side (the full ~35k dataset is already loaded in memory):

1. Start with `CityData.getAll()`
2. If a département is selected, filter to cities where `city.d === selectedDepartement`
3. Sort by the selected criterion key, descending for Top, ascending for Flop
4. Handle ties: secondary sort by city name alphabetically
5. Slice for the current page window (0..N) and render

Changing criteria, département, or top/flop resets the scroll position and re-renders from rank 1.

## New Files

- `js/leaderboard.js` — Leaderboard module (sorting, rendering, infinite scroll, controls)
- No changes to data format or build script

## Modified Files

- `index.html` — add mode toggle HTML, classement section with controls and leaderboard container, script tag for leaderboard.js
- `css/style.css` — add styles for mode toggle, classement controls, leaderboard rows, podium styling, infinite scroll indicator, responsive rules
- `js/app.js` — wire up mode toggle to show/hide combat vs classement sections, initialize leaderboard module
- `js/data.js` — add a `getDepartements()` method that extracts and caches unique département names from the loaded cities

## Architecture Notes

- `Leaderboard` follows the same IIFE singleton pattern as `Battle`
- Reuses `CityData` for data access and `removeAccents` normalization
- The département autocomplete is a new `Autocomplete` instance (same constructor, different data source — département names instead of city names). This requires a small refactor: `Autocomplete` currently hardcodes `CityData.search()`. It should accept a search function parameter instead, making it reusable for both cities and départements.
- Format functions for stat values are already defined in `battle.js` `STAT_GROUPS`. These should be extracted to a shared location (e.g., a `STATS` constant in `data.js` or a new `stats.js`) so both `Battle` and `Leaderboard` can use them without duplication.

## Responsive Design

- Mode toggle: full width on mobile, smaller text
- Controls row: stacks vertically on mobile (< 600px)
- Leaderboard: département column hidden on mobile (city name already shows in search context), value column slightly narrower
- Rank column stays visible at all breakpoints

## Performance

- No concern: sorting ~35k items in JS is instant (<10ms)
- IntersectionObserver for scroll pagination avoids scroll event overhead
- No additional network requests — all data already loaded by `CityData.load()`
