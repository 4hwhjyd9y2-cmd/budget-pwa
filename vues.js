// Vues « Ce mois-ci », « Dans la durée » et réglages de la page Règles. Calculs dans moteur.js (calc.vue).
(function () {
  const A = window.App;
  if (!A || !A.calc()) return;
  const $ = (id) => document.getElementById(id);
  const nf0 = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });
  const sp = (s) => s.replace(/[  ]/g, ' ');
  const eur = (v) => (v < 0 ? '−' : '') + sp(nf0.format(Math.abs(Math.round(v)))) + ' €';
  const eur2 = (v) => (v < 0 ? '−' : '') + A.eur(Math.abs(v));
  const signe = (v) => (v > 0 ? '+' : '') + eur(v);
  const V = () => A.calc().vue;
  const MOIS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
  const JOURS = ['dim', 'lun', 'mar', 'mer', 'jeu', 'ven', 'sam'];
  const TON = { Loisirs: '#7F77DD', 'Charges variables': '#378ADD', Enveloppes: '#BA7517', fixes: '#8a8780', epargne: '#1baf7a', livret: '#1baf7a', pea: '#7F77DD', tr: '#378ADD' };
  const ICONES = [[/resto|bar|sortie/i, '🍽️'], [/v[eê]tement/i, '👕'], [/tabac/i, '🚬'], [/soin|coiff/i, '💇'], [/carbur|p[ée]age/i, '⛽'], [/course/i, '🛒'],
    [/maison|quotidien/i, '🧺'], [/cadeau/i, '🎁'], [/entretien|voiture|moto/i, '🔧'], [/achat/i, '🛍️'], [/sant/i, '🩺'], [/loyer/i, '🏠'], [/pr[êe]t/i, '🎓'],
    [/assurance/i, '🛡️'], [/sport|salle/i, '🏋️'], [/t[ée]l[ée]phone/i, '📱'], [/salaire/i, '💶'], [/caf\b/i, '🤝'], [/logement/i, '🏘️']];
  const icone = (p) => { const x = ICONES.find(([re]) => re.test(p)); return x ? x[1] : '•'; };
  const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt !== undefined) e.textContent = txt; return e; };
  const ic = (emoji, ton) => { const s = el('span', 'v-ic', emoji); s.style.setProperty('--t', ton || TON.fixes); s.setAttribute('aria-hidden', 'true'); return s; };
  const NS = 'http://www.w3.org/2000/svg';
  const svg = (tag, at, txt) => { const e = document.createElementNS(NS, tag); Object.entries(at || {}).forEach(([k, v]) => e.setAttribute(k, v)); if (txt !== undefined) e.textContent = txt; return e; };
  const moisCourt = (k) => MOIS[Number(k.slice(5, 7)) - 1];
  const de = (m) => (/^[aeiouy]/i.test(m) ? 'd’' : 'de ') + m;

  // Aller aux opérations d'un poste (onglet Données)
  const voirOps = (r) => {
    const st = window.bmSt, v = V();
    Object.assign(st, { poste: r.poste || '', bloc: r.bloc || '', tri: '', sens: 1, mois: r.bloc === 'Enveloppes' || r.bloc === 'Non classé' ? '' : v.mc, depuis: r.bloc === 'Enveloppes' ? v.mc.slice(0, 4) + '-01' : '' });
    const q = $('bm-q'); if (q) q.value = '';
    ['hops', 'fmois', 'fbloc', 'filtre', 'tops', 'fops'].forEach((n) => dash.draw(n));
    document.querySelector('.bm-tab[data-tab="donnees"]').click();
  };
  const onglet = (n) => document.querySelector('.bm-tab[data-tab="' + n + '"]').click();

  // ---------- Donut : ce que tu choisis de dépenser ce mois-ci ----------
  dash.draw('v_donut', (c) => {
    const v = V(), parts = [
      ['Loisirs', v.depense.loisirs, v.prevu.loisirs, TON.Loisirs],
      ['Charges variables', v.depense.variables, v.prevu.variables, TON['Charges variables']],
      ['Enveloppes', v.depense.env, v.prevu.env, TON.Enveloppes]];
    const dep = parts.reduce((s, p) => s + Math.max(0, p[1]), 0), prev = parts.reduce((s, p) => s + p[2], 0);
    const R = 48, C = 2 * Math.PI * R, tot = Math.max(dep, prev, 1);
    const s = svg('svg', { viewBox: '0 0 120 120', role: 'img', 'aria-label': 'Dépensé ' + eur(dep) + ' sur ' + eur(prev) });
    const g = svg('g', { fill: 'none', 'stroke-width': 15, transform: 'rotate(-90 60 60)' });
    g.append(svg('circle', { cx: 60, cy: 60, r: R, stroke: 'var(--cds-chart-grid)' }));
    let off = 0;
    parts.forEach(([, d, , t]) => { const l = Math.max(0, d) / tot * C; if (l > 0.5) g.append(svg('circle', { cx: 60, cy: 60, r: R, stroke: t, 'stroke-dasharray': Math.max(0, l - 1.5) + ' ' + C, 'stroke-dashoffset': -off })); off += l; });
    s.append(g, svg('text', { x: 60, y: 59, 'text-anchor': 'middle', style: 'font:400 19px var(--font-anthropic-serif);fill:' + (dep > prev ? 'var(--color-bad)' : 'var(--color-fg)') }, eur(dep)),
      svg('text', { x: 60, y: 75, 'text-anchor': 'middle', style: 'font:10.5px var(--font-anthropic-sans);fill:var(--color-fg-muted)' }, 'sur ' + eur(prev)));
    const leg = el('div', 'v-leg');
    leg.append(el('div', 'v-lab', 'Dépensé en ' + v.mois_mc.split(' ')[0] + ', au ' + v.auj));
    parts.forEach(([n, d, p, t]) => {
      const r = el('div'), a = el('span'), dot = el('i', 'v-dot'); dot.style.background = t; a.append(dot, n === 'Charges variables' ? 'Variables' : n);
      const b = el('b', d > p ? 'neg' : '', eur(d)); b.append(el('small', '', ' / ' + eur(p))); r.append(a, b); leg.append(r);
    });
    const box = el('div', 'v-donut'); box.append(s, leg);
    c.replaceChildren(box);
  });

  // ---------- Courbe : épargne prévue en fin de mois ----------
  dash.draw('v_courbe', (c) => {
    const v = V(), W = 340, H = 124, x0 = 8, x1 = W - 8, y0 = 14, y1 = H - 22;
    const pts = v.courbe.concat(v.projection), vals = pts.map((p) => p.v).concat([0]);
    const mn = Math.min(...vals), mx = Math.max(...vals), X = (j) => x0 + (x1 - x0) * j / v.nbJours, Y = (y) => y1 - (y1 - y0) * (y - mn) / ((mx - mn) || 1);
    const path = (l) => l.map((p, i) => (i ? 'L' : 'M') + X(p.j).toFixed(1) + ' ' + Y(p.v).toFixed(1)).join(' ');
    const hd = el('div', 'v-head'); hd.append(el('h2', '', 'Épargne prévue fin ' + v.mois_mc.split(' ')[0]), el('span', 'v-pill' + (v.fin < 0 ? ' b' : ''), signe(v.fin)));
    const s = svg('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': 'Épargne prévue en fin de mois : ' + eur(v.fin) });
    s.append(svg('line', { x1: x0, x2: x1, y1: Y(0), y2: Y(0), stroke: 'var(--color-border-line)' }), svg('text', { x: x0, y: Y(0) - 4 }, '0 €'),
      svg('path', { d: path(v.courbe), stroke: 'var(--color-fg)', 'stroke-width': 2.2, fill: 'none', 'stroke-linejoin': 'round' }),
      svg('path', { d: path(v.projection), stroke: 'var(--color-fg)', 'stroke-width': 2, 'stroke-dasharray': '4 4', fill: 'none', opacity: 0.5 }));
    const pe = pts.find((p) => p.j === v.jEnv);
    if (pe) s.append(svg('circle', { cx: X(pe.j), cy: Y(pe.v), r: 3.5, fill: TON.Enveloppes }));
    const aj = v.courbe[v.courbe.length - 1];
    s.append(svg('circle', { cx: X(aj.j), cy: Y(aj.v), r: 4, fill: 'var(--color-fg)' }), svg('text', { x: Math.min(X(aj.j) + 6, x1 - 50), y: Y(aj.v) - 7 }, 'aujourd’hui'),
      svg('circle', { cx: X(v.nbJours), cy: Y(v.fin), r: 4, fill: v.fin < 0 ? 'var(--color-bad)' : 'var(--color-ok)' }),
      svg('text', { x: x0, y: H - 4 }, '1 ' + moisCourt(v.mc)), svg('text', { x: x1, y: H - 4, 'text-anchor': 'end' }, v.nbJours + ' ' + moisCourt(v.mc)));
    const n = el('p', 'bm-note', 'Trait plein : ce qui s’est passé. Pointillé : charges fixes attendues et reste du budget dépensé au rythme prévu. Point orange : part des enveloppes.');
    c.classList.add('v-courbe'); c.replaceChildren(hd, s, n);
  });

  // ---------- Alertes ----------
  dash.draw('v_alertes', (c) => {
    const v = V(), out = [], rythme = v.auj / v.nbJours;
    const al = (cls, emoji, html, bouton, go) => { const d = el('div', 'v-al ' + cls); d.append(el('span', '', emoji)); const t = el('div'); t.innerHTML = html; d.append(t); if (bouton) { const b = el('button', 'bm-btn', bouton); b.type = 'button'; b.onclick = go; d.append(b); } out.push(d); };
    [['Loisirs', v.depense.loisirs, v.prevu.loisirs], ['Variables', v.depense.variables, v.prevu.variables]].forEach(([n, d, p]) => {
      if (p <= 0) return;
      if (d > p) al('b', '🔴', '<b>' + n + ' dépassés de ' + eur(d - p) + '</b>');
      else if (d / p > rythme + 0.15) al('w', '⚠️', '<b>' + n + ' : ' + Math.round(d / p * 100) + ' % dépensés</b>, le mois est à ' + Math.round(rythme * 100) + ' %');
    });
    const k = v.caisse.valeur;
    al(k < 0 ? 'b' : 'ok', '📦', '<b>Caisse des enveloppes ' + signe(k) + '</b>' + (k < 0 ? ' · à combler avec les bons mois' : ' · d’avance pour les grosses dépenses'));
    if (v.epargne.reste > 0) al('w', '💸', '<b>' + eur2(v.epargne.reste) + ' ' + de(v.epargne.mois.split(' ')[0]) + ' à virer</b> sur l’épargne');
    else if (v.epargne.a_virer > 0) al('ok', '✅', 'Épargne ' + de(v.epargne.mois.split(' ')[0]) + ' virée');
    if (v.nc) al('w', '🏷️', '<b>' + v.nc + ' opération' + (v.nc > 1 ? 's' : '') + ' à classer</b>', 'Voir', () => voirOps({ bloc: 'Non classé' }));
    if (v.fixKo.length) al('w', '🧾', '<b>Charges fixes ' + de(v.epargne.mois.split(' ')[0]) + ' à vérifier</b> : ' + v.fixKo.join(', '), 'Voir', () => { $('d-mt').open = true; $('c-fixes').scrollIntoView({ block: 'start' }); });
    c.replaceChildren(...out);
  });

  // ---------- Plafonds par poste ----------
  const ligneJauge = (r, rythme, ton, annuel) => {
    const d = Number(r.depense), s = Number(r.seuil), re = Number(r.reste), p = s > 0 ? d / s : d > 0 ? 2 : 0;
    const row = el('div', 'v-r clic'); row.tabIndex = 0; row.setAttribute('role', 'button'); row.title = 'Voir les opérations : ' + r.poste;
    row.onclick = () => voirOps(r); row.onkeydown = (e) => { if (e.key === 'Enter') voirOps(r); };
    const mid = el('div'); mid.append(r.poste, el('small', '', re < 0 ? 'dépassé de ' + eur(-re) : 'reste ' + eur(re)));
    const t = el('div', 'v-t'), i = el('i'); i.style.width = Math.min(100, p * 100) + '%';
    i.style.background = re < 0 ? 'var(--color-bad)' : p > rythme + 0.15 ? 'var(--color-warn)' : ton;
    const m = el('b'); m.style.left = Math.min(99, rythme * 100) + '%'; t.append(i, m); mid.append(t);
    row.append(ic(icone(r.poste), ton), mid, el('span', 'v-n' + (re < 0 ? ' neg' : ''), eur(d) + ' / ' + eur(s) + (annuel ? ' par an' : '')));
    return row;
  };
  dash.draw('v_plafonds', (c) => {
    const v = V(), rythme = v.auj / v.nbJours, an = (Number(v.mc.slice(5, 7)) - 1 + rythme) / 12;
    const h = el('h2', '', 'Mes plafonds');
    const rows = v.postes.map((r) => ligneJauge(r, rythme, TON[r.bloc]));
    const h2 = el('div', 'v-lab', 'Enveloppes de ' + v.mc.slice(0, 4) + ' (payées par la caisse)'); h2.style.marginTop = '8px';
    const env = v.enveloppes.map((r) => ligneJauge(r, an, TON.Enveloppes, true));
    c.replaceChildren(h, ...rows, h2, ...env, el('p', 'bm-note', 'Le trait noir montre où tu devrais en être aujourd’hui. Touche un poste pour voir ses opérations.'));
  });

  // ---------- À venir ----------
  dash.draw('v_avenir', (c) => {
    const v = V(), y = Number(v.mc.slice(0, 4)), m = Number(v.mc.slice(5, 7));
    const rows = v.aVenir.map((a) => {
      const r = el('div', 'v-r'), d = el('span', 'v-date', JOURS[new Date(Date.UTC(y, m - 1, a.jour)).getUTCDay()]); d.append(el('b', '', a.jour));
      const mid = el('div'); mid.append(a.libelle, el('small', '', a.detail));
      r.append(d, mid, el('span', 'v-n' + (a.montant > 0 ? ' pos' : ''), signe(a.montant))); return r;
    });
    c.replaceChildren(el('h2', '', 'À venir en ' + v.mois_mc.split(' ')[0]), ...(rows.length ? rows : [el('p', 'bm-note', 'Plus rien de prévu ce mois-ci.')]));
  });

  dash.draw('v_mt_resume', (s) => {
    const v = V();
    s.textContent = (v.epargne.a_virer > 0 ? signe(v.epargne.a_virer) + ' d’épargne' : 'rien à épargner') + ' · ' + (v.fixKo.length ? v.fixKo.length + ' charge' + (v.fixKo.length > 1 ? 's' : '') + ' fixe à vérifier' : 'charges fixes conformes');
  });

  // ---------- Je veux acheter… ----------
  const dAch = A.dialogue('<h2>Je veux acheter…</h2><label for="ach-m">Montant (€)</label><input id="ach-m" inputmode="decimal" autocomplete="off">' +
    '<label for="ach-p">Dans quelle catégorie ?</label><select id="ach-p"></select><div class="v-rep" id="ach-r"></div>' +
    '<div class="row"><button class="app-btn primary" value="fermer">Fermer</button></div>', () => {});
  const repondre = () => {
    const v = V(), m = Number(String($('ach-m').value).replace(/\s/g, '').replace(',', '.')), [type, id] = $('ach-p').value.split('|'), r = $('ach-r');
    if (!(m > 0)) { r.replaceChildren(el('p', 'bm-note', 'Tape un montant.')); return; }
    const P = (t) => { const p = el('p'); p.innerHTML = t; return p; };
    const out = [];
    if (type === 'mois') {
      const l = v.postes.find((x) => x.id === id), reste = Number(l.reste);
      if (m <= reste) out.push(P('✅ <b>Oui.</b> Payé par ton budget ' + l.poste + ' : il restera <b>' + eur(reste - m) + '</b> ce mois-ci.'));
      else {
        const dep = m - Math.max(0, reste), autres = v.postes.filter((x) => x.id !== id).reduce((s, x) => s + Math.max(0, Number(x.reste)), 0);
        out.push(P('⚠️ <b>Ça dépasse ' + l.poste + ' de ' + eur(dep) + '.</b>'));
        out.push(P('Soit tu compenses sur tes autres postes (il y reste ' + eur(autres) + ' ce mois-ci), soit ton épargne de fin de mois passe de ' + eur(v.fin) + ' à <b>' + eur(v.fin - dep) + '</b>.'));
        if (v.fin - dep < 0) out.push(P('Le mois finirait en négatif : ce sera déduit de l’épargne du mois prochain.'));
      }
    } else {
      const l = v.enveloppes.find((x) => x.id === id), reste = Number(l.reste), k = v.caisse.valeur;
      out.push(m <= reste ? P('✅ <b>Prévu dans l’enveloppe ' + l.poste + '</b> : il restera ' + eur(reste - m) + ' pour ' + v.mc.slice(0, 4) + '.')
        : P('⚠️ <b>Ça dépasse l’enveloppe ' + l.poste + ' de ' + eur(m - Math.max(0, reste)) + '</b> pour ' + v.mc.slice(0, 4) + '.'));
      out.push(P('Caisse des enveloppes : ' + signe(k) + ' → <b>' + signe(k - m) + '</b>.' + (k - m < 0 ? ' Le trou serait à combler avec les bons mois (prime, mois sous le budget).' : '')));
    }
    r.replaceChildren(...out);
  };
  $('v-acheter').onclick = () => {
    const v = V(), sel = $('ach-p'); sel.replaceChildren();
    const grp = (lab, l, type) => { const g = el('optgroup'); g.label = lab; l.forEach((r) => g.append(new Option(r.poste, type + '|' + r.id))); sel.append(g); };
    grp('Budget du mois', v.postes, 'mois'); grp('Enveloppes de l’année', v.enveloppes, 'env');
    $('ach-m').value = ''; repondre(); dAch.showModal(); $('ach-m').focus();
  };
  $('ach-m').addEventListener('input', repondre); $('ach-p').addEventListener('change', repondre);

  // ---------- Dans la durée ----------
  let serie = 'net';
  dash.draw('v_pat', (c) => {
    const p = V().patrimoine, out = [];
    const chips = el('div', 'v-chips');
    [['net', 'Net'], ['brut', 'Ce que j’ai'], ['dette', 'Ce que je dois']].forEach(([k, t]) => { const b = el('button', '', t); b.type = 'button'; b.setAttribute('aria-pressed', String(serie === k)); b.onclick = () => { serie = k; dash.draw('v_pat'); }; chips.append(b); });
    out.push(chips);
    const lib = { net: 'Patrimoine net', brut: 'Ce que j’ai', dette: 'Prêt restant' }[serie];
    const val = serie === 'net' ? p.net : serie === 'brut' ? p.brut : -(p.dette || 0);
    out.push(el('div', 'v-lab', lib), el('div', 'v-big' + (val < 0 ? ' neg' : ''), eur(val)));
    const pts = p.courbe;
    if (pts.length > 1) {
      const d0 = serie === 'dette' ? -pts[0].dette : pts[0][serie], dv = val - d0;
      out.push(el('span', 'v-pill' + (dv < 0 ? ' b' : ''), (dv >= 0 ? '▲ ' : '▼ ') + eur(Math.abs(dv)) + ' depuis fin ' + moisCourt(pts[0].mois)));
      const W = 340, H = 120, x0 = 8, x1 = W - 8, y0 = 10, y1 = H - 20, ys = pts.map((q) => (serie === 'dette' ? -q.dette : q[serie]));
      const mn = Math.min(...ys), mx = Math.max(...ys), X = (i) => x0 + (x1 - x0) * i / (pts.length - 1), Y = (y) => y1 - (y1 - y0) * (y - mn) / ((mx - mn) || 1);
      const ton = serie === 'dette' ? 'var(--color-bad)' : TON.epargne, l = ys.map((y, i) => (i ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(y).toFixed(1)).join(' ');
      const s = svg('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': lib + ' mois par mois' });
      s.append(svg('path', { d: l + ` L${x1} ${y1} L${x0} ${y1} Z`, fill: ton, opacity: 0.12 }), svg('path', { d: l, stroke: ton, 'stroke-width': 2.5, fill: 'none', 'stroke-linejoin': 'round' }),
        svg('circle', { cx: X(pts.length - 1), cy: Y(ys[ys.length - 1]), r: 4, fill: ton }));
      const pas = Math.ceil(pts.length / 6);
      pts.forEach((q, i) => { if (i % pas === 0 || i === pts.length - 1) s.append(svg('text', { x: X(i), y: H - 4, 'text-anchor': i === 0 ? 'start' : i === pts.length - 1 ? 'end' : 'middle' }, moisCourt(q.mois))); });
      const box = el('div', 'v-pat'); box.append(s); out.push(box);
    }
    if (!p.complet) {
      const n = el('p', 'bm-note', 'Complète tes placements (Livret A, PEA, Trade Republic, prêt) pour un patrimoine juste. ');
      const b = el('button', 'bm-btn', 'Règles › Placements'); b.type = 'button'; b.onclick = () => onglet('regles'); n.append(b); out.push(n);
    } else out.push(el('p', 'bm-note', 'Le PEA compte pour sa dernière valeur saisie, mois après mois. Mets-la à jour quand tu veux.'));
    c.replaceChildren(...out);
  });

  dash.draw('v_repart', (c) => {
    const v = V(), p = v.patrimoine, out = [el('h2', '', 'Où est l’argent')];
    const blocs = [['livret', 'Livret A', p.livret, ''], ['pea', 'PEA', p.pea, p.pea_date ? 'au ' + p.pea_date.slice(0, 5) + ' · modifier' : 'à saisir'], ['tr', 'Trade Republic', p.tr, p.tr_date ? 'au ' + p.tr_date.slice(0, 5) : 'à importer']];
    const tot = blocs.reduce((s, b) => s + Math.max(0, b[2] || 0), 0);
    if (tot > 0) {
      const tree = el('div', 'v-tree');
      blocs.forEach(([k, n, x, sub]) => {
        const d = el('div'); d.style.flex = String(Math.max(0.22, (x || 0) / tot)); d.style.background = TON[k];
        d.append(n, el('b', '', x === null ? '—' : eur(x))); if (sub) d.append(el('small', '', sub));
        d.onclick = () => placer(k); tree.append(d);
      });
      out.push(tree);
    }
    const pret = el('div', 'v-r clic'); pret.onclick = () => placer('pret');
    const mid = el('div'); mid.append('Prêt restant', el('small', '', p.fin_pret ? 'fin en ' + p.fin_pret : 'à saisir'));
    pret.append(ic('🎓', TON.fixes), mid, el('span', 'v-n neg', p.dette === null ? '—' : eur(-p.dette)));
    out.push(pret);
    const spots = el('div', 'v-spots'), k = v.caisse.valeur;
    const spot = (cls, t, b, s) => { const d = el('div', 'v-spot ' + cls, t); d.append(el('b', '', b), el('small', '', s)); spots.append(d); };
    spot(p.matelas >= 3 ? 'ok' : 'b', '🛟 Matelas', String(p.matelas).replace('.', ',') + ' mois', 'de dépenses normales (Livret A et Trade Republic)');
    spot(k < 0 ? 'b' : 'ok', '📦 Caisse des enveloppes', signe(k), 'depuis ' + v.caisse.depuis);
    out.push(spots);
    c.replaceChildren(...out);
  });

  // ---------- Placements : saisie ----------
  const nombre = (x) => Number(String(x).replace(/\s/g, '').replace(',', '.'));
  const auj = () => new Date().toISOString().slice(0, 10);
  let enCours = null;
  const dPl = A.dialogue('<h2 id="pl-titre"></h2><p id="pl-aide"></p><div id="pl-champs" style="display:grid;gap:8px"></div>' + A.boutons('Enregistrer'), () => {
    const b = A.bundle(), P = Object.assign({}, b.patrimoine), val = (i) => nombre($('pl-' + i).value);
    if (enCours === 'livret') { if (!(val(0) >= 0)) return A.msg('Montant invalide.', true); P.livret = { valeur: val(0), date: auj() }; }
    else if (enCours === 'pea') { if (!(val(0) >= 0)) return A.msg('Montant invalide.', true); P.pea = (P.pea || []).filter((x) => x.date !== auj()).concat([{ date: auj(), valeur: val(0) }]); }
    else if (enCours === 'tr') { if (!isFinite(val(0))) return A.msg('Montant invalide.', true); const fins = Object.assign({}, P.tr && P.tr.fins); fins[auj().slice(0, 7)] = val(0); P.tr = { date: auj(), solde: val(0), fins }; }
    else if (enCours === 'pret') {
      const d = $('pl-3').value.trim();
      if (!(val(0) >= 0) || !(val(1) >= 0) || !(val(2) > 0) || (d && !/^\d{4}-\d\d$/.test(d))) return A.msg('Valeurs du prêt invalides : rien n’a été changé.', true);
      P.pret = { capital: val(0), taux: val(1), mensualite: val(2), date: auj(), debut: d || undefined };
    }
    A.maj(Object.assign({}, b, { patrimoine: P }), 'Placements mis à jour.');
  });
  const champ = (i, lab, v, mode) => '<label for="pl-' + i + '">' + lab + '</label><input id="pl-' + i + '" ' + (mode === 'texte' ? 'type="text"' : 'inputmode="decimal"') + ' autocomplete="off" value="' + (v === undefined || v === null ? '' : String(v).replace('.', ',')) + '">';
  const placer = (k) => {
    const P = A.bundle().patrimoine || {}, p = V().patrimoine; enCours = k;
    const T = {
      livret: ['Livret A', 'Valeur aujourd’hui. Ensuite, l’appli suit seule les virements depuis et vers le livret.', champ(0, 'Valeur (€)', p.livret)],
      pea: ['PEA', 'Valeur affichée dans ton appli de bourse aujourd’hui.', champ(0, 'Valeur (€)', p.pea)],
      tr: ['Trade Republic', 'Le plus simple : importe l’export CSV de Trade Republic (bouton Importer). Sinon, tape le solde espèces.', champ(0, 'Solde espèces (€)', p.tr)],
      pret: ['Prêt étudiant', 'Capital restant dû aujourd’hui, d’après ton tableau d’amortissement.', champ(0, 'Capital restant (€)', p.dette) + champ(1, 'Taux annuel (%)', P.pret && P.pret.taux) + champ(2, 'Mensualité (€)', P.pret && P.pret.mensualite) + champ(3, 'Mois du déblocage (AAAA-MM, facultatif)', P.pret && P.pret.debut, 'texte')]
    }[k];
    $('pl-titre').textContent = T[0]; $('pl-aide').textContent = T[1]; $('pl-champs').innerHTML = T[2];
    dPl.showModal();
  };

  // ---------- Règles ----------
  dash.draw('v_barre', (c) => {
    const n = V().normal, parts = [['Charges fixes', n.fixes, TON.fixes], ['Variables', n.variables, TON['Charges variables']], ['Enveloppes', n.env, TON.Enveloppes], ['Loisirs', n.loisirs, TON.Loisirs], ['Épargne', Math.max(0, n.epargne), TON.epargne]];
    const tot = parts.reduce((s, p) => s + p[1], 0) || 1;
    const card = el('div', 'bm-card'), bar = el('div', 'v-barre'), leg = el('div', 'v-legende');
    parts.forEach(([t, x, ton]) => { const i = el('i'); i.style.width = x / tot * 100 + '%'; i.style.background = ton; bar.append(i); const s = el('span'), d = el('i', 'v-dot'); d.style.background = ton; s.append(d, t + ' ' + eur(x)); leg.append(s); });
    card.append(el('div', 'v-lab', 'Un mois normal · ' + eur(n.revenus) + ' de revenus'), bar, leg);
    c.replaceChildren(card);
  });
  dash.draw('v_normal', (c) => {
    const b = A.bundle(), n = V().normal, refs = b.references;
    const groupe = (type, titre, emoji, ton, total, sous) => {
      const d = el('details'), s = el('summary'), l = el('span', 'v-l', titre); if (sous) l.append(el('small', '', sous));
      s.append(ic(emoji, ton), l, el('span', 'v-v', total), el('span', 'v-chev', '›')); d.append(s);
      const inn = el('div', 'v-in');
      refs.filter((r) => r.type === type).forEach((r) => {
        const row = el('div', 'v-r clic'); row.dataset.ref = r.id; row.title = 'Modifier ' + r.poste;
        const mid = el('div'); mid.append(r.poste); if (r.note) mid.append(el('small', '', r.note));
        row.append(mid, el('span', 'v-n', eur2(Number(r.montant)) + (type === 'Enveloppe annuelle' ? ' / an' : '') + ' ✏️'));
        inn.append(row);
      });
      d.append(inn); return d;
    };
    const ep = el('div', 'v-row'), l = el('span', 'v-l', 'Épargne prévue'); l.append(el('small', '', 'ce qui reste d’un mois normal'));
    ep.append(ic('💰', TON.epargne), l, el('span', 'v-v', eur(n.epargne)));
    c.replaceChildren(
      groupe('Revenu', 'Revenus', '💶', TON.epargne, eur(n.revenus)),
      groupe('Charge fixe', 'Charges fixes', '🏠', TON.fixes, eur(n.fixes)),
      groupe('Charge variable', 'Charges variables', '🛒', TON['Charges variables'], eur(n.variables)),
      groupe('Enveloppe annuelle', 'Enveloppes', '🎁', TON.Enveloppes, eur(n.env) + ' / mois', eur(n.env * 12) + ' par an'),
      groupe('Loisir', 'Loisirs', '🎉', TON.Loisirs, eur(n.loisirs), 'mois normal, le budget du mois suit les revenus'),
      ep);
  });
  dash.draw('v_nperso', (s) => { s.textContent = String(((A.bundle() || {}).regles_perso || []).length); });
  dash.draw('v_placements', (c) => {
    const p = V().patrimoine;
    const row = (k, emoji, ton, t, sous, v) => { const b = el('button', 'v-row'); b.type = 'button'; const l = el('span', 'v-l', t); l.append(el('small', '', sous)); b.append(ic(emoji, ton), l, el('span', 'v-v', v), el('span', 'v-chev', '›')); b.onclick = () => placer(k); return b; };
    c.replaceChildren(
      row('livret', '🏦', TON.livret, 'Livret A', p.livret === null ? 'à saisir une fois' : 'suivi avec les virements', p.livret === null ? '—' : eur(p.livret)),
      row('pea', '📈', TON.pea, 'Valeur du PEA', p.pea_date ? 'saisie le ' + p.pea_date : 'à saisir', p.pea === null ? '—' : eur(p.pea)),
      row('tr', '💶', TON.tr, 'Trade Republic', p.tr_date ? 'solde au ' + p.tr_date : 'importe son export CSV', p.tr === null ? '—' : eur(p.tr)),
      row('pret', '🎓', TON.fixes, 'Prêt étudiant', p.fin_pret ? 'fin en ' + p.fin_pret : 'à saisir une fois', p.dette === null ? '—' : eur(-p.dette)));
  });
  dash.draw('v_sauve', (s) => { const d = (A.bundle() || {}).sauvegarde_le; s.textContent = d ? 'Dernière : ' + new Date(d).toLocaleDateString('fr-FR') : 'Jamais sauvegardé'; });
  $('v-sauver').onclick = () => Promise.resolve(A.sauvegarder()).then(() => dash.draw('v_sauve'));
})();
