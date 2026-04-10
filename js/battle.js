const Battle = (() => {
  // Stat definitions — add new stats here for future criteria
  const STAT_GROUPS = [
    {
      label: null,
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

    // Show department under city names
    const dept1El = document.getElementById('city1-dept');
    const dept2El = document.getElementById('city2-dept');
    dept1El.textContent = city1.d;
    dept2El.textContent = city2.d;
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

    // Winner banner
    const totalStats = STAT_GROUPS.reduce((sum, g) => sum + g.stats.length, 0);
    const totalDelay = 500 + totalStats * 200 + 400;
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
