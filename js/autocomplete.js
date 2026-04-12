function Autocomplete(inputId, suggestionsId, onSelect, options) {
  const opts = options || {};
  const searchFn = opts.search || function (q) { return CityData.search(q); };
  const formatItem = opts.formatItem || function (item) {
    return item.n + ' <span class="dep">(' + item.d + ')</span>';
  };
  const formatSelected = opts.formatSelected || function (item) {
    return item.n + ' (' + item.d + ')';
  };

  const input = document.getElementById(inputId);
  const suggestionsEl = document.getElementById(suggestionsId);
  let debounceTimer = null;
  let selectedItem = null;
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
      .map(function (item, i) {
        return '<div class="suggestion-item" data-index="' + i + '">' +
          formatItem(item) +
          '</div>';
      })
      .join('');

    suggestionsEl.classList.add('active');

    suggestionsEl.querySelectorAll('.suggestion-item').forEach(function (el) {
      el.addEventListener('mousedown', function (e) {
        e.preventDefault();
        select(results[parseInt(el.dataset.index)]);
      });
    });
  }

  function select(item) {
    selectedItem = item;
    input.value = formatSelected(item);
    suggestionsEl.classList.remove('active');
    suggestionsEl.innerHTML = '';
    onSelect(item);
  }

  function updateHighlight() {
    var items = suggestionsEl.querySelectorAll('.suggestion-item');
    items.forEach(function (el, i) {
      el.classList.toggle('highlighted', i === highlightedIdx);
    });
    if (highlightedIdx >= 0 && items[highlightedIdx]) {
      items[highlightedIdx].scrollIntoView({ block: 'nearest' });
    }
  }

  input.addEventListener('input', function () {
    selectedItem = null;
    onSelect(null);
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(function () {
      var query = input.value.trim();
      var results = searchFn(query);
      render(results);
    }, 150);
  });

  input.addEventListener('keydown', function (e) {
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

  input.addEventListener('blur', function () {
    setTimeout(function () {
      suggestionsEl.classList.remove('active');
    }, 200);
  });

  function reset() {
    selectedItem = null;
    input.value = '';
    suggestionsEl.classList.remove('active');
    suggestionsEl.innerHTML = '';
    highlightedIdx = -1;
    currentResults = [];
  }

  function getSelected() {
    return selectedItem;
  }

  function setCity(item) {
    selectedItem = item;
    input.value = formatSelected(item);
  }

  return { reset, getSelected, setCity };
}
