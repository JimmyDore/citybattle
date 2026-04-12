const Stats = (() => {
  const ALL = [
    { key: 'p', label: '👥 Population', format: (v) => v.toLocaleString('fr-FR') },
    { key: 's', label: '📐 Superficie', format: (v) => v.toLocaleString('fr-FR') + ' km²' },
    { key: 'ds', label: '🏘️ Densité', format: (v) => v.toLocaleString('fr-FR') + ' hab/km²' },
    { key: 'a', label: '⛰️ Altitude', format: (v) => v.toLocaleString('fr-FR') + ' m' },
    { key: 'bars', label: '🍺 Bars', format: (v) => v.toLocaleString('fr-FR') },
    { key: 'resto', label: '🍽️ Restaurants', format: (v) => v.toLocaleString('fr-FR') },
    { key: 'pisc', label: '🏊 Piscines', format: (v) => v.toLocaleString('fr-FR') },
    { key: 'bars_r', label: '🍺 Bars / 10k hab', format: (v) => v.toLocaleString('fr-FR', { maximumFractionDigits: 1 }) },
    { key: 'resto_r', label: '🍽️ Restos / 10k hab', format: (v) => v.toLocaleString('fr-FR', { maximumFractionDigits: 1 }) },
    { key: 'pisc_r', label: '🏊 Piscines / 10k hab', format: (v) => v.toLocaleString('fr-FR', { maximumFractionDigits: 1 }) },
  ];

  const GROUPS = [
    { label: null, stats: ALL.slice(0, 4) },
    { label: null, stats: ALL.slice(4) },
  ];

  return { ALL, GROUPS };
})();
