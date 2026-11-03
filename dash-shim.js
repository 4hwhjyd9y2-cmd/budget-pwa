// Remplace l'environnement du tableau de bord claude.ai : données locales + même API `dash`.
(function () {
  const KEY = 'budget-donnees';
  const IDS = ['mois_courant', 'mois_en_cours', 'operations', 'references', 'regles', 'synthese'];
  const $ = (id) => document.getElementById(id);

  let bundle = null;
  try { bundle = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { bundle = null; }

  const msg = (t, err) => { const m = $('app-msg'); m.textContent = t; m.className = 'app-msg' + (err ? ' err' : ''); m.hidden = !t; };

  const valide = (b) => b && b.datasets && IDS.every((k) => Array.isArray(b.datasets[k]));

  const draws = {};
  window.dash = {
    data(id) {
      const rows = bundle && bundle.datasets && bundle.datasets[id];
      return rows ? { status: 'ok', data: rows, rows, refreshing: false, meta: [] } : { status: 'missing', data: [], rows: [], refreshing: false, meta: [] };
    },
    draw(name, fn) {
      if (fn) draws[name] = fn;
      const f = draws[name]; if (!f) return;
      document.querySelectorAll('[data-draw="' + name + '"]').forEach((el) => f(el));
    },
    setLink(name) { history.replaceState(null, '', '#' + name); },
    onData(fn) { fn(); },
    colors: ['#7F77DD', '#378ADD', '#BA7517', '#2e8b57', '#d9534f', '#8a6d3b', '#5bc0de', '#999']
  };

  // Barre du haut, import, export
  const ouvrir = () => $('app-file').click();
  $('app-import').onclick = ouvrir;
  $('app-import-2').onclick = ouvrir;
  $('app-file').onchange = async (e) => {
    const f = e.target.files && e.target.files[0]; if (!f) return;
    try {
      const b = JSON.parse(await f.text());
      if (!valide(b)) throw new Error('format');
      localStorage.setItem(KEY, JSON.stringify(b));
      location.reload();
    } catch (err) {
      msg(err.message === 'format' ? 'Ce fichier n’est pas un export du budget (budget-donnees.json).' : 'Import impossible : ' + err.message, true);
    }
    e.target.value = '';
  };
  $('app-export').onclick = async () => {
    if (!bundle) return;
    const nom = 'budget-donnees.json';
    const blob = new Blob([JSON.stringify(bundle)], { type: 'application/json' });
    const file = new File([blob], nom, { type: 'application/json' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file], title: nom }); return; } catch (e) { if (e.name === 'AbortError') return; }
    }
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = nom; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  };

  if (valide(bundle)) {
    $('app-bar').hidden = false;
    if (bundle.maj) {
      const d = new Date(bundle.maj);
      $('app-maj').textContent = 'Données du ' + (isNaN(d) ? bundle.maj : d.toLocaleDateString('fr-FR'));
    }
  } else {
    bundle = null;
    $('app-empty').hidden = false;
    $('dash-root').hidden = true;
  }

  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
  if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
})();
