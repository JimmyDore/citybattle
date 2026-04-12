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
