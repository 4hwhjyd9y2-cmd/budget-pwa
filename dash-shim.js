// Remplace l'environnement du tableau de bord claude.ai : données locales + même API `dash`.
(function () {
  const KEY = 'budget-donnees';
  const $ = (id) => document.getElementById(id);
  const M = window.Moteur;

  // Jeu de données stocké : {version: 2, references, regles, operations, export, regles_perso}
  const versV2 = (b) => {
    if (!b) return null;
    if (b.version === 2 && Array.isArray(b.operations) && Array.isArray(b.references)) return b;
    if (b.datasets && Array.isArray(b.datasets.operations) && Array.isArray(b.datasets.references)) {
      const s = (b.datasets.synthese || []).find((x) => x.id === 'maj');
      const exp = s && /^\d\d\/\d\d\/\d{4}$/.test(s.valeur) ? s.valeur.slice(6) + '-' + s.valeur.slice(3, 5) + '-' + s.valeur.slice(0, 2) : undefined;
      return { format: 'budget-marin', version: 2, references: b.datasets.references, regles: b.datasets.regles || [], operations: b.datasets.operations, export: exp, regles_perso: [] };
    }
    return null;
  };
  let bundle = null;
  try { bundle = versV2(JSON.parse(localStorage.getItem(KEY) || 'null')); } catch (e) { bundle = null; }

  const msg = (t, err) => { const m = $('app-msg'); m.textContent = t; m.className = 'app-msg' + (err ? ' err' : ''); m.hidden = !t; };
  const sauver = (b) => { localStorage.setItem(KEY, JSON.stringify(b)); };

  let calc = bundle ? M.calculer(bundle) : null;
  const draws = {};
  const toutRedessiner = () => Object.keys(draws).forEach((n) => window.dash.draw(n));
  window.dash = {
    data(id) {
      const rows = calc && calc.datasets[id];
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

  // Textes qui dépendent du mois affiché ({mois}, {annee}...)
  const remplir = () => {
    if (!calc) return;
    const ops = calc.datasets.operations, premier = ops.length ? ops[0].mois : '';
    const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
    const t = Object.assign({ debut_ops: premier ? MOIS[Number(premier.slice(5)) - 1] + ' ' + premier.slice(0, 4) : '' }, calc.textes);
    const sub = (s) => s.replace(/\{(\w+)\}/g, (a, k) => (k in t ? t[k] : a));
    document.querySelectorAll('[data-per],[data-note]').forEach((el) => {
      ['per', 'note'].forEach((k) => { const o = 'tpl' + k; if (el.dataset[k] === undefined) return; if (el.dataset[o] === undefined) el.dataset[o] = el.dataset[k]; el.dataset[k] = sub(el.dataset[o]); });
    });
    document.querySelectorAll('.tpl').forEach((el) => { if (el.dataset.tpl === undefined) el.dataset.tpl = el.textContent; el.textContent = sub(el.dataset.tpl); });
  };
  remplir();

  // Import : export Boursobank (.zip ou .csv) ou sauvegarde (.json)
  const ouvrir = () => $('app-file').click();
  $('app-import').onclick = ouvrir;
  $('app-import-2').onclick = ouvrir;
  $('app-file').onchange = async (e) => {
    const f = e.target.files && e.target.files[0]; e.target.value = ''; if (!f) return;
    try {
      const nom = f.name || '';
      if (/\.json$/i.test(nom) || f.type === 'application/json') {
        const b = versV2(JSON.parse(await f.text()));
        if (!b) throw new Error('Ce fichier n’est pas une sauvegarde du budget.');
        sauver(b); location.reload(); return;
      }
      if (!bundle) throw new Error('Importe d’abord budget-donnees.json : il contient tes montants de référence.');
      let texte, nomCsv = nom;
      if (/\.zip$/i.test(nom) || f.type === 'application/zip') { const z = await M.lireZip(await f.arrayBuffer()); texte = z.texte; nomCsv = z.nom; }
      else texte = await f.text();
      const r = M.importer(bundle, texte, nomCsv);
      sauver(r.bundle);
      sessionStorage.setItem('budget-msg', r.stats.lues + ' opérations lues, ' + r.stats.nouvelles + ' nouvelle' + (r.stats.nouvelles > 1 ? 's' : '') +
        (r.stats.aClasser ? ', dont ' + r.stats.aClasser + ' à classer (onglet Données, en tête et surlignées).' : ', toutes classées.'));
      location.reload();
    } catch (err) {
      msg(err.message || String(err), true);
    }
  };
  try { const m = sessionStorage.getItem('budget-msg'); if (m) { msg(m); sessionStorage.removeItem('budget-msg'); } } catch (e) {}

  // Export : sauvegarde complète (classements manuels compris)
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

  // Reclassement d'une opération : toucher une ligne de l'onglet Données
  const dlg = document.createElement('dialog'); dlg.className = 'app-dlg';
  dlg.innerHTML = '<form method="dialog"><h2>Changer le poste</h2><p id="dlg-op"></p><select id="dlg-poste" aria-label="Poste"></select>' +
    '<label><input type="checkbox" id="dlg-tout"> <span>Toujours classer ce marchand ici</span></label>' +
    '<div class="row"><button class="app-btn" value="annuler">Annuler</button><button class="app-btn primary" value="ok" id="dlg-ok">Enregistrer</button></div></form>';
  document.body.append(dlg);
  let opId = null;
  document.addEventListener('click', (e) => {
    const tr = e.target.closest('[data-draw="tops"] tr'); if (!tr || !bundle) return;
    const o = bundle.operations.find((x) => String(x.id) === tr.dataset.key); if (!o) return;
    opId = o.id;
    $('dlg-op').textContent = o.jour + ' · ' + o.libelle + ' · ' + String(o.montant).replace('.', ',') + ' €';
    const sel = $('dlg-poste'); sel.replaceChildren();
    const P = M.postes(bundle);
    Object.keys(P).forEach((b) => { const g = document.createElement('optgroup'); g.label = b; P[b].forEach((p) => { const op = new Option(p, b + '|' + p); if (o.bloc === b && o.poste === p) op.selected = true; g.append(op); }); sel.append(g); });
    $('dlg-tout').checked = false;
    $('dlg-tout').parentElement.querySelector('span').textContent = 'Toujours classer « ' + M.marchand(o.libelle) + ' » ici';
    dlg.showModal();
  });
  dlg.addEventListener('close', () => {
    if (dlg.returnValue !== 'ok' || opId === null) return;
    const [bloc, poste] = $('dlg-poste').value.split('|');
    bundle = M.reclasser(bundle, opId, bloc, poste, $('dlg-tout').checked);
    sauver(bundle); calc = M.calculer(bundle); remplir();
    // Plus rien à classer : on retire le filtre « Non classé » pour ne pas laisser un tableau vide
    const st = window.bmSt; if (st && st.bloc === 'Non classé' && !bundle.operations.some((o) => o.bloc === 'Non classé')) st.bloc = '';
    toutRedessiner();
  });

  if (bundle) {
    $('app-bar').hidden = false;
    if (bundle.export) $('app-maj').textContent = 'Export du ' + bundle.export.slice(8, 10) + '/' + bundle.export.slice(5, 7) + '/' + bundle.export.slice(0, 4);
  } else {
    $('app-empty').hidden = false;
    $('dash-root').hidden = true;
  }

  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
  if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
})();
