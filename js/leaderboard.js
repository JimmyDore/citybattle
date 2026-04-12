const Leaderboard = (() => {
  const PAGE_SIZE = 50;
  let currentKey = 'p';
  let currentDept = null;
  let isFlop = false;
  let sortedData = [];
  let displayedCount = 0;
  let observer = null;

  let initialized = false;

  function init() {
    buildCriteriaOptions();
    setupObserver();
  }

  function show() {
    if (!initialized) {
      initialized = true;
      update();
    }
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
    sentinel.classList.remove('hidden');

    renderMore();

    // Scroll leaderboard back to top (only when section is visible)
    list.parentElement.scrollTop = 0;
    var section = document.getElementById('classement-section');
    if (!section.classList.contains('hidden')) {
      window.scrollTo({ top: section.offsetTop - 80, behavior: 'smooth' });
    }
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
      sentinel.classList.add('hidden');
    }
  }

  return { init, show, setCriterion, setDepartement, setFlop };
})();
