// Remplace l'environnement du tableau de bord claude.ai : données locales + même API `dash`.
(function () {
  const KEY = 'budget-donnees';
  const $ = (id) => document.getElementById(id);
  const M = window.Moteur;
  const eur = (v) => Number(v).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' €';
  const aujourdhui = () => new Date().toISOString();

  // Jeu de données stocké : {version: 2, references, regles, operations, export, regles_perso, regles_auto, modifie_le, sauvegarde_le}
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
  const ecrire = (b) => { localStorage.setItem(KEY, JSON.stringify(b)); };
  // Toute modification des données est datée, pour rappeler de sauvegarder
  const sauver = (b) => { b.modifie_le = aujourdhui(); ecrire(b); };

  let calc = bundle ? M.calculer(bundle) : null;
  const draws = {};
  const apres = {};
  const toutRedessiner = () => Object.keys(draws).forEach((n) => window.dash.draw(n));
  window.dash = {
    data(id) {
      const rows = calc && calc.datasets[id];
      return rows ? { status: 'ok', data: rows, rows, refreshing: false, meta: [] } : { status: 'missing', data: [], rows: [], refreshing: false, meta: [] };
    },
    draw(name, fn) {
      if (fn) draws[name] = fn;
      const f = draws[name]; if (!f) return;
      document.querySelectorAll('[data-draw="' + name + '"]').forEach((el) => { f(el); if (apres[name]) apres[name](el); });
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

  // Après une modification : recalcul, textes, tableaux, rappel de sauvegarde
  const rafraichir = () => { calc = M.calculer(bundle); remplir(); toutRedessiner(); rappel(); };

  // ---------- Sauvegarde ----------
  const rappel = () => {
    const el = $('app-save'); if (!bundle) { el.hidden = true; return; }
    const mod = bundle.modifie_le, sav = bundle.sauvegarde_le;
    if (sav && (!mod || mod <= sav)) { el.hidden = true; return; }
    $('app-save-txt').textContent = sav
      ? 'Modifications depuis ta dernière sauvegarde du ' + new Date(sav).toLocaleDateString('fr-FR') + '. Tes données ne sont que sur ce téléphone.'
      : 'Aucune sauvegarde. Tes données ne sont que sur ce téléphone : range une copie dans Google Drive ou iCloud.';
    el.hidden = false;
  };
  const sauvegarder = async () => {
    if (!bundle) return;
    const nom = 'budget-donnees-' + new Date().toISOString().slice(0, 10) + '.json';
    const marque = () => { bundle.sauvegarde_le = aujourdhui(); ecrire(bundle); rappel(); };
    const blob = new Blob([JSON.stringify(Object.assign({}, bundle, { sauvegarde_le: aujourdhui() }))], { type: 'application/json' });
    const file = new File([blob], nom, { type: 'application/json' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file], title: nom }); marque(); msg('Sauvegarde envoyée. Choisis « Enregistrer dans Fichiers » puis Google Drive pour la garder hors du téléphone.'); return; }
      catch (e) { if (e.name === 'AbortError') return; }
    }
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = nom; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    marque();
  };
  $('app-export').onclick = sauvegarder;
  $('app-save-btn').onclick = sauvegarder;

  // ---------- Import : export bancaire (.zip ou .csv) ou sauvegarde (.json) ----------
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
        ecrire(b); location.reload(); return;
      }
      if (!bundle) throw new Error('Importe d’abord budget-donnees.json : il contient tes montants de référence.');
      let texte, nomCsv = nom;
      if (/\.zip$/i.test(nom) || f.type === 'application/zip') { const z = await M.lireZip(await f.arrayBuffer()); texte = z.texte; nomCsv = z.nom; }
      else texte = await f.text();
      const r = M.importer(bundle, texte, nomCsv);
      sauver(r.bundle);
      sessionStorage.setItem('budget-msg', r.stats.lues + ' opérations lues, ' + r.stats.nouvelles + ' nouvelle' + (r.stats.nouvelles > 1 ? 's' : '') +
        (r.stats.aClasser ? ', dont ' + r.stats.aClasser + ' à classer (onglet Données, en tête et surlignées).' : ', toutes classées.') +
        (r.stats.migres ? ' ' + r.stats.migres + ' ancien' + (r.stats.migres > 1 ? 's virements reclassés' : ' virement reclassé') + ' en « Virement d’épargne ».' : ''));
      location.reload();
    } catch (err) {
      msg(err.message || String(err), true);
    }
  };
  try { const m = sessionStorage.getItem('budget-msg'); if (m) { msg(m); sessionStorage.removeItem('budget-msg'); } } catch (e) {}

  // ---------- Dialogues ----------
  // `ok` s'exécute à la validation (bouton value="ok"), avant la fermeture du dialogue
  const dialogue = (html, ok) => {
    const d = document.createElement('dialog'); d.className = 'app-dlg'; d.innerHTML = '<form method="dialog">' + html + '</form>'; document.body.append(d);
    d.querySelector('form').addEventListener('submit', (e) => { if (e.submitter && e.submitter.value === 'ok') ok(); });
    return d;
  };
  const boutons = (ok) => '<div class="row"><button class="app-btn" value="annuler">Annuler</button><button class="app-btn primary" value="ok">' + ok + '</button></div>';

  // Reclassement d'une opération : toucher une ligne de l'onglet Données
  const dlg = dialogue('<h2>Changer le poste</h2><p id="dlg-op"></p><select id="dlg-poste" aria-label="Poste"></select>' +
    '<label><input type="checkbox" id="dlg-tout"> <span>Toujours classer ce marchand ici</span></label>' + boutons('Enregistrer'), () => {
    if (opId === null) return;
    const [bloc, poste] = $('dlg-poste').value.split('|');
    bundle = M.reclasser(bundle, opId, bloc, poste, $('dlg-tout').checked);
    sauver(bundle);
    // Plus rien à classer : on retire le filtre « Non classé » pour ne pas laisser un tableau vide
    const st = window.bmSt; if (st && st.bloc === 'Non classé' && !bundle.operations.some((o) => o.bloc === 'Non classé')) st.bloc = '';
    rafraichir();
  });
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

  // ---------- Montants de référence modifiables ----------
  const MODIFIABLES = ['Revenu', 'Charge fixe', 'Charge variable', 'Loisir', 'Enveloppe annuelle'];
  apres.trefs = (tb) => tb.querySelectorAll('tr').forEach((tr) => {
    const r = bundle && bundle.references.find((x) => x.id === tr.dataset.key);
    if (r && MODIFIABLES.includes(r.type)) { tr.classList.add('edit'); tr.title = 'Modifier ' + r.poste; }
  });
  const dRef = dialogue('<h2 id="ref-titre">Modifier</h2><p id="ref-type"></p>' +
    '<label for="ref-montant">Montant (€)</label><input id="ref-montant" inputmode="decimal" autocomplete="off">' +
    '<label for="ref-note">Base du montant</label><input id="ref-note" type="text" autocomplete="off">' +
    boutons('Enregistrer'), () => {
    if (refId === null) return;
    const v = Number(String($('ref-montant').value).replace(/\s/g, '').replace(',', '.'));
    if (!isFinite(v) || v < 0) { msg('Montant invalide : rien n’a été changé.', true); return; }
    bundle = Object.assign({}, bundle, { references: bundle.references.map((r) => (r.id === refId ? Object.assign({}, r, { montant: Math.round(v * 100) / 100, note: $('ref-note').value.trim() }) : r)) });
    sauver(bundle); rafraichir();
    msg('Montant enregistré. Les jauges et le virement sont recalculés.');
  });
  let refId = null;
  document.addEventListener('click', (e) => {
    const tr = e.target.closest('[data-draw="trefs"] tr.edit'); if (!tr || !bundle) return;
    const r = bundle.references.find((x) => x.id === tr.dataset.key); if (!r) return;
    refId = r.id;
    $('ref-titre').textContent = r.poste;
    $('ref-type').textContent = r.type + (r.type === 'Enveloppe annuelle' ? ' : montant pour l’année' : r.type === 'Loisir' ? ' : montant d’un mois normal' : ' : montant par mois');
    $('ref-montant').value = String(r.montant).replace('.', ',');
    $('ref-note').value = r.note || '';
    dRef.showModal();
  });

  // ---------- Recalcul annuel des montants (remise à zéro de janvier) ----------
  const dProp = dialogue('<h2>Montants sur les 12 derniers mois</h2><p id="prop-per"></p><div class="app-prop" id="prop-liste"></div>' + boutons('Appliquer la sélection'), () => {
    const choix = {}; $('prop-liste').querySelectorAll('input:checked').forEach((cb) => { const l = props[cb.dataset.i]; choix[l.id] = l; });
    const n = Object.keys(choix).length; if (!n) return;
    const an = (bundle.export || '').slice(0, 4);
    bundle = Object.assign({}, bundle, { refs_maj: an, references: bundle.references.map((r) => (choix[r.id] ? Object.assign({}, r, { montant: choix[r.id].propose, note: choix[r.id].base }) : r)) });
    sauver(bundle); rafraichir();
    msg(n + ' montant' + (n > 1 ? 's' : '') + ' mis à jour.');
  });
  let props = [];
  $('app-proposer').onclick = () => {
    if (!bundle) return;
    const p = M.proposer(bundle); props = p.lignes;
    $('prop-per').textContent = 'Période : ' + p.periode + '. Coche les montants à remplacer. Les seuils des loisirs et charges variables restent tes décisions : ils sont décochés.';
    $('prop-liste').replaceChildren(...props.map((l, i) => {
      const lab = document.createElement('label');
      const cb = document.createElement('input'); cb.type = 'checkbox'; cb.checked = l.coche; cb.dataset.i = i;
      const t = document.createElement('span'); t.textContent = l.poste; const sm = document.createElement('small'); sm.textContent = l.base; t.append(sm);
      const v = document.createElement('span'); v.className = 'num'; v.textContent = eur(l.actuel) + ' → ' + eur(l.propose);
      lab.append(cb, t, v); return lab;
    }));
    dProp.showModal();
  };
  // En janvier, rappel de mettre à jour les montants de l'année
  const rappelAnnuel = () => {
    if (!bundle || !bundle.export) return;
    const an = bundle.export.slice(0, 4), mois = bundle.export.slice(5, 7);
    if (mois <= '02' && bundle.refs_maj !== an && $('app-msg').hidden) msg('Nouvelle année : les enveloppes repartent à zéro. Mets à jour tes montants de référence (onglet Règles, « Recalculer sur les 12 derniers mois »).');
  };

  // ---------- Règles « toujours ce marchand » ----------
  window.dash.draw('perso', (ul) => {
    const l = (bundle && bundle.regles_perso) || [];
    if (!l.length) { const li = document.createElement('li'); li.textContent = 'Aucune pour l’instant.'; ul.replaceChildren(li); return; }
    ul.replaceChildren(...l.map((p, i) => {
      const li = document.createElement('li');
      const t = document.createElement('span'); t.textContent = p.marchand + ' → ' + p.poste + ' (' + p.bloc + ')';
      const b = document.createElement('button'); b.type = 'button'; b.className = 'bm-btn'; b.textContent = 'Supprimer';
      b.onclick = () => { bundle = Object.assign({}, bundle, { regles_perso: l.filter((x, j) => j !== i) }); sauver(bundle); rafraichir(); };
      li.append(t, b); return li;
    }));
  });

  if (bundle) {
    $('app-bar').hidden = false;
    if (bundle.export) $('app-maj').textContent = 'Export du ' + bundle.export.slice(8, 10) + '/' + bundle.export.slice(5, 7) + '/' + bundle.export.slice(0, 4);
    rappel(); rappelAnnuel();
  } else {
    $('app-empty').hidden = false;
    $('dash-root').hidden = true;
  }

  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
  if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
})();
