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
      const lower = removeAccents(city.n).toLowerCase().replace(/-/g, ' ');
      const stripped = removeAccents(stripPrefix(city.n)).toLowerCase().replace(/-/g, ' ');
      return { norm: lower, normNoPrefix: stripped, idx };
    });
  }

  function search(query, max = 8) {
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

  return { load, search, getAll };
})();
