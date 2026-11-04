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
  const TON = { Loisirs: '#7F77DD', 'Charges variables': '#378ADD', Enveloppes: '#BA7517', fixes: '#8a8780', epargne: '#1baf7a', livret: '#1baf7a', pea: '#7F77DD', tr: '#378ADD', ok: 'var(--color-ok)', w: 'var(--color-warn)', b: 'var(--color-bad)' };

  // Icônes au trait, une seule famille pour toute l'appli (24 × 24, trait de 2)
  const SVG_IC = {
    resto: '<path d="M7 3v8M5 3v4a2 2 0 0 0 4 0V3M7 11v10M17 3c-2 1-3 3-3 6v3h3v9"/>',
    vetement: '<path d="M8 3 4 6l2 4 2-1v12h8V9l2 1 2-4-4-3a4 4 0 0 1-8 0Z"/>',
    tabac: '<path d="M3 15h13v3H3zM19 15v3M21 15v3M17 11c0-2 2-2 2-4s-2-2-2-4"/>',
    ciseaux: '<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M8.5 8.5 20 20M8.5 15.5 20 4"/>',
    carburant: '<path d="M4 21V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16M3 21h12M4 10h10M14 8h2a2 2 0 0 1 2 2v6a1.5 1.5 0 0 0 3 0V9l-3-3"/>',
    panier: '<path d="M3 4h2l2.4 10.2a1 1 0 0 0 1 .8h8.8a1 1 0 0 0 1-.8L20 7H6.2"/><circle cx="9" cy="19" r="1.4"/><circle cx="17" cy="19" r="1.4"/>',
    maison: '<path d="M3 11 12 4l9 7"/><path d="M5 10v10h14V10"/>',
    cadeau: '<rect x="3" y="8" width="18" height="5" rx="1"/><path d="M5 13v8h14v-8M12 8v13M12 8S10 3 7.5 4.5 9 8 12 8Zm0 0s2-5 4.5-3.5S15 8 12 8Z"/>',
    cle: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.8-3.8a6 6 0 0 1-7.9 7.9l-6.9 6.9a2.1 2.1 0 0 1-3-3l6.9-6.9a6 6 0 0 1 7.9-7.9z"/>',
    sac: '<path d="M6 7h12l1 14H5Z"/><path d="M9 10V6a3 3 0 0 1 6 0v4"/>',
    sante: '<path d="M20.8 8.6a5 5 0 0 0-8.8-3.2 5 5 0 0 0-8.8 3.2c0 5.4 8.8 11.4 8.8 11.4s8.8-6 8.8-11.4Z"/>',
    diplome: '<path d="M2 9l10-5 10 5-10 5Z"/><path d="M6 11v5c3 2 9 2 12 0v-5"/>',
    bouclier: '<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6Z"/>',
    haltere: '<path d="M6 7v10M3 9v6M18 7v10M21 9v6M6 12h12"/>',
    telephone: '<rect x="7" y="2" width="10" height="20" rx="2"/><path d="M11 18h2"/>',
    billet: '<rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6 10v4M18 10v4"/>',
    banque: '<path d="M3 10 12 4l9 6M5 10v8M9.5 10v8M14.5 10v8M19 10v8M3 20h18"/>',
    hausse: '<path d="M3 17l6-6 4 4 8-8"/><path d="M15 7h6v6"/>',
    portefeuille: '<path d="M19 7V5a2 2 0 0 0-2-2H5a2 2 0 0 0 0 4h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5"/><circle cx="16.5" cy="14" r="1"/>',
    pieces: '<circle cx="9" cy="9" r="6"/><path d="M15.5 9.5a6 6 0 1 1-6 6"/>',
    caisse: '<path d="M3 7l9-4 9 4v10l-9 4-9-4Z"/><path d="M3 7l9 4 9-4M12 11v10"/>',
    bouee: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4"/><path d="M5.6 5.6l3.6 3.6M14.8 14.8l3.6 3.6M18.4 5.6l-3.6 3.6M9.2 14.8l-3.6 3.6"/>',
    alerte: '<path d="M12 3 2 20h20Z"/><path d="M12 10v4M12 17h.01"/>',
    ok: '<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
    baisse: '<path d="M12 4v16M6 14l6 6 6-6"/>',
    envoi: '<path d="M7 17 17 7M8 7h9v9"/>',
    etiquette: '<path d="M3 3h8l10 10-8 8L3 11Z"/><circle cx="7.5" cy="7.5" r="1.5"/>',
    recu: '<path d="M5 3h14v18l-3-2-2 2-2-2-2 2-2-2-3 2Z"/><path d="M9 8h6M9 12h6"/>',
    liste: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
    etincelle: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18"/>',
    calcul: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8M8 12h1M12 12h1M16 12h0M8 16h1M12 16h1"/>',
    disque: '<path d="M5 3h11l3 3v15H5Z"/><path d="M8 3v5h7V3M8 21v-7h8v7"/>',
    point: '<circle cx="12" cy="12" r="3"/>'
  };
  const ICONES = [[/resto|bar|sortie/i, 'resto'], [/v[eê]tement/i, 'vetement'], [/tabac/i, 'tabac'], [/soin|coiff/i, 'ciseaux'], [/carbur|p[ée]age/i, 'carburant'], [/course/i, 'panier'],
    [/maison|quotidien/i, 'maison'], [/cadeau/i, 'cadeau'], [/entretien|voiture|moto/i, 'cle'], [/achat/i, 'sac'], [/sant/i, 'sante'], [/loyer|logement/i, 'maison'], [/pr[êe]t/i, 'diplome'],
    [/assurance/i, 'bouclier'], [/sport|salle/i, 'haltere'], [/t[ée]l[ée]phone/i, 'telephone'], [/salaire|caf\b/i, 'billet']];
  const icone = (p) => { const x = ICONES.find(([re]) => re.test(p)); return x ? x[1] : 'point'; };
  const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt !== undefined) e.textContent = txt; return e; };
  const dessin = (nom, taille) => { const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('width', taille || 18); s.setAttribute('height', taille || 18); s.setAttribute('fill', 'none'); s.setAttribute('stroke', 'currentColor'); s.setAttribute('stroke-width', '2'); s.setAttribute('stroke-linecap', 'round'); s.setAttribute('stroke-linejoin', 'round'); s.setAttribute('aria-hidden', 'true'); s.innerHTML = SVG_IC[nom] || SVG_IC.point; return s; };
  const ic = (nom, ton) => { const s = el('span', 'v-ic'); s.style.setProperty('--t', ton || TON.fixes); s.setAttribute('aria-hidden', 'true'); s.append(dessin(nom)); return s; };
  // Icônes posées dans la page (onglet Règles)
  document.querySelectorAll('[data-icone]').forEach((s) => s.replaceChildren(dessin(s.dataset.icone)));
  const NS = 'http://www.w3.org/2000/svg';
  const svg = (tag, at, txt) => { const e = document.createElementNS(NS, tag); Object.entries(at || {}).forEach(([k, v]) => e.setAttribute(k, v)); if (txt !== undefined) e.textContent = txt; return e; };
  const moisCourt = (k) => MOIS[Number(k.slice(5, 7)) - 1];
  const de = (m) => (/^[aeiouy]/i.test(m) ? 'd’' : 'de ') + m;
  // Texte riche sans HTML : chaînes en texte simple, [texte] en gras
  const riche = (tag, parts) => { const e = el(tag); parts.forEach((x) => e.append(Array.isArray(x) ? el('b', '', x[0]) : x)); return e; };

  // Aller aux opérations d'un poste (onglet Données)
  const voirOps = (r) => {
    const st = window.bmSt, v = V();
    Object.assign(st, { poste: r.poste || '', bloc: r.bloc || '', tri: '', sens: 1, mois: r.bloc === 'Enveloppes' || r.bloc === 'Non classé' ? '' : v.mc, depuis: r.bloc === 'Enveloppes' ? v.mc.slice(0, 4) + '-01' : '' });
    const q = $('bm-q'); if (q) q.value = '';
    ['hops', 'fmois', 'fbloc', 'filtre', 'tops', 'fops'].forEach((n) => dash.draw(n));
    document.querySelector('.bm-tab[data-tab="donnees"]').click();
  };
  const onglet = (n) => document.querySelector('.bm-tab[data-tab="' + n + '"]').click();

  // ---------- Donut : ce qu'il reste à dépenser ce mois-ci ----------
  dash.draw('v_donut', (c) => {
    const v = V(), parts = [
      ['Loisirs', v.depense.loisirs, v.prevu.loisirs, TON.Loisirs],
      ['Charges variables', v.depense.variables, v.prevu.variables, TON['Charges variables']],
      ['Enveloppes', v.depense.env, v.prevu.env, TON.Enveloppes]];
    const dep = parts.reduce((s, p) => s + Math.max(0, p[1]), 0), prev = parts.reduce((s, p) => s + p[2], 0), reste = prev - dep;
    const R = 48, C = 2 * Math.PI * R, tot = Math.max(dep, prev, 1);
    const s = svg('svg', { viewBox: '0 0 120 120', role: 'img', 'aria-label': (reste < 0 ? 'Dépassé de ' + eur(-reste) : 'Reste ' + eur(reste)) + ' sur ' + eur(prev) });
    const g = svg('g', { fill: 'none', 'stroke-width': 14, transform: 'rotate(-90 60 60)' });
    g.append(svg('circle', { cx: 60, cy: 60, r: R, stroke: 'var(--cds-chart-grid)' }));
    let off = 0;
    parts.forEach(([, d, , t]) => { const l = Math.max(0, d) / tot * C; if (l > 0.5) g.append(svg('circle', { cx: 60, cy: 60, r: R, stroke: t, 'stroke-dasharray': Math.max(0, l - 1.5) + ' ' + C, 'stroke-dashoffset': -off })); off += l; });
    s.append(g, svg('text', { x: 60, y: 48, 'text-anchor': 'middle', style: 'font:12px var(--font-anthropic-sans);fill:var(--color-fg-muted)' }, reste < 0 ? 'Dépassé' : 'Reste'),
      svg('text', { x: 60, y: 69, 'text-anchor': 'middle', style: 'font:400 20px var(--font-anthropic-serif);fill:' + (reste < 0 ? 'var(--color-bad)' : 'var(--color-fg)') }, eur(Math.abs(reste))),
      svg('text', { x: 60, y: 85, 'text-anchor': 'middle', style: 'font:12px var(--font-anthropic-sans);fill:var(--color-fg-muted)' }, 'sur ' + eur(prev)));
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
    const v = V(), W = 340, H = 136, x0 = 8, x1 = W - 8, y0 = 18, y1 = H - 26;
    const pts = v.courbe.concat(v.projection), vals = pts.map((p) => p.v).concat([0]);
    const mn = Math.min(...vals), mx = Math.max(...vals), X = (j) => x0 + (x1 - x0) * j / v.nbJours, Y = (y) => y1 - (y1 - y0) * (y - mn) / ((mx - mn) || 1);
    const path = (l) => l.map((p, i) => (i ? 'L' : 'M') + X(p.j).toFixed(1) + ' ' + Y(p.v).toFixed(1)).join(' ');
    const hd = el('div', 'v-head'); hd.append(el('h2', '', 'Épargne prévue fin ' + v.mois_mc.split(' ')[0]), el('span', 'v-pill' + (v.fin < 0 ? ' b' : ''), signe(v.fin)));
    const s = svg('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': 'Épargne prévue en fin de mois : ' + eur(v.fin) });
    s.append(svg('line', { x1: x0, x2: x1, y1: Y(0), y2: Y(0), stroke: 'var(--color-border-line)' }), svg('text', { x: x0, y: Y(0) - 5 }, '0 €'),
      svg('path', { d: path(v.courbe), stroke: 'var(--color-fg)', 'stroke-width': 2.2, fill: 'none', 'stroke-linejoin': 'round' }),
      svg('path', { d: path(v.projection), stroke: 'var(--color-fg)', 'stroke-width': 2, 'stroke-dasharray': '4 4', fill: 'none', opacity: 0.5 }));
    const pe = pts.find((p) => p.j === v.jEnv);
    if (pe) s.append(svg('circle', { cx: X(pe.j), cy: Y(pe.v), r: 3.5, fill: TON.Enveloppes }));
    const aj = v.courbe[v.courbe.length - 1], xa = X(aj.j);
    s.append(svg('circle', { cx: xa, cy: Y(aj.v), r: 4, fill: 'var(--color-fg)' }),
      svg('text', { x: xa > W / 2 ? xa - 8 : xa + 8, y: Math.max(12, Y(aj.v) - 8), 'text-anchor': xa > W / 2 ? 'end' : 'start' }, 'aujourd’hui'),
      svg('circle', { cx: X(v.nbJours), cy: Y(v.fin), r: 4, fill: v.fin < 0 ? 'var(--color-bad)' : 'var(--color-ok)' }),
      svg('text', { x: x0, y: H - 5 }, '1 ' + moisCourt(v.mc)), svg('text', { x: x1, y: H - 5, 'text-anchor': 'end' }, v.nbJours + ' ' + moisCourt(v.mc)));
    const n = el('p', 'bm-note', 'Trait plein : ce qui s’est passé. Pointillé : charges fixes attendues et reste du budget au rythme prévu. Point orange : part des enveloppes.');
    c.classList.add('v-courbe'); c.replaceChildren(hd, s, n);
  });

  // ---------- Alertes : ce qui demande une décision, en tête de page ----------
  dash.draw('v_alertes', (c) => {
    const v = V(), out = [], rythme = v.auj / v.nbJours;
    const al = (cls, nom, parts, bouton, go) => {
      const d = el('div', 'v-al ' + cls), i = el('span', 'v-al-ic'); i.append(dessin(nom, 16)); d.append(i, riche('div', parts));
      if (bouton) { const b = el('button', 'bm-btn', bouton); b.type = 'button'; b.onclick = go; d.append(b); }
      out.push(d);
    };
    [['Loisirs', v.depense.loisirs, v.prevu.loisirs], ['Variables', v.depense.variables, v.prevu.variables]].forEach(([n, d, p]) => {
      if (p <= 0) return;
      if (d > p) al('b', 'alerte', [[n + ' dépassés de ' + eur(d - p)]]);
      else if (d / p > rythme + 0.15) al('w', 'alerte', [[n + ' : ' + Math.round(d / p * 100) + ' % dépensés'], ', le mois est à ' + Math.round(rythme * 100) + ' %']);
    });
    const k = v.caisse.valeur, e = v.epargne, mt = e.mois.split(' ')[0];
    al(k < 0 ? 'b' : 'ok', 'caisse', [['Caisse des enveloppes ' + signe(k)], k < 0 ? ' · sera retiré de l’épargne ' + de(v.mois_mc.split(' ')[0]) : ' · d’avance pour les grosses dépenses']);
    if (e.manque > 0) al('b', 'baisse', [[mt.charAt(0).toUpperCase() + mt.slice(1) + ' fini à −' + eur2(e.manque)], ', pris sur ton coussin' + (e.laisse ? ' · laissé filer' : ' · reporté sur le mois suivant')], 'Voir', () => { $('d-mt').open = true; $('c-virement').scrollIntoView({ block: 'start' }); });
    const cs = v.coussin.dernier;
    if (cs && (v.coussin.sous_seuil || v.coussin.baisse)) al(v.coussin.sous_seuil ? 'b' : 'w', 'bouee', [['Coussin du compte : ' + eur(cs.solde)], ' la veille du salaire (' + cs.jour.slice(0, 5) + ')' + (cs.ecart !== null && cs.ecart < 0 ? ', ' + eur(cs.ecart) + ' en un mois' : '') + (v.coussin.sous_seuil ? ', sous ton minimum de ' + eur(v.coussin.seuil) : '')], 'Voir', () => onglet('duree'));
    if (e.reste > 0) al('w', 'envoi', [[eur2(e.reste) + ' ' + de(mt) + ' à virer'], ' sur l’épargne']);
    else if (e.a_virer > 0) al('ok', 'ok', ['Épargne ' + de(mt) + ' virée']);
    if (v.nc) al('w', 'etiquette', [[v.nc + ' opération' + (v.nc > 1 ? 's' : '') + ' à classer']], 'Voir', () => voirOps({ bloc: 'Non classé' }));
    if (v.fixKo.length) al('w', 'recu', [['Charges fixes ' + de(mt) + ' à vérifier'], ' : ' + v.fixKo.join(', ')], 'Voir', () => { $('d-mt').open = true; $('c-fixes').scrollIntoView({ block: 'start' }); });
    c.replaceChildren(...out);
  });

  // ---------- Mois fini dans le négatif : reporter ou laisser filer ----------
  dash.draw('v_vir_choix', (c) => {
    const e = V().epargne;
    if (!(e.manque > 0)) { c.replaceChildren(); return; }
    const b = el('button', 'bm-btn', e.laisse ? 'Finalement, le reporter sur le mois suivant' : 'Laisser filer (accepter qu’il soit pris sur le coussin)');
    b.type = 'button';
    b.onclick = () => {
      const bu = A.bundle(), l = Object.assign({}, bu.deficits_laisses || {});
      if (e.laisse) delete l[e.cle]; else l[e.cle] = true;
      A.maj(Object.assign({}, bu, { deficits_laisses: l }), e.laisse ? 'Le manque sera reporté sur le mois suivant.' : 'Manque laissé filer : rien n’est reporté.');
    };
    c.replaceChildren(b);
  });

  // ---------- Coussin : solde du compte courant la veille de chaque salaire ----------
  dash.draw('v_coussin', (c) => {
    const k = V().coussin, out = [el('h2', '', 'Coussin du compte courant')];
    if (!k.liste.length) {
      out.push(el('p', 'bm-note', 'Importe un export Boursobank récent : son solde après chaque opération permet de suivre le coussin.'));
      c.replaceChildren(...out); return;
    }
    out.push(el('p', 'bm-note', 'Solde la veille de chaque salaire, c’est-à-dire ce qui reste quand le mois budgétaire se termine. S’il baisse, tu vis sur ton coussin.'));
    const mx = Math.max(...k.liste.map((x) => x.solde), k.seuil, 1);
    k.liste.slice().reverse().forEach((x) => {
      const r = el('div', 'v-r'), mid = el('div');
      mid.append(x.mois_lib, el('small', '', 'le ' + x.jour + (x.ecart === null ? '' : ' · ' + signe(x.ecart))));
      const t = el('div', 'v-t'), i = el('i'); i.style.width = Math.max(0, Math.min(100, x.solde / mx * 100)) + '%';
      i.style.background = x.solde < k.seuil ? 'var(--color-bad)' : TON.epargne;
      const m = el('b'); m.style.left = Math.min(99, k.seuil / mx * 100) + '%'; t.append(i, m); mid.append(t);
      r.append(ic('bouee', TON.epargne), mid, el('span', 'v-n' + (x.solde < k.seuil ? ' neg' : ''), eur(x.solde)));
      out.push(r);
    });
    const f = el('div', 'v-r'), lab = el('label', 'v-champ', 'Minimum souhaité '), inp = el('input', 'v-input');
    inp.type = 'text'; inp.inputMode = 'numeric'; inp.value = k.seuil; inp.setAttribute('aria-label', 'Minimum souhaité pour le coussin');
    inp.onchange = () => { const n = nombre(inp.value); if (n >= 0) A.maj(Object.assign({}, A.bundle(), { coussin_min: n }), 'Minimum du coussin enregistré.'); else A.msg('Minimum invalide : rien n’a été changé.', true); };
    lab.append(inp, ' €'); f.append(lab); out.push(f);
    out.push(el('p', 'bm-note', 'Le trait noir marque ton minimum. Ta vraie sécurité reste le Livret A : ce coussin sert à ne pas passer dans le rouge avant le salaire.'));
    c.replaceChildren(...out);
  });

  // ---------- Plafonds par poste ----------
  const ligneJauge = (r, rythme, ton) => {
    const d = Number(r.depense), s = Number(r.seuil), re = Number(r.reste), p = s > 0 ? d / s : d > 0 ? 2 : 0;
    const row = el('div', 'v-r clic'); row.tabIndex = 0; row.setAttribute('role', 'button'); row.title = 'Voir les opérations : ' + r.poste;
    row.onclick = () => voirOps(r); row.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); voirOps(r); } };
    const mid = el('div'), nom = el('span', 'v-nom', r.poste); mid.append(nom, el('small', re < 0 ? 'neg' : '', re < 0 ? 'dépassé de ' + eur(-re) : 'reste ' + eur(re)));
    const t = el('div', 'v-t'), i = el('i'); i.style.width = Math.min(100, p * 100) + '%';
    i.style.background = re < 0 ? 'var(--color-bad)' : p > rythme + 0.15 ? 'var(--color-warn)' : ton;
    const m = el('b'); m.style.left = Math.min(99, rythme * 100) + '%'; t.append(i, m); mid.append(t);
    const n = el('span', 'v-n' + (re < 0 ? ' neg' : ''), eur(d)); n.append(el('small', '', ' / ' + eur(s)));
    row.append(ic(icone(r.poste), ton), mid, n);
    return row;
  };
  dash.draw('v_plafonds', (c) => {
    const v = V(), rythme = v.auj / v.nbJours, an = (Number(v.mc.slice(5, 7)) - 1 + rythme) / 12;
    const out = [el('h2', '', 'Mes plafonds')];
    // Les postes pas encore entamés sont regroupés sur une ligne, pour garder la liste courte
    const entames = v.postes.filter((r) => Number(r.depense) !== 0), intacts = v.postes.filter((r) => Number(r.depense) === 0);
    entames.forEach((r) => out.push(ligneJauge(r, rythme, TON[r.bloc])));
    if (intacts.length) {
      const d = el('details', 'v-intacts'), s = el('summary'), l = el('span', 'v-l', intacts.length + ' poste' + (intacts.length > 1 ? 's' : '') + ' pas encore entamé' + (intacts.length > 1 ? 's' : ''));
      l.append(el('small', '', intacts.map((r) => r.poste).join(', ')));
      s.append(ic('ok', TON.ok), l, el('span', 'v-v', eur(intacts.reduce((t, r) => t + Number(r.seuil), 0))), el('span', 'v-chev', '›'));
      d.append(s); intacts.forEach((r) => d.append(ligneJauge(r, rythme, TON[r.bloc]))); out.push(d);
    }
    const h2 = el('h3', 'v-sous', 'Enveloppes de ' + v.mc.slice(0, 4) + ', payées par la caisse');
    out.push(h2, ...v.enveloppes.map((r) => ligneJauge(r, an, TON.Enveloppes)));
    out.push(el('p', 'bm-note', 'Le trait noir montre où tu devrais en être aujourd’hui. Touche un poste pour voir ses opérations.'));
    c.replaceChildren(...out);
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
    '<label for="ach-p">Dans quelle catégorie ?</label><select id="ach-p"></select><div class="v-rep" id="ach-r" aria-live="polite"></div>' +
    '<div class="row"><button class="app-btn primary" value="fermer">Fermer</button></div>', () => {});
  const repondre = () => {
    const v = V(), m = nombre($('ach-m').value), [type, id] = $('ach-p').value.split('|'), r = $('ach-r');
    if (!(m > 0)) { r.replaceChildren(el('p', 'bm-note', 'Tape un montant.')); return; }
    const P = (...parts) => riche('p', parts);
    const out = [];
    if (type === 'mois') {
      const l = v.postes.find((x) => x.id === id), reste = Number(l.reste);
      if (m <= reste) out.push(P(['Oui.'], ' Payé par ton budget ' + l.poste + ' : il restera ', [eur(reste - m)], ' ce mois-ci.'));
      else {
        const dep = m - Math.max(0, reste), autres = v.postes.filter((x) => x.id !== id).reduce((s, x) => s + Math.max(0, Number(x.reste)), 0);
        out.push(P(['Ça dépasse ' + l.poste + ' de ' + eur(dep) + '.']));
        out.push(P('Soit tu compenses sur tes autres postes (il y reste ' + eur(autres) + ' ce mois-ci), soit ton épargne de fin de mois passe de ' + eur(v.fin) + ' à ', [eur(v.fin - dep)], '.'));
        if (v.fin - dep < 0) out.push(P('Le mois finirait en négatif : ce sera déduit de l’épargne du mois prochain.'));
      }
    } else {
      const l = v.enveloppes.find((x) => x.id === id), reste = Number(l.reste), k = v.caisse.valeur;
      out.push(m <= reste ? P(['Prévu dans l’enveloppe ' + l.poste], ' : il restera ' + eur(reste - m) + ' pour ' + v.mc.slice(0, 4) + '.')
        : P(['Ça dépasse l’enveloppe ' + l.poste + ' de ' + eur(m - Math.max(0, reste))], ' pour ' + v.mc.slice(0, 4) + '.'));
      out.push(P('Caisse des enveloppes : ' + signe(k) + ' → ', [signe(k - m)], '.' + (k - m < 0 ? ' Le trou serait à combler avec les bons mois (prime, mois sous le budget).' : '')));
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
      const W = 340, H = 130, x0 = 8, x1 = W - 8, y0 = 10, y1 = H - 24, ys = pts.map((q) => (serie === 'dette' ? -q.dette : q[serie]));
      const mn = Math.min(...ys), mx = Math.max(...ys), X = (i) => x0 + (x1 - x0) * i / (pts.length - 1), Y = (y) => y1 - (y1 - y0) * (y - mn) / ((mx - mn) || 1);
      const ton = serie === 'dette' ? 'var(--color-bad)' : TON.epargne, l = ys.map((y, i) => (i ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(y).toFixed(1)).join(' ');
      const s = svg('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': lib + ' mois par mois' });
      s.append(svg('path', { d: l + ` L${x1} ${y1} L${x0} ${y1} Z`, fill: ton, opacity: 0.12 }), svg('path', { d: l, stroke: ton, 'stroke-width': 2.5, fill: 'none', 'stroke-linejoin': 'round' }),
        svg('circle', { cx: X(pts.length - 1), cy: Y(ys[ys.length - 1]), r: 4, fill: ton }));
      const pas = Math.ceil(pts.length / 6);
      pts.forEach((q, i) => { if (i % pas === 0 || i === pts.length - 1) s.append(svg('text', { x: X(i), y: H - 5, 'text-anchor': i === 0 ? 'start' : i === pts.length - 1 ? 'end' : 'middle' }, moisCourt(q.mois))); });
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
        const d = el('button', 'v-tuile'); d.type = 'button'; d.style.flex = String(Math.max(0.24, (x || 0) / tot)); d.style.setProperty('--t', TON[k]);
        d.append(el('span', '', n), el('b', '', x === null ? '—' : eur(x))); if (sub) d.append(el('small', '', sub));
        d.setAttribute('aria-label', n + ' : ' + (x === null ? 'à saisir' : eur(x)) + '. Modifier');
        d.onclick = () => placer(k); tree.append(d);
      });
      out.push(tree);
    }
    const pret = el('button', 'v-r clic v-r-btn'); pret.type = 'button'; pret.onclick = () => placer('pret');
    const mid = el('div'); mid.append('Prêt restant', el('small', '', p.fin_pret ? 'fin en ' + p.fin_pret : 'à saisir'));
    pret.append(ic('diplome', TON.fixes), mid, el('span', 'v-n neg', p.dette === null ? '—' : eur(-p.dette)));
    out.push(pret);
    const spots = el('div', 'v-spots'), k = v.caisse.valeur;
    const spot = (cls, nom, t, b, s) => { const d = el('div', 'v-spot ' + cls), h = el('span', 'v-spot-t'); h.append(dessin(nom, 14), t); d.append(h, el('b', '', b), el('small', '', s)); spots.append(d); };
    spot(p.matelas >= 3 ? 'ok' : 'b', 'bouee', 'Matelas', String(p.matelas).replace('.', ',') + ' mois', 'de dépenses normales (Livret A et Trade Republic)');
    spot(k < 0 ? 'b' : 'ok', 'caisse', 'Caisse des enveloppes', signe(k), 'depuis ' + v.caisse.depuis);
    out.push(spots);
    c.replaceChildren(...out);
  });

  // ---------- Placements : saisie ----------
  const nombre = (x) => { const s = String(x).replace(/[\s  ]/g, '').replace(',', '.'); return s === '' ? NaN : Number(s); };
  const auj = () => new Date().toISOString().slice(0, 10);
  let enCours = null;
  // Une saisie invalide garde la fenêtre ouverte, avec l'erreur dedans
  const dPl = A.dialogue('<h2 id="pl-titre"></h2><p id="pl-aide"></p><div id="pl-champs" style="display:grid;gap:8px"></div>' + A.boutons('Enregistrer'), () => {
    const b = A.bundle(), P = Object.assign({}, b.patrimoine), val = (i) => nombre($('pl-' + i).value);
    if (enCours === 'livret') { if (!(val(0) >= 0)) return 'Tape un montant positif, par exemple 22 950.'; P.livret = { valeur: val(0), date: auj() }; }
    else if (enCours === 'pea') { if (!(val(0) >= 0)) return 'Tape un montant positif.'; P.pea = (P.pea || []).filter((x) => x.date !== auj()).concat([{ date: auj(), valeur: val(0) }]); }
    else if (enCours === 'tr') { if (!isFinite(val(0))) return 'Tape un montant, par exemple 5 478,40.'; const fins = Object.assign({}, P.tr && P.tr.fins); fins[auj().slice(0, 7)] = val(0); P.tr = { date: auj(), solde: val(0), fins }; }
    else if (enCours === 'pret') {
      const d = $('pl-3').value.trim();
      if (!(val(0) >= 0)) return 'Capital restant : tape un montant positif.';
      if (!(val(1) >= 0)) return 'Taux : tape un nombre, par exemple 1,9.';
      if (!(val(2) > 0)) return 'Mensualité : tape un montant supérieur à 0.';
      if (d && !/^\d{4}-\d\d$/.test(d)) return 'Mois du déblocage : écris-le comme 2026-08, ou laisse vide.';
      P.pret = { capital: val(0), taux: val(1), mensualite: val(2), date: auj(), debut: d || undefined };
    }
    A.maj(Object.assign({}, b, { patrimoine: P }), 'Placements mis à jour.');
  });
  const champ = (i, lab, v, mode) => {
    const l = el('label', '', lab); l.htmlFor = 'pl-' + i;
    const inp = el('input'); inp.id = 'pl-' + i; inp.autocomplete = 'off';
    if (mode === 'texte') inp.type = 'text'; else inp.inputMode = 'decimal';
    inp.value = v === undefined || v === null ? '' : String(v).replace('.', ',');
    return [l, inp];
  };
  const placer = (k) => {
    const P = A.bundle().patrimoine || {}, p = V().patrimoine; enCours = k;
    const T = {
      livret: ['Livret A', 'Valeur aujourd’hui. Ensuite, l’appli suit seule les virements depuis et vers le livret.', champ(0, 'Valeur (€)', p.livret)],
      pea: ['PEA', 'Valeur affichée dans ton appli de bourse aujourd’hui.', champ(0, 'Valeur (€)', p.pea)],
      tr: ['Trade Republic', 'Le plus simple : importe l’export CSV de Trade Republic (bouton Importer). Sinon, tape le solde espèces.', champ(0, 'Solde espèces (€)', p.tr)],
      pret: ['Prêt étudiant', 'Capital restant dû aujourd’hui, d’après ton tableau d’amortissement.', [...champ(0, 'Capital restant (€)', p.dette), ...champ(1, 'Taux annuel (%)', P.pret && P.pret.taux), ...champ(2, 'Mensualité (€)', P.pret && P.pret.mensualite), ...champ(3, 'Mois du déblocage (AAAA-MM, facultatif)', P.pret && P.pret.debut, 'texte')]]
    }[k];
    $('pl-titre').textContent = T[0]; $('pl-aide').textContent = T[1]; $('pl-champs').replaceChildren(...T[2]);
    A.ouvrir(dPl);
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
    const groupe = (type, titre, nom, ton, total, sous) => {
      const d = el('details'), s = el('summary'), l = el('span', 'v-l', titre); if (sous) l.append(el('small', '', sous));
      s.append(ic(nom, ton), l, el('span', 'v-v', total), el('span', 'v-chev', '›')); d.append(s);
      const inn = el('div', 'v-in');
      refs.filter((r) => r.type === type).forEach((r) => {
        const row = el('button', 'v-r clic v-r-btn'); row.type = 'button'; row.dataset.ref = r.id; row.setAttribute('aria-label', 'Modifier ' + r.poste);
        const mid = el('div'); mid.append(r.poste); if (r.note) mid.append(el('small', '', r.note));
        row.append(mid, el('span', 'v-n v-edit', eur2(Number(r.montant)) + (type === 'Enveloppe annuelle' ? ' / an' : '')));
        inn.append(row);
      });
      d.append(inn); return d;
    };
    const ep = el('div', 'v-row'), l = el('span', 'v-l', 'Épargne prévue'); l.append(el('small', '', 'ce qui reste d’un mois normal'));
    ep.append(ic('pieces', TON.epargne), l, el('span', 'v-v', eur(n.epargne)));
    c.replaceChildren(
      groupe('Revenu', 'Revenus', 'billet', TON.epargne, eur(n.revenus)),
      groupe('Charge fixe', 'Charges fixes', 'maison', TON.fixes, eur(n.fixes)),
      groupe('Charge variable', 'Charges variables', 'panier', TON['Charges variables'], eur(n.variables)),
      groupe('Enveloppe annuelle', 'Enveloppes', 'cadeau', TON.Enveloppes, eur(n.env) + ' / mois', eur(n.env * 12) + ' par an'),
      groupe('Loisir', 'Loisirs', 'resto', TON.Loisirs, eur(n.loisirs), 'mois normal, le budget du mois suit les revenus'),
      ep);
  });
  dash.draw('v_nperso', (s) => { s.textContent = String(((A.bundle() || {}).regles_perso || []).length); });
  dash.draw('v_placements', (c) => {
    const p = V().patrimoine;
    const row = (k, nom, ton, t, sous, v) => { const b = el('button', 'v-row'); b.type = 'button'; const l = el('span', 'v-l', t); l.append(el('small', '', sous)); b.append(ic(nom, ton), l, el('span', 'v-v', v), el('span', 'v-chev', '›')); b.onclick = () => placer(k); return b; };
    c.replaceChildren(
      row('livret', 'banque', TON.livret, 'Livret A', p.livret === null ? 'à saisir une fois' : 'suivi avec les virements', p.livret === null ? '—' : eur(p.livret)),
      row('pea', 'hausse', TON.pea, 'Valeur du PEA', p.pea_date ? 'saisie le ' + p.pea_date : 'à saisir', p.pea === null ? '—' : eur(p.pea)),
      row('tr', 'portefeuille', TON.tr, 'Trade Republic', p.tr_date ? 'solde au ' + p.tr_date : 'importe son export CSV', p.tr === null ? '—' : eur(p.tr)),
      row('pret', 'diplome', TON.fixes, 'Prêt étudiant', p.fin_pret ? 'fin en ' + p.fin_pret : 'à saisir une fois', p.dette === null ? '—' : eur(-p.dette)));
  });
  dash.draw('v_sauve', (s) => { const d = (A.bundle() || {}).sauvegarde_le; s.textContent = d ? 'Dernière : ' + new Date(d).toLocaleDateString('fr-FR') : 'Jamais sauvegardé'; });
  $('v-sauver').onclick = () => A.sauvegarder();
})();
