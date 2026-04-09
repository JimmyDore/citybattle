function Autocomplete(inputId, suggestionsId, onSelect) {
  const input = document.getElementById(inputId);
  const suggestionsEl = document.getElementById(suggestionsId);
  let debounceTimer = null;
  let selectedCity = null;
  let highlightedIdx = -1;
  let currentResults = [];

  function render(results) {
    currentResults = results;
    highlightedIdx = -1;

    if (results.length === 0) {
      suggestionsEl.classList.remove('active');
      suggestionsEl.innerHTML = '';
      return;
    }

    suggestionsEl.innerHTML = results
      .map((city, i) =>
        `<div class="suggestion-item" data-index="${i}">
          ${city.n} <span class="dep">(${city.d})</span>
        </div>`
      )
      .join('');

    suggestionsEl.classList.add('active');

    suggestionsEl.querySelectorAll('.suggestion-item').forEach((el) => {
      el.addEventListener('mousedown', (e) => {
        e.preventDefault();
        select(results[parseInt(el.dataset.index)]);
      });
    });
  }

  function select(city) {
    selectedCity = city;
    input.value = `${city.n} (${city.d})`;
    suggestionsEl.classList.remove('active');
    suggestionsEl.innerHTML = '';
    onSelect(city);
  }

  function updateHighlight() {
    const items = suggestionsEl.querySelectorAll('.suggestion-item');
    items.forEach((el, i) => {
      el.classList.toggle('highlighted', i === highlightedIdx);
    });
    if (highlightedIdx >= 0 && items[highlightedIdx]) {
      items[highlightedIdx].scrollIntoView({ block: 'nearest' });
    }
  }

  input.addEventListener('input', () => {
    selectedCity = null;
    onSelect(null);
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      const query = input.value.trim();
      const results = CityData.search(query);
      render(results);
    }, 150);
  });

  input.addEventListener('keydown', (e) => {
    if (!suggestionsEl.classList.contains('active')) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      highlightedIdx = Math.min(highlightedIdx + 1, currentResults.length - 1);
      updateHighlight();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      highlightedIdx = Math.max(highlightedIdx - 1, 0);
      updateHighlight();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (highlightedIdx >= 0 && currentResults[highlightedIdx]) {
        select(currentResults[highlightedIdx]);
      }
    } else if (e.key === 'Escape') {
      suggestionsEl.classList.remove('active');
    }
  });

  input.addEventListener('blur', () => {
    // Small delay to allow click on suggestion
    setTimeout(() => {
      suggestionsEl.classList.remove('active');
    }, 200);
  });

  function reset() {
    selectedCity = null;
    input.value = '';
    suggestionsEl.classList.remove('active');
    suggestionsEl.innerHTML = '';
    highlightedIdx = -1;
    currentResults = [];
  }

  function getSelected() {
    return selectedCity;
  }

  return { reset, getSelected };
}
