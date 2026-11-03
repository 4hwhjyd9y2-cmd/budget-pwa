(function () {
  const nf0 = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });
  const nf2 = new Intl.NumberFormat('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const sp = (s) => s.replace(/[  ]/g, ' ');
  const eur = (v) => (v < 0 ? '-' : '') + sp(nf0.format(Math.abs(Math.round(v)))) + ' €';
  const eur2 = (v) => (v < 0 ? '-' : '') + sp(nf2.format(Math.abs(v))) + ' €';
  const num = Number;
  const rowsOf = (id) => { const d = dash.data(id); return d.status === 'ok' ? d.data : []; };
  const whereId = (el) => new URLSearchParams(el.dataset.where).get('id');
  const st = window.bmSt = window.bmSt || { mois: '', bloc: '', poste: '', depuis: '', tri: '', sens: 1 };

  // Onglets
  const show = (name) => {
    const tabs = document.querySelectorAll('.bm-tab');
    let ok = false; tabs.forEach((t) => { if (t.dataset.tab === name) ok = true; });
    if (!ok) name = 'reste';
    tabs.forEach((t) => t.setAttribute('aria-selected', t.dataset.tab === name ? 'true' : 'false'));
    document.querySelectorAll('.bm-page').forEach((p) => { p.hidden = p.id !== name; });
  };
  document.querySelectorAll('.bm-tab').forEach((t) => t.addEventListener('click', () => { show(t.dataset.tab); dash.setLink(t.dataset.tab); }));
  if (location.hash.slice(1)) show(location.hash.slice(1));

  // Valeurs simples
  dash.draw('txt', (el) => {
    const r = rowsOf('synthese').find((x) => x.id === whereId(el));
    el.textContent = !r ? '—' : r.unite === '€' ? eur2(num(r.valeur)) : String(r.valeur);
  });
  dash.draw('eur', (el) => {
    const src = el.dataset.source, f = el.dataset.field;
    const r = rowsOf(src).find((x) => x.id === whereId(el));
    el.textContent = r ? eur(num(r[f])) : '—';
    el.classList.toggle('neg', !!r && num(r[f]) < 0);
  });
  dash.draw('pct', (el) => {
    const r = rowsOf(el.dataset.source).find((x) => x.id === whereId(el));
    el.textContent = r ? String(num(r[el.dataset.field])).replace('.', ',') + ' %' : '—';
  });

  const syn = (id) => { const r = rowsOf('synthese').find((x) => x.id === id); return r ? r.valeur : ''; };
  const openPoste = (r) => {
    st.poste = r.poste; st.bloc = r.bloc; st.tri = ''; st.sens = 1; dash.draw('hops');
    if (r.bloc === 'Enveloppes') { st.mois = ''; st.depuis = String(syn('debut_cle')); } else { st.mois = String(r.mois || syn('mois_cle')); st.depuis = ''; }
    const q = document.querySelector('#bm-q'); if (q) q.value = '';
    dash.draw('fmois'); dash.draw('fbloc'); dash.draw('filtre'); dash.draw('tops'); dash.draw('fops');
    show('donnees'); dash.setLink('donnees');
    const c = document.querySelector('#c-ops'); if (c) c.scrollIntoView({ block: 'start' });
  };

  // Jauges en demi-cercle
  const color = (p) => (p < 0 ? 'var(--cds-chart-status-critical)' : p < 25 ? 'var(--color-warn)' : 'var(--color-ok)');
  dash.draw('jauge', (el) => {
    const r = rowsOf('mois_courant').find((x) => x.id === el.dataset.id);
    el.replaceChildren();
    if (!r) { el.textContent = '—'; return; }
    if (r.bloc !== 'Global') {
      el.classList.add('bm-click'); el.tabIndex = 0; el.setAttribute('role', 'button');
      el.title = 'Voir les opérations : ' + r.poste;
      const go = () => openPoste(r);
      el.onclick = go; el.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } };
    }
    const W = 200, H = 118, R = 84, cx = 100, cy = 100, th = 16;
    const pct = num(r.pct_reste), f = Math.max(0, Math.min(100, pct)) / 100;
    const arc = d3.arc().innerRadius(R - th).outerRadius(R).cornerRadius(3);
    const a0 = -Math.PI / 2;
    const svg = d3.select(el).append('svg').attr('viewBox', `0 0 ${W} ${H}`).attr('width', '100%').attr('role', 'img')
      .attr('aria-label', r.poste + ' : ' + eur(num(r.reste)) + ' restants');
    const g = svg.append('g').attr('transform', `translate(${cx},${cy})`);
    g.append('path').attr('d', arc({ startAngle: a0, endAngle: Math.PI / 2 })).attr('fill', 'var(--cds-chart-grid)');
    if (f > 0) g.append('path').attr('d', arc({ startAngle: a0, endAngle: a0 + Math.PI * f })).attr('fill', color(pct));
    g.append('text').attr('y', -16).attr('text-anchor', 'middle').attr('font-size', 26).attr('font-family', 'var(--font-anthropic-serif)')
      .attr('fill', pct < 0 ? 'var(--color-bad)' : 'var(--color-fg)').text(eur(num(r.reste)));
    g.append('text').attr('y', 4).attr('text-anchor', 'middle').attr('font-size', 11).attr('fill', 'var(--color-fg-muted)')
      .text(pct < 0 ? 'au-delà du prévu' : 'restant, soit ' + Math.round(pct) + ' %');
  });

  const td = (tr, t, cls) => { const c = document.createElement('td'); if (cls) c.className = cls; c.textContent = t; tr.append(c); return c; };

  dash.draw('tpostes', (tb) => {
    const rows = rowsOf('mois_courant').filter((r) => r.bloc === 'Loisirs' || r.bloc === 'Charges variables');
    tb.replaceChildren(...rows.map((r) => {
      const tr = document.createElement('tr'); tr.dataset.key = r.id;
      td(tr, r.poste); td(tr, r.bloc, 'hide-sm'); td(tr, eur2(num(r.depense)), 'num'); td(tr, eur2(num(r.seuil)), 'num');
      td(tr, eur2(num(r.reste)), 'num' + (num(r.reste) < 0 ? ' neg' : ''));
      return tr;
    }));
  });
  dash.draw('tenv', (tb) => {
    const rows = rowsOf('mois_courant').filter((r) => r.bloc === 'Enveloppes');
    tb.replaceChildren(...rows.map((r) => {
      const tr = document.createElement('tr'); tr.dataset.key = r.id;
      td(tr, r.poste); td(tr, eur2(num(r.depense_mois)), 'num'); td(tr, eur2(num(r.depense)), 'num');
      td(tr, eur2(num(r.seuil)), 'num'); td(tr, eur2(num(r.reste)), 'num' + (num(r.reste) < 0 ? ' neg' : ''));
      return tr;
    }));
  });

  const sum = (rows, k) => Math.round(rows.reduce((s, r) => s + (r[k] === null || r[k] === undefined ? 0 : num(r[k])), 0) * 100) / 100;
  const foot = (tf, cells) => { const tr = document.createElement('tr'); cells.forEach(([t, c]) => td(tr, t, c)); tf.replaceChildren(tr); };
  dash.draw('fpostes', (tf) => {
    const rows = rowsOf('mois_courant').filter((r) => r.bloc === 'Loisirs' || r.bloc === 'Charges variables');
    const re = sum(rows, 'reste');
    foot(tf, [['Total'], ['', 'hide-sm'], [eur2(sum(rows, 'depense')), 'num'], [eur2(sum(rows, 'seuil')), 'num'], [eur2(re), 'num' + (re < 0 ? ' neg' : '')]]);
  });
  dash.draw('fenv', (tf) => {
    const rows = rowsOf('mois_courant').filter((r) => r.bloc === 'Enveloppes');
    const re = sum(rows, 'reste');
    foot(tf, [['Total'], [eur2(sum(rows, 'depense_mois')), 'num'], [eur2(sum(rows, 'depense')), 'num'], [eur2(sum(rows, 'seuil')), 'num'], [eur2(re), 'num' + (re < 0 ? ' neg' : '')]]);
  });

  // Cartes par catégorie : reste total, puis dépensé face au prévu par poste
  const ICONS = {
    verre: '<path d="M6 4h12l-6 7z"/><path d="M12 11v8"/><path d="M8 20h8"/>',
    panier: '<path d="M3 4h2l2.4 10.2a1 1 0 0 0 1 .8h8.8a1 1 0 0 0 1-.8L20 7H6.2"/><circle cx="9" cy="19" r="1.4"/><circle cx="17" cy="19" r="1.4"/>',
    calendrier: '<rect x="4" y="5" width="16" height="15" rx="2"/><path d="M4 10h16"/><path d="M9 3v4"/><path d="M15 3v4"/>'
  };
  const tint = (c, p) => 'color-mix(in srgb, ' + c + ' ' + p + '%, transparent)';
  const etat = (p) => (p < 0 ? 'var(--cds-chart-status-critical)' : p < 25 ? 'var(--color-warn)' : 'var(--color-ok)');
  dash.draw('cat', (el) => {
    const bloc = el.dataset.bloc, tone = el.dataset.tone;
    const rows = rowsOf(el.dataset.source || 'mois_courant').filter((r) => r.bloc === bloc);
    el.replaceChildren();
    if (!rows.length) { el.textContent = '—'; return; }
    const tp = sum(rows, 'seuil'), tr = Math.round((tp - sum(rows, 'depense')) * 100) / 100, tpc = tp ? tr / tp * 100 : 0;
    const hd = document.createElement('div'); hd.className = 'bm-ch';
    const t = document.createElement('div'); t.className = 'bm-ct';
    const ic = document.createElement('span'); ic.className = 'bm-ic'; ic.style.background = tint(tone, 18); ic.style.color = tone; ic.setAttribute('aria-hidden', 'true');
    ic.innerHTML = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + (ICONS[el.dataset.ic] || '') + '</svg>';
    const tx = document.createElement('div'); const h = document.createElement('h2'); h.textContent = el.dataset.titre || bloc;
    const nt = document.createElement('p'); nt.className = 'bm-note'; nt.textContent = el.dataset.note || ''; tx.append(h, nt); t.append(ic, tx);
    const rgt = document.createElement('div'); rgt.className = 'bm-cr';
    const sb = document.createElement('span'); sb.className = 'bm-note'; sb.textContent = 'sur ' + eur(tp) + ' ' + el.dataset.per;
    const pill = document.createElement('span'); pill.className = 'bm-pill'; pill.style.background = tint(etat(tpc), 16); pill.style.color = tr < 0 ? 'var(--color-bad)' : 'var(--color-fg)';
    const pb = document.createElement('b'); pb.textContent = eur(tr); pill.append(pb, document.createTextNode(tr < 0 ? 'au-delà' : 'restants'));
    rgt.append(sb, pill); hd.append(t, rgt); el.append(hd);
    rows.forEach((r) => {
      const dep = num(r.depense), prev = num(r.seuil), re = num(r.reste), p = prev ? re / prev * 100 : 0, mx = Math.max(dep, prev, 1) * 1.08;
      const row = document.createElement('div'); row.className = 'bm-row'; row.dataset.key = r.id; row.tabIndex = 0; row.setAttribute('role', 'button');
      row.title = 'Voir les opérations : ' + r.poste;
      row.onclick = () => openPoste(r); row.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openPoste(r); } };
      const n = document.createElement('span'); n.textContent = r.poste;
      const bt = document.createElement('div'); bt.className = 'bm-bt'; bt.setAttribute('role', 'img');
      bt.setAttribute('aria-label', 'Dépensé ' + eur(dep) + ' sur ' + eur(prev) + ' prévus');
      const bd = document.createElement('div'); bd.className = 'bm-bd'; bd.style.width = (dep / mx * 100) + '%'; bd.style.background = etat(p);
      const bm = document.createElement('div'); bm.className = 'bm-bm'; bm.style.left = (prev / mx * 100) + '%';
      bt.append(bd, bm);
      const rv = document.createElement('div'); rv.className = 'bm-rv';
      const b = document.createElement('b'); b.textContent = eur(re); if (re < 0) b.style.color = 'var(--color-bad)';
      const s2 = document.createElement('span'); s2.textContent = (re < 0 ? 'au-delà' : 'restants') + ' sur ' + eur(prev);
      rv.append(b, s2); row.append(n, bt, rv); el.append(row);
    });
  });

  // Données
  const MOIS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
  const ml = (k) => MOIS[num(k.slice(5, 7)) - 1] + ' ' + k.slice(0, 4);
  dash.draw('fmois', (sel) => {
    const ks = Array.from(new Set(rowsOf('operations').map((r) => r.mois))).sort().reverse();
    sel.replaceChildren(new Option('Tous les mois', ''), ...ks.map((k) => new Option(ml(k), k)));
    sel.value = st.mois; sel.onchange = () => { st.mois = sel.value; st.depuis = ''; dash.draw('filtre'); dash.draw('tops'); dash.draw('fops'); };
  });
  dash.draw('fbloc', (sel) => {
    const ks = Array.from(new Set(rowsOf('operations').map((r) => r.bloc))).sort();
    sel.replaceChildren(new Option('Toutes les catégories', ''), ...ks.map((k) => new Option(k, k)));
    sel.value = st.bloc; sel.onchange = () => { st.bloc = sel.value; st.poste = ''; st.depuis = ''; dash.draw('filtre'); dash.draw('tops'); dash.draw('fops'); };
  });
  document.querySelectorAll('#bm-q').forEach((q) => q.addEventListener('input', () => { dash.draw('tops'); dash.draw('fops'); }));
  const COLS = [['jour', 'Date', ''], ['libelle', 'Libellé', ''], ['bloc', 'Catégorie', 'hide-sm'], ['poste', 'Poste', ''], ['montant', 'Montant', 'num']];
  const txtCmp = (x, y) => String(x).localeCompare(String(y), 'fr', { sensitivity: 'base' });
  const cmpOf = (k) => k === 'jour' ? (a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : num(a.id) - num(b.id))
    : k === 'montant' ? (a, b) => num(a.montant) - num(b.montant) : (a, b) => txtCmp(a[k], b[k]) || (a.date < b.date ? 1 : -1);
  const opsFiltrees = () => {
    const qe = document.querySelector('#bm-q'); const q = (qe ? qe.value : '').trim().toLowerCase();
    const rows = rowsOf('operations').filter((r) => (!st.mois || r.mois === st.mois) && (!st.bloc || r.bloc === st.bloc) &&
      (!st.poste || r.poste === st.poste) && (!st.depuis || r.mois >= st.depuis) &&
      (!q || (r.libelle + ' ' + r.poste + ' ' + r.bloc).toLowerCase().includes(q)));
    if (st.tri) { const c = cmpOf(st.tri); return rows.sort((a, b) => st.sens * c(a, b)); }
    return rows.sort((a, b) => st.poste ? num(a.montant) - num(b.montant) : ((a.bloc === 'Non classé') !== (b.bloc === 'Non classé') ? (a.bloc === 'Non classé' ? -1 : 1) : a.date < b.date ? 1 : a.date > b.date ? -1 : num(b.id) - num(a.id)));
  };
  const redrawOps = () => { dash.draw('hops'); dash.draw('tops'); dash.draw('fops'); };
  dash.draw('hops', (tr) => {
    tr.replaceChildren(...COLS.map(([k, lab, cls]) => {
      const th = document.createElement('th'); th.dataset.field = k; if (cls) th.className = cls;
      if (st.tri === k) th.setAttribute('aria-sort', st.sens > 0 ? 'ascending' : 'descending');
      const b = document.createElement('button'); b.type = 'button'; b.className = 'bm-sort';
      b.textContent = lab + (st.tri === k ? (st.sens > 0 ? ' ▲' : ' ▼') : '');
      b.title = 'Trier par ' + lab.toLowerCase();
      b.onclick = () => { if (st.tri === k) st.sens = -st.sens; else { st.tri = k; st.sens = k === 'jour' ? -1 : 1; } redrawOps(); };
      th.append(b); return th;
    }));
  });
  dash.draw('fops', (tf) => {
    const rows = opsFiltrees(); const tr = document.createElement('tr');
    const t = rows.reduce((s, r) => s + num(r.montant), 0);
    const c1 = document.createElement('td'); c1.colSpan = 2; c1.textContent = 'Total : ' + rows.length + (rows.length > 1 ? ' opérations' : ' opération'); tr.append(c1);
    td(tr, '', 'hide-sm'); td(tr, ''); td(tr, eur2(Math.round(t * 100) / 100), 'num' + (t < 0 ? ' neg' : ''));
    tf.replaceChildren(tr);
  });
  dash.draw('tops', (tb) => {
    const rows = opsFiltrees();
    tb.replaceChildren(...rows.map((r) => {
      const tr = document.createElement('tr'); tr.dataset.key = String(r.id); if (r.bloc === 'Non classé') tr.className = 'nc';
      td(tr, r.jour); td(tr, r.libelle); td(tr, r.bloc, 'hide-sm'); td(tr, r.poste); td(tr, eur2(num(r.montant)), 'num');
      return tr;
    }));
  });

  dash.draw('filtre', (el) => {
    el.replaceChildren();
    if (!st.poste) { el.hidden = true; return; }
    el.hidden = false;
    const per = st.depuis ? 'depuis ' + ml(st.depuis) : st.mois ? 'en ' + ml(st.mois) : 'sur toute la période';
    const t = document.createElement('span'); t.textContent = 'Opérations « ' + st.poste + ' » ' + per + ', les plus grosses dépenses en premier. ';
    const b = document.createElement('button'); b.type = 'button'; b.className = 'bm-btn'; b.textContent = 'Retirer le filtre';
    b.onclick = () => { st.poste = ''; st.depuis = ''; st.mois = ''; st.bloc = ''; dash.draw('fmois'); dash.draw('fbloc'); dash.draw('filtre'); dash.draw('tops'); dash.draw('fops'); };
    el.append(t, b);
  });

  // Contrôles de l'export
  dash.draw('ctrl', (ul) => {
    const nc = num(syn('nc')) || 0;
    const ko = rowsOf('mois_courant').filter((r) => r.bloc === 'Charges fixes' && !r.ok);
    const li = (ok, txt, tab) => {
      const l = document.createElement('li'); l.className = ok ? 'ok' : 'ko';
      const m = document.createElement('span'); m.className = 'bm-dot'; m.textContent = ok ? '✓' : '!'; m.setAttribute('aria-hidden', 'true');
      const t = document.createElement('span'); t.textContent = txt; l.append(m, t);
      if (!ok && tab) { const b = document.createElement('button'); b.type = 'button'; b.className = 'bm-btn'; b.textContent = 'Voir';
        b.onclick = () => { if (tab === 'donnees') { st.bloc = 'Non classé'; st.poste = ''; st.mois = ''; st.depuis = ''; dash.draw('fbloc'); dash.draw('fmois'); dash.draw('filtre'); dash.draw('tops'); dash.draw('fops'); } show(tab); dash.setLink(tab); }; l.append(b); }
      return l;
    };
    ul.replaceChildren(
      li(nc === 0, nc === 0 ? 'Toutes les opérations de l’export sont classées.' : nc + (nc > 1 ? ' opérations ne sont pas classées' : ' opération n’est pas classée') + ' : les jauges peuvent être trop optimistes.', 'donnees'),
      li(ko.length === 0, ko.length === 0 ? 'Charges fixes du mois : toutes conformes.' : 'Charges fixes à vérifier : ' + ko.map((r) => r.poste + ' (' + r.etat.toLowerCase() + ')').join(', ') + '.'));
  });
  dash.draw('tfix', (tb) => {
    const rows = rowsOf('mois_courant').filter((r) => r.bloc === 'Charges fixes');
    tb.replaceChildren(...rows.map((r) => {
      const tr = document.createElement('tr'); tr.dataset.key = r.id;
      td(tr, r.poste); td(tr, r.seuil === null || r.seuil === undefined || (num(r.seuil) === 0 && r.note !== 'Mensuel') ? r.note : eur2(num(r.seuil)), 'num'); td(tr, eur2(num(r.depense)), 'num');
      td(tr, r.etat, r.ok ? '' : 'neg');
      return tr;
    }));
  });

  dash.draw('ffix', (tf) => {
    const rows = rowsOf('mois_courant').filter((r) => r.bloc === 'Charges fixes');
    const ko = rows.filter((r) => !r.ok).length;
    const lisse = sum(rowsOf('references').filter((r) => r.type === 'Charge fixe'), 'montant');
    foot(tf, [['Total'], [eur2(lisse) + ' en moyenne', 'num'], [eur2(sum(rows, 'depense')), 'num'], [ko ? ko + ' à vérifier' : 'Tout est conforme', ko ? 'neg' : '']]);
  });

  // Règles
  dash.draw('trefs', (tb) => {
    tb.replaceChildren(...rowsOf('references').map((r) => {
      const tr = document.createElement('tr'); tr.dataset.key = r.id;
      td(tr, r.type); td(tr, r.poste); td(tr, r.type === 'Calcul' && r.id === 'part_loisirs' ? String(num(r.montant)).replace('.', ',') + ' %' : eur2(num(r.montant)), 'num'); td(tr, r.note, 'hide-sm');
      return tr;
    }));
  });
  dash.draw('tregles', (tb) => {
    tb.replaceChildren(...rowsOf('regles').map((r) => {
      const tr = document.createElement('tr'); tr.dataset.key = String(r.id);
      td(tr, r.regle); td(tr, r.bloc); td(tr, r.poste);
      return tr;
    }));
  });
})();
