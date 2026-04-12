document.addEventListener('DOMContentLoaded', async () => {
  const fightBtn = document.getElementById('fight-btn');
  const randomBtn = document.getElementById('random-btn');
  const resetBtn = document.getElementById('reset-btn');
  const battleArea = document.getElementById('battle-area');
  const loader = document.getElementById('loader');

  // Mode sections
  const combatSection = document.getElementById('combat-section');
  const classementSection = document.getElementById('classement-section');
  const modeBtns = document.querySelectorAll('.mode-btn');

  // Load city data
  await CityData.load();

  // Fade out loader overlay
  loader.classList.add('fade-out');
  loader.addEventListener('transitionend', () => loader.remove());

  // ===== MODE TOGGLE =====
  modeBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const mode = btn.dataset.mode;
      modeBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');

      if (mode === 'combat') {
        combatSection.classList.remove('hidden');
        classementSection.classList.add('hidden');
      } else {
        combatSection.classList.add('hidden');
        classementSection.classList.remove('hidden');
        Leaderboard.show();
      }
    });
  });

  // ===== COMBAT MODE =====
  let city1 = null;
  let city2 = null;

  function updateFightButton() {
    fightBtn.disabled = !(city1 && city2);
  }

  const ac1 = Autocomplete('city-input-1', 'suggestions-1', (city) => {
    city1 = city;
    updateFightButton();
  });

  const ac2 = Autocomplete('city-input-2', 'suggestions-2', (city) => {
    city2 = city;
    updateFightButton();
  });

  randomBtn.addEventListener('click', () => {
    const all = CityData.getAll();
    const i1 = Math.floor(Math.random() * all.length);
    let i2 = Math.floor(Math.random() * (all.length - 1));
    if (i2 >= i1) i2++;
    city1 = all[i1];
    city2 = all[i2];
    ac1.setCity(city1);
    ac2.setCity(city2);
    updateFightButton();
    fightBtn.click();
  });

  fightBtn.addEventListener('click', () => {
    if (!city1 || !city2) return;
    fightBtn.disabled = true;
    Battle.run(city1, city2);
  });

  resetBtn.addEventListener('click', () => {
    city1 = null;
    city2 = null;
    ac1.reset();
    ac2.reset();
    battleArea.classList.add('hidden');
    resetBtn.classList.add('hidden');
    updateFightButton();
  });

  // ===== CLASSEMENT MODE =====

  // Département autocomplete
  Autocomplete('lb-dept-input', 'lb-dept-suggestions', (dept) => {
    Leaderboard.setDepartement(dept);
  }, {
    search: (q) => CityData.searchDepartements(q),
    formatItem: (dept) => dept,
    formatSelected: (dept) => dept,
  });

  // Criteria picker
  const criteriaSelect = document.getElementById('lb-criteria');
  criteriaSelect.addEventListener('change', () => {
    Leaderboard.setCriterion(criteriaSelect.value);
  });

  // Top/Flop toggle
  const toggleBtns = document.querySelectorAll('.lb-toggle-btn');
  toggleBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      toggleBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      Leaderboard.setFlop(btn.dataset.dir === 'flop');
    });
  });

  // Initialize leaderboard
  Leaderboard.init();
});
