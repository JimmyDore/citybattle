document.addEventListener('DOMContentLoaded', async () => {
  const fightBtn = document.getElementById('fight-btn');
  const resetBtn = document.getElementById('reset-btn');
  const battleArea = document.getElementById('battle-area');

  const loader = document.getElementById('loader');
  const inputArea = document.getElementById('input-area');

  // Load city data
  await CityData.load();

  // Hide loader, show inputs
  loader.classList.add('hidden');
  inputArea.classList.remove('hidden');
  fightBtn.classList.remove('hidden');

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
