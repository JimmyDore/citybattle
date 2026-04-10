document.addEventListener('DOMContentLoaded', async () => {
  const fightBtn = document.getElementById('fight-btn');
  const randomBtn = document.getElementById('random-btn');
  const resetBtn = document.getElementById('reset-btn');
  const battleArea = document.getElementById('battle-area');

  const loader = document.getElementById('loader');

  // Load city data
  await CityData.load();

  // Fade out loader overlay
  loader.classList.add('fade-out');
  loader.addEventListener('transitionend', () => loader.remove());

  let city1 = null;
  let city2 = null;

  function updateFightButton() {
    fightBtn.disabled = !(city1 && city2);
  }

  // Set up autocompletes
  const ac1 = Autocomplete('city-input-1', 'suggestions-1', (city) => {
    city1 = city;
    updateFightButton();
  });

  const ac2 = Autocomplete('city-input-2', 'suggestions-2', (city) => {
    city2 = city;
    updateFightButton();
  });

  // Random matchup
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

  // Fight!
  fightBtn.addEventListener('click', () => {
    if (!city1 || !city2) return;
    fightBtn.disabled = true;
    Battle.run(city1, city2);
  });

  // Reset
  resetBtn.addEventListener('click', () => {
    city1 = null;
    city2 = null;
    ac1.reset();
    ac2.reset();
    battleArea.classList.add('hidden');
    resetBtn.classList.add('hidden');
    updateFightButton();
  });
});
