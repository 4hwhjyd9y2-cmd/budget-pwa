// Écrans de l'appli, dans le style d'une appli iOS : Ce mois-ci, Patrimoine, Opérations, Réglages,
// pages poussées (mois terminé, réglages détaillés) et feuille « Je veux acheter ». Calculs dans moteur.js (calc.vue).
(function () {
  const A = window.App;
  if (!A || !A.calc()) return;
  const $ = (id) => document.getElementById(id);
  const nf0 = new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 });
  const sp = (s) => s.replace(/[  ]/g, ' ');
  const eur = (v) => (v < 0 ? '−' : '') + sp(nf0.format(Math.abs(Math.round(v)))) + ' €';
  const eur2 = (v) => (v < 0 ? '−' : '') + A.eur(Math.abs(v));
  const signe = (v) => (v > 0 ? '+' : '') + eur(v);
  const signe2 = (v) => (v > 0 ? '+' : '') + eur2(v);
  const V = () => A.calc().vue;
  const MOIS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
  const JOURS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
  const MOIS_L = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  const moisCourt = (k) => MOIS[Number(k.slice(5, 7)) - 1];
  const cap = (t) => t.charAt(0).toUpperCase() + t.slice(1);
  const de = (m) => (/^[aeiouy]/i.test(m) ? 'd’' : 'de ') + m;
  const dateLongue = (iso) => { const d = new Date(iso + 'T12:00:00Z'); return JOURS[d.getUTCDay()] + ' ' + (d.getUTCDate() === 1 ? '1er' : d.getUTCDate()) + ' ' + MOIS_L[d.getUTCMonth()]; };
  const nombre = (x) => { const s = String(x).replace(/[\s  €]/g, '').replace(',', '.'); return s === '' ? NaN : Number(s); };
  const auj = () => new Date().toISOString().slice(0, 10);
  const syn = (id) => { const r = (dash.data('synthese').data || []).find((x) => x.id === id); return r ? r.valeur : 0; };

  // Couleurs système par catégorie
  const TON = { Loisirs: 'var(--indigo)', 'Charges variables': 'var(--blue)', Enveloppes: 'var(--orange)', 'Charges fixes': 'var(--gray)', Revenus: 'var(--green)', Interne: 'var(--teal)', 'Non classé': 'var(--gray)' };
  const ton = (bloc) => TON[bloc] || 'var(--gray)';

  // ---------- Icônes au trait (24 × 24) ----------
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
    ok: '<path d="m6 12 4 4 8-9"/>',
    baisse: '<path d="M12 4v16M6 14l6 6 6-6"/>',
    envoi: '<path d="M7 17 17 7M8 7h9v9"/>',
    etiquette: '<path d="M3 3h8l10 10-8 8L3 11Z"/><circle cx="7.5" cy="7.5" r="1.5"/>',
    recu: '<path d="M5 3h14v18l-3-2-2 2-2-2-2 2-2-2-3 2Z"/><path d="M9 8h6M9 12h6"/>',
    liste: '<path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01"/>',
    etincelle: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18"/>',
    calcul: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8M8 12h1M12 12h1M16 12h0M8 16h1M12 16h1"/>',
    disque: '<path d="M5 3h11l3 3v15H5Z"/><path d="M8 3v5h7V3M8 21v-7h8v7"/>',
    calendrier: '<rect x="4" y="5" width="16" height="15" rx="2.5"/><path d="M4 10h16M9 3v4M15 3v4"/>',
    reglages: '<path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1"/><circle cx="15" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="18" r="2"/>',
    import: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
    loupe: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
    chev: '<path d="m9 6 6 6-6 6"/>',
    croix: '<path d="M7 7l10 10M17 7 7 17"/>',
    point: '<circle cx="12" cy="12" r="3"/>'
  };
  const ICONES = [[/resto|bar|sortie/i, 'resto'], [/v[eê]tement/i, 'vetement'], [/tabac/i, 'tabac'], [/soin|coiff/i, 'ciseaux'], [/carbur|p[ée]age/i, 'carburant'], [/course/i, 'panier'],
    [/maison|quotidien/i, 'maison'], [/cadeau/i, 'cadeau'], [/assurance/i, 'bouclier'], [/entretien|voiture|moto/i, 'cle'], [/achat/i, 'sac'], [/sant/i, 'sante'], [/loyer|logement/i, 'maison'],
    [/pr[êe]t/i, 'diplome'], [/sport|salle/i, 'haltere'], [/t[ée]l[ée]phone/i, 'telephone'], [/salaire|caf\b|revenu/i, 'billet'], [/[ée]pargne|virement|interne/i, 'envoi'], [/claude|abonn|prime/i, 'etincelle']];
  const icone = (p) => { const x = ICONES.find(([re]) => re.test(p || '')); return x ? x[1] : 'point'; };
  const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt !== undefined && txt !== null) e.textContent = txt; return e; };
  // Les dessins viennent de la table fixe ci-dessus, jamais de données importées
  const dessin = (nom, taille) => { const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); const t = String(taille || 18); s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('width', t); s.setAttribute('height', t); s.setAttribute('fill', 'none'); s.setAttribute('stroke', 'currentColor'); s.setAttribute('stroke-width', '2'); s.setAttribute('stroke-linecap', 'round'); s.setAttribute('stroke-linejoin', 'round'); s.setAttribute('aria-hidden', 'true'); s.innerHTML = SVG_IC[nom] || SVG_IC.point; return s; };
  document.querySelectorAll('[data-icone]').forEach((s) => s.replaceChildren(dessin(s.dataset.icone, s.dataset.taille || (s.closest('.v-onglets') ? 22 : 20))));
  const NS = 'http://www.w3.org/2000/svg';
  const svg = (tag, at, txt) => { const e = document.createElementNS(NS, tag); Object.entries(at || {}).forEach(([k, v]) => e.setAttribute(k, v)); if (txt !== undefined) e.textContent = txt; return e; };

  // ---------- Briques : carré d'icône, ligne de liste, titre de section ----------
  const carre = (nom, t) => { const s = el('span', 'v-carre'); s.style.setProperty('--t', t || 'var(--gray)'); s.setAttribute('aria-hidden', 'true'); s.append(dessin(nom, 17)); return s; };
  const chev = () => { const s = el('span', 'v-chev'); s.append(dessin('chev', 14)); return s; };
  // o : { ic, ton, titre, sous, sousCls, val, valSous, valCls, clic, chev, data, apres }
  const ligne = (o) => {
    const r = el(o.clic ? 'button' : 'div', 'v-ligne'); if (o.clic) { r.type = 'button'; r.onclick = o.clic; }
    if (o.data) Object.entries(o.data).forEach(([k, v]) => { r.dataset[k] = v; });
    if (o.ic) r.append(carre(o.ic, o.ton));
    const t = el('div', 'v-txt'); t.append(el('b', '', o.titre)); if (o.apres) t.append(o.apres); if (o.sous) t.append(el('small', o.sousCls || '', o.sous));
    r.append(t);
    if (o.val !== undefined && o.val !== null) { const v = el('div', 'v-val' + (o.valCls ? ' ' + o.valCls : ''), o.val); if (o.valSous) v.append(el('small', '', o.valSous)); r.append(v); }
    if (o.chev) r.append(chev());
    return r;
  };
  const liste = (rows, nu) => { const l = el('div', 'v-liste' + (nu ? ' nu' : '')); l.append(...rows); return l; };
  const section = (titre, bouton, go) => { const h = el('h2', 'v-section', titre); if (bouton) { const b = el('button', '', bouton); b.type = 'button'; b.onclick = go; h.append(b); } return h; };
  const barre = (pct, couleur, repere) => { const b = el('div', 'v-barre'), i = el('i'); i.style.width = Math.max(0, Math.min(100, pct * 100)) + '%'; i.style.background = couleur; b.append(i); if (repere !== undefined && repere !== null) { const m = el('b'); m.style.left = Math.min(99, repere * 100) + '%'; b.append(m); } return b; };

  // ---------- Navigation : onglets, page poussée, barre compacte ----------
  const onglet = (n) => { document.querySelector('.bm-tab[data-tab="' + n + '"]').click(); };
  document.querySelectorAll('.bm-tab').forEach((t) => t.addEventListener('click', () => { window.scrollTo(0, 0); majHaut(); }));
  document.querySelectorAll('[data-importer]').forEach((b) => { b.onclick = () => $('app-file').click(); });

  let page = null;
  const pageEl = $('v-page'); pageEl.dataset.draw = 'v_page';
  const pousser = (p) => { page = p; dash.draw('v_page'); pageEl.scrollTop = 0; pageEl.classList.add('on'); document.body.style.overflow = 'hidden'; setTimeout(() => $('v-retour').focus({ preventScroll: true }), 50); };
  const fermerPage = () => { pageEl.classList.remove('on'); pageEl.style.transform = ''; document.body.style.overflow = ''; page = null; };
  dash.draw('v_page', () => { if (!page) return; $('v-retour-txt').textContent = page.retour || 'Retour'; $('v-page-titre').textContent = page.titre(); $('v-page-corps').replaceChildren(...page.corps()); });
  $('v-retour').onclick = fermerPage;
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && page && !document.querySelector('dialog[open]')) fermerPage(); });
  // Retour en glissant depuis le bord gauche, comme sur iPhone
  (() => {
    let x0 = 0, dx = 0, t0 = 0, actif = false;
    pageEl.addEventListener('pointerdown', (e) => { if (e.clientX > 28 || e.pointerType === 'mouse') return; actif = true; x0 = e.clientX; dx = 0; t0 = performance.now(); pageEl.setPointerCapture(e.pointerId); pageEl.style.transition = 'none'; });
    pageEl.addEventListener('pointermove', (e) => { if (!actif) return; dx = Math.max(0, e.clientX - x0); pageEl.style.transform = 'translateX(' + dx + 'px)'; });
    const fin = () => { if (!actif) return; actif = false; pageEl.style.transition = ''; const v = dx / Math.max(1, performance.now() - t0); if (dx > innerWidth / 3 || v > 0.5) fermerPage(); else pageEl.style.transform = ''; };
    pageEl.addEventListener('pointerup', fin); pageEl.addEventListener('pointercancel', fin);
  })();

  // Le grand titre se réduit dans une barre en haut quand on fait défiler
  const majHaut = () => {
    const sec = document.querySelector('.bm-page:not([hidden])'), h = sec && sec.querySelector('.v-titre'), b = $('v-haut');
    if (!h) return; b.textContent = h.textContent; b.classList.toggle('on', h.getBoundingClientRect().bottom < 8);
  };
  addEventListener('scroll', majHaut, { passive: true });

  // ---------- Opérations d'un poste ----------
  const ops = { mois: '', bloc: '', poste: '', depuis: '', limite: 120 };
  const voirOps = (r) => {
    const v = V();
    Object.assign(ops, { poste: r.poste || '', bloc: r.bloc || '', mois: r.bloc === 'Enveloppes' || r.bloc === 'Non classé' ? '' : (r.mois || v.mc), depuis: r.bloc === 'Enveloppes' ? v.mc.slice(0, 4) + '-01' : '', limite: 120 });
    $('v-q').value = ''; if (page) fermerPage(); onglet('donnees'); dash.draw('v_ops_filtres'); dash.draw('v_ops');
  };

  // ================= Ce mois-ci =================
  dash.draw('v_mois_titre', (h) => { h.textContent = cap(MOIS_L[Number(V().mc.slice(5, 7)) - 1]); });
  dash.draw('v_mois_sous', (p) => { const e = A.bundle().export; p.textContent = e ? 'Opérations jusqu’au ' + Number(e.slice(8, 10)) + ' ' + moisCourt(e) : ''; });

  const blocsMois = () => { const v = V(); return [
    ['Loisirs', v.depense.loisirs, v.prevu.loisirs, 'var(--indigo)'],
    ['Variables', v.depense.variables, v.prevu.variables, 'var(--blue)'],
    ['Enveloppes', v.depense.env, v.prevu.env, 'var(--orange)']]; };
  dash.draw('v_heros', (c) => {
    const v = V(), parts = blocsMois();
    const dep = parts.reduce((s, p) => s + Math.max(0, p[1]), 0), prev = parts.reduce((s, p) => s + p[2], 0), reste = prev - dep, jours = v.nbJours - v.auj;
    const out = [el('div', 'lab', reste < 0 ? 'Tu as dépassé ton budget de' : 'Il te reste à dépenser'), el('div', 'montant' + (reste < 0 ? ' neg' : ''), eur(Math.abs(reste)))];
    if (reste > 0 && jours > 0) { const p = el('div', 'v-gris', 'soit '); p.append(el('b', '', eur(reste / jours) + ' par jour'), ' jusqu’au ' + v.nbJours); p.querySelector('b').style.color = 'var(--fg)'; out.push(p); }
    // Trois anneaux, façon app Activité
    const s = svg('svg', { width: 112, height: 112, viewBox: '0 0 112 112', role: 'img', 'aria-label': parts.map((p) => p[0] + ' ' + Math.round(p[2] ? p[1] / p[2] * 100 : 0) + ' %').join(', ') });
    const g = svg('g', { fill: 'none', 'stroke-width': 13, 'stroke-linecap': 'round', transform: 'rotate(-90 56 56)' });
    [49, 34, 19].forEach((r, i) => {
      const [, d, p, t] = parts[i], C = 2 * Math.PI * r, f = p > 0 ? Math.min(1, Math.max(0, d) / p) : 0;
      g.append(svg('circle', { cx: 56, cy: 56, r, stroke: 'color-mix(in srgb, ' + t + ' 22%, transparent)' }));
      if (f > 0) g.append(svg('circle', { cx: 56, cy: 56, r, stroke: d > p ? 'var(--red)' : t, 'stroke-dasharray': Math.max(0.01, f * C - (f < 1 ? 0 : 0)) + ' ' + C }));
    });
    s.append(g);
    const leg = el('div', 'v-leg');
    parts.forEach(([n, d, p, t]) => { const r = el('div'), a = el('span'), i = el('i'); i.style.background = t; a.append(i, n); const b = el('span', d > p ? 'neg' : '', eur(d)); b.append(el('em', '', ' / ' + nf0.format(Math.round(p)))); r.append(a, b); leg.append(r); });
    const an = el('div', 'v-anneaux'); an.append(s, leg); out.push(an);
    c.replaceChildren(...out);
  });

  // À faire : ce qui demande une décision
  const pageMt = () => pousser({ retour: 'Ce mois-ci', titre: () => cap(V().epargne.mois), corps: corpsMt });
  dash.draw('v_afaire', (c) => {
    const v = V(), e = v.epargne, mt = e.mois.split(' ')[0], rythme = v.auj / v.nbJours, rows = [];
    [['Loisirs', v.depense.loisirs, v.prevu.loisirs], ['Variables', v.depense.variables, v.prevu.variables]].forEach(([n, d, p]) => {
      if (p <= 0) return;
      if (d > p) rows.push(ligne({ ic: 'alerte', ton: 'var(--red)', titre: n + ' dépassés de ' + eur(d - p), sous: 'Compense sur les autres postes', clic: () => $('v-plafonds').scrollIntoView({ behavior: 'smooth' }), chev: true }));
      else if (d / p > rythme + 0.15) rows.push(ligne({ ic: 'alerte', ton: 'var(--orange)', titre: n + ' : ' + Math.round(d / p * 100) + ' % dépensés', sous: 'Le mois n’en est qu’à ' + Math.round(rythme * 100) + ' %', clic: () => $('v-plafonds').scrollIntoView({ behavior: 'smooth' }), chev: true }));
    });
    if (e.manque > 0) rows.push(ligne({ ic: 'baisse', ton: 'var(--red)', titre: cap(mt) + ' fini à −' + eur(e.manque), sous: 'Pris sur ton coussin · ' + (e.laisse ? 'laissé filer' : 'reporté'), clic: pageMt, chev: true }));
    const k = v.caisse.valeur;
    rows.push(ligne({ ic: 'caisse', ton: k < 0 ? 'var(--orange)' : 'var(--green)', titre: 'Caisse des enveloppes', sous: k < 0 ? 'Retirée de l’épargne ' + de(v.mois_mc.split(' ')[0]) : 'D’avance pour les grosses dépenses', val: signe(k), valCls: k < 0 ? 'neg' : '' }));
    const cs = v.coussin.dernier;
    if (cs && (v.coussin.sous_seuil || v.coussin.baisse)) rows.push(ligne({ ic: 'bouee', ton: v.coussin.sous_seuil ? 'var(--red)' : 'var(--orange)', titre: 'Coussin du compte : ' + eur(cs.solde), sous: v.coussin.sous_seuil ? 'Sous ton minimum de ' + eur(v.coussin.seuil) : 'En baisse de ' + eur(-cs.ecart) + ' en un mois', clic: () => onglet('duree'), chev: true }));
    if (e.reste > 0) rows.push(ligne({ ic: 'envoi', ton: 'var(--teal)', titre: eur2(e.reste) + ' ' + de(mt) + ' à virer', sous: 'Vers ton épargne', clic: pageMt, chev: true }));
    else if (e.a_virer > 0) rows.push(ligne({ ic: 'ok', ton: 'var(--green)', titre: 'Épargne ' + de(mt) + ' virée' }));
    if (v.nc) rows.push(ligne({ ic: 'etiquette', ton: 'var(--orange)', titre: v.nc + ' opération' + (v.nc > 1 ? 's' : '') + ' à classer', clic: () => voirOps({ bloc: 'Non classé' }), chev: true }));
    if (v.fixKo.length) rows.push(ligne({ ic: 'recu', ton: 'var(--orange)', titre: 'Charges fixes ' + de(mt) + ' à vérifier', sous: v.fixKo.join(', '), clic: pageMt, chev: true }));
    c.replaceChildren(section('À faire'), liste(rows));
  });

  // Épargne prévue en fin de mois : la courbe du mois
  dash.draw('v_epargne_prevue', (c) => {
    const v = V(), W = 340, H = 104, x0 = 6, x1 = W - 6, y0 = 10, y1 = H - 22;
    const pts = v.courbe.concat(v.projection), vals = pts.map((p) => p.v).concat([0]);
    const mn = Math.min(...vals), mx = Math.max(...vals), X = (j) => x0 + (x1 - x0) * j / v.nbJours, Y = (y) => y1 - (y1 - y0) * (y - mn) / ((mx - mn) || 1);
    const path = (l) => l.map((p, i) => (i ? 'L' : 'M') + X(p.j).toFixed(1) + ' ' + Y(p.v).toFixed(1)).join(' ');
    const carte = el('div', 'v-carte v-courbe'), tete = el('div'); tete.style.cssText = 'display:flex;justify-content:space-between;align-items:baseline';
    const val = el('span', v.fin < 0 ? 'neg' : 'pos', signe(v.fin)); val.style.font = '700 24px var(--sfr)';
    tete.append(el('span', 'v-gris', 'Fin ' + v.mois_mc.split(' ')[0]), val);
    const s = svg('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': 'Épargne prévue en fin de mois : ' + eur(v.fin) });
    s.append(svg('line', { x1: x0, x2: x1, y1: Y(0), y2: Y(0), stroke: 'var(--sep)' }),
      svg('path', { d: path(v.projection), stroke: 'var(--fg3)', 'stroke-width': 2, 'stroke-dasharray': '3 4', fill: 'none' }),
      svg('path', { d: path(v.courbe), stroke: 'var(--fg)', 'stroke-width': 2.5, fill: 'none', 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }));
    const aj = v.courbe[v.courbe.length - 1];
    s.append(svg('circle', { cx: X(aj.j), cy: Y(aj.v), r: 4, fill: 'var(--fg)' }), svg('circle', { cx: X(v.nbJours), cy: Y(v.fin), r: 4, fill: v.fin < 0 ? 'var(--red)' : 'var(--green)' }),
      svg('text', { x: x0, y: H - 4 }, '1 ' + moisCourt(v.mc)), svg('text', { x: x1, y: H - 4, 'text-anchor': 'end' }, v.nbJours + ' ' + moisCourt(v.mc)));
    carte.append(tete, s, el('p', 'v-note', 'Trait plein : ce qui s’est passé. Pointillé : charges fixes à venir et reste du budget dépensé au rythme prévu.'));
    carte.querySelector('.v-note').style.margin = '6px 0 0';
    c.replaceChildren(section('Épargne prévue'), carte);
  });

  // Plafonds : une ligne par poste, jauge et reste
  const lignePoste = (r, rythme, couleur, sansRepere) => {
    const d = Number(r.depense), s = Number(r.seuil), re = Number(r.reste), p = s > 0 ? d / s : d > 0 ? 2 : 0;
    const coul = re < 0 ? 'var(--red)' : p > rythme + 0.15 && !sansRepere ? 'var(--orange)' : couleur;
    return ligne({ ic: icone(r.poste), ton: couleur, titre: r.poste, apres: barre(p, coul, sansRepere ? null : rythme), val: re < 0 ? '−' + eur(-re) : eur(re), valSous: re < 0 ? 'dépassé' : 'restants', valCls: re < 0 ? 'neg' : '', clic: () => voirOps(r) });
  };
  dash.draw('v_plafonds', (c) => {
    const v = V(), rythme = v.auj / v.nbJours, an = (Number(v.mc.slice(5, 7)) - 1 + rythme) / 12;
    const entames = v.postes.filter((r) => Number(r.depense) !== 0), intacts = v.postes.filter((r) => Number(r.depense) === 0);
    const rows = entames.map((r) => lignePoste(r, rythme, ton(r.bloc)));
    if (intacts.length) {
      const d = el('details'), s = ligne({ ic: 'ok', ton: 'var(--green)', titre: intacts.length + ' poste' + (intacts.length > 1 ? 's' : '') + ' pas encore entamé' + (intacts.length > 1 ? 's' : ''), sous: intacts.map((r) => r.poste).join(', '), val: eur(intacts.reduce((t, r) => t + Number(r.seuil), 0)), chev: true });
      const sum = el('summary', s.className); sum.append(...s.childNodes); d.append(sum, ...intacts.map((r) => lignePoste(r, rythme, ton(r.bloc))));
      rows.push(d);
    }
    const tete = section('Plafonds'); tete.id = 'v-plafonds';
    c.replaceChildren(tete, liste(rows), section('Enveloppes ' + v.mc.slice(0, 4)), liste(v.enveloppes.map((r) => lignePoste(r, an, 'var(--orange)'))),
      el('p', 'v-note', 'Le trait montre où tu devrais en être aujourd’hui. Les enveloppes sont payées par la caisse.'));
  });

  dash.draw('v_avenir', (c) => {
    const v = V(), y = Number(v.mc.slice(0, 4)), m = Number(v.mc.slice(5, 7));
    if (!v.aVenir.length) { c.replaceChildren(); return; }
    c.replaceChildren(section('Ce qui arrive'), liste(v.aVenir.map((a) => ligne({ titre: a.libelle, sous: JOURS[new Date(Date.UTC(y, m - 1, a.jour)).getUTCDay()] + ' ' + a.jour + (a.detail && /pas encore/.test(a.detail) ? ' · pas encore vue' : ''), val: signe(a.montant), valCls: a.montant > 0 ? 'pos' : '' })), true));
  });

  dash.draw('v_mt_lien', (c) => {
    const v = V(), e = v.epargne;
    c.replaceChildren(ligne({ ic: 'calendrier', ton: 'var(--gray)', titre: cap(e.mois), sous: 'Mois terminé · ' + (e.manque > 0 ? 'fini à −' + eur(e.manque) : e.a_virer > 0 ? eur(e.a_virer) + ' d’épargne' : 'rien à épargner') + (v.fixKo.length ? ' · charges à vérifier' : ''), clic: pageMt, chev: true }));
  });

  // ---------- Mois terminé (page poussée) ----------
  const corpsMt = () => {
    const v = V(), e = v.epargne, out = [];
    const ep = [
      ligne({ ic: 'billet', ton: 'var(--green)', titre: 'Revenus', sous: 'Salaire ' + eur(syn('salaire')) + ' · CAF ' + eur(syn('caf')) + ' · Action Logement ' + eur(syn('al')), val: eur2(syn('revenus')) }),
      ligne({ ic: 'pieces', ton: 'var(--green)', titre: 'À virer sur l’épargne', val: eur2(e.a_virer) }),
      ligne({ ic: 'envoi', ton: 'var(--teal)', titre: 'Déjà viré', sous: 'Envoyé ' + eur(syn('tr_envois')) + ' − retiré ' + eur(syn('tr_retraits')), val: eur2(e.deja), valCls: e.deja < 0 ? 'neg' : '' }),
      ligne({ ic: e.reste > 0 ? 'alerte' : 'ok', ton: e.reste > 0 ? 'var(--orange)' : 'var(--green)', titre: 'Reste à virer', val: eur2(e.reste) })];
    out.push(section('Épargne'), liste(ep), el('p', 'v-note', String(syn('tr_etat')) + ' ' + String(syn('tr_note'))));
    if (e.manque > 0) {
      const b = el('button', 'app-btn', e.laisse ? 'Finalement, le reporter' : 'Laisser filer'); b.type = 'button'; b.style.cssText = 'width:100%;margin-top:10px';
      b.onclick = () => { const bu = A.bundle(), l = Object.assign({}, bu.deficits_laisses || {}); if (e.laisse) delete l[e.cle]; else l[e.cle] = true; A.maj(Object.assign({}, bu, { deficits_laisses: l }), e.laisse ? 'Le manque sera reporté sur le mois suivant.' : 'Manque laissé filer : rien n’est reporté.'); };
      out.push(b, el('p', 'v-note', 'Laisser filer : tu acceptes que ce manque soit pris sur le coussin du compte, sans le déduire du mois suivant.'));
    }
    const calc = el('details'), sm = el('summary', 'v-note', 'Détail du calcul ›'); sm.style.cursor = 'pointer';
    calc.append(sm, el('p', 'v-note', 'Revenus ' + eur2(syn('tr_revenus')) + ' − charges fixes passées ' + eur2(syn('tr_fixes')) + ' − loisirs et charges variables dépensés ' + eur2(syn('tr_depenses')) + ' − part des enveloppes ' + eur2(syn('tr_env')) + ' − dépassement de la caisse ' + eur2(syn('tr_trou_env')) + ' + report du mois précédent ' + eur2(syn('tr_report')) + '. Les envois vers l’épargne faits du 1er au 10 du mois suivant comptent pour ce mois-ci.'));
    out.push(calc);
    const rows = (dash.data('mois_courant').data || []).filter((r) => r.bloc === 'Loisirs' || r.bloc === 'Charges variables');
    const reste = rows.reduce((s, r) => s + Number(r.seuil) - Number(r.depense), 0);
    const tp = section('Plafonds'); tp.append(el('span', 'v-pastille' + (reste < 0 ? ' r' : ''), reste < 0 ? 'dépassé de ' + eur(-reste) : 'reste ' + eur(reste)));
    out.push(tp, liste(rows.map((r) => lignePoste(Object.assign({}, r, { mois: e.cle }), 1, ton(r.bloc), true))));
    const fx = (dash.data('mois_courant').data || []).filter((r) => r.bloc === 'Charges fixes'), ko = fx.filter((r) => !r.ok).length;
    const tf = section('Charges fixes'); tf.append(el('span', 'v-pastille' + (ko ? ' o' : ''), ko ? ko + ' à vérifier' : 'conformes'));
    out.push(tf, liste(fx.map((r) => ligne({ ic: r.ok ? icone(r.poste) : 'alerte', ton: r.ok ? 'var(--gray)' : 'var(--orange)', titre: r.poste, sous: r.etat, sousCls: r.ok ? '' : 'orange',
      val: eur2(Number(r.depense)), valSous: r.seuil !== null && r.seuil !== undefined && Math.abs(Number(r.seuil) - Number(r.depense)) >= 0.01 ? 'prévu ' + eur2(Number(r.seuil)) : null, clic: () => voirOps({ poste: r.poste, bloc: 'Charges fixes', mois: e.cle }) }))));
    return out;
  };

  // ---------- Je veux acheter (feuille) ----------
  let choix = null;
  const dAch = A.dialogue('<h2>Je veux acheter</h2><input id="ach-m" class="v-montant" inputmode="decimal" placeholder="0 €" autocomplete="off" aria-label="Montant en euros">' +
    '<div class="v-puces" id="ach-p" role="radiogroup" aria-label="Catégorie"></div><div class="v-rep" id="ach-r" aria-live="polite"></div>' +
    '<div class="row"><button class="app-btn" value="fermer">Fermer</button></div>', () => {});
  const verdict = (ic, couleur, titre, texte) => { const c = el('div', 'v-carte'), h = el('div', 'v-verdict'); h.append(carre(ic, couleur), titre); c.append(h); if (texte) c.append(el('p', '', texte)); return c; };
  const repondre = () => {
    const v = V(), m = nombre($('ach-m').value), r = $('ach-r');
    if (!choix) { r.replaceChildren(); return; }
    if (!(m > 0)) { r.replaceChildren(el('p', '', 'Tape un montant, puis choisis la catégorie.')); return; }
    const out = [];
    if (choix.type === 'mois') {
      const l = v.postes.find((x) => x.id === choix.id), reste = Number(l.reste);
      if (m <= reste) out.push(verdict('ok', 'var(--green)', 'Oui, c’est dans ton budget', 'Il restera ' + eur(reste - m) + ' en ' + l.poste + ' ce mois-ci.'));
      else {
        const dep = m - Math.max(0, reste), autres = v.postes.filter((x) => x.id !== l.id).reduce((s, x) => s + Math.max(0, Number(x.reste)), 0);
        out.push(verdict('alerte', 'var(--orange)', 'Ça dépasse de ' + eur(dep), 'Il reste ' + eur(Math.max(0, reste)) + ' en ' + l.poste + '. Compense sur tes autres postes (' + eur(autres) + ' restants), sinon l’épargne de fin de mois passe de ' + signe(v.fin) + ' à ' + signe(v.fin - dep) + '.'));
        if (reste > 0) out.push(verdict('ok', 'var(--green)', 'Jusqu’à ' + eur(reste) + ', c’est bon', 'Le montant maximum sans toucher à l’épargne ni aux autres postes.'));
      }
    } else {
      const l = v.enveloppes.find((x) => x.id === choix.id), reste = Number(l.reste), k = v.caisse.valeur;
      out.push(m <= reste ? verdict('ok', 'var(--green)', 'Prévu dans l’enveloppe ' + l.poste, 'Il restera ' + eur(reste - m) + ' pour ' + v.mc.slice(0, 4) + '.')
        : verdict('alerte', 'var(--orange)', 'Dépasse l’enveloppe de ' + eur(m - Math.max(0, reste)), 'Il reste ' + eur(Math.max(0, reste)) + ' en ' + l.poste + ' pour ' + v.mc.slice(0, 4) + '.'));
      out.push(verdict('caisse', k - m < 0 ? 'var(--orange)' : 'var(--teal)', 'Caisse : ' + signe(k) + ' → ' + signe(k - m), k - m < 0 ? 'Le trou serait retiré de l’épargne du mois.' : null));
    }
    r.replaceChildren(...out);
  };
  const puces = () => {
    const v = V(), box = $('ach-p'); box.replaceChildren();
    const ajout = (r, type) => { const b = el('button', 'v-puce' + (choix && choix.id === r.id ? ' on' : ''), r.poste); b.type = 'button'; b.setAttribute('role', 'radio'); b.setAttribute('aria-checked', String(!!(choix && choix.id === r.id)));
      b.onclick = () => { choix = { type, id: r.id }; puces(); repondre(); }; box.append(b); };
    v.postes.forEach((r) => ajout(r, 'mois')); v.enveloppes.forEach((r) => ajout(r, 'env'));
  };
  $('v-acheter').onclick = () => { const v = V(); if (!choix) choix = { type: 'mois', id: v.postes[0].id }; $('ach-m').value = ''; puces(); repondre(); A.ouvrir(dAch); setTimeout(() => $('ach-m').focus(), 300); };
  $('ach-m').addEventListener('input', repondre);

  // ================= Patrimoine =================
  dash.draw('v_pat_sous', (p) => { const e = A.bundle().export; p.textContent = e ? 'Au ' + Number(e.slice(8, 10)) + ' ' + MOIS_L[Number(e.slice(5, 7)) - 1] : ''; });
  let serie = 'net';
  dash.draw('v_pat', (c) => {
    const p = V().patrimoine, out = [];
    const seg = el('div', 'v-segment'); seg.setAttribute('role', 'group');
    [['net', 'Net'], ['brut', 'Ce que j’ai'], ['dette', 'Ce que je dois']].forEach(([k, t]) => { const b = el('button', '', t); b.type = 'button'; b.setAttribute('aria-pressed', String(serie === k)); b.onclick = () => { serie = k; dash.draw('v_pat'); }; seg.append(b); });
    out.push(seg);
    const val = serie === 'net' ? p.net : serie === 'brut' ? p.brut : -(p.dette || 0);
    out.push(el('div', 'v-gros' + (val < 0 ? ' neg' : ''), eur(val)));
    const pts = p.courbe;
    if (pts.length > 1) {
      const d0 = serie === 'dette' ? -pts[0].dette : pts[0][serie], dv = val - d0, bonne = serie === 'dette' ? dv >= 0 : dv >= 0;
      const pill = el('span', 'v-pastille' + (bonne ? '' : ' r'), (dv >= 0 ? '▲ ' : '▼ ') + eur(Math.abs(dv)) + ' depuis fin ' + moisCourt(pts[0].mois)); pill.style.marginTop = '6px'; out.push(pill);
      const W = 340, H = 120, x0 = 4, x1 = W - 4, y0 = 8, y1 = H - 22, ys = pts.map((q) => (serie === 'dette' ? -q.dette : q[serie]));
      const mn = Math.min(...ys), mx = Math.max(...ys), X = (i) => x0 + (x1 - x0) * i / (pts.length - 1), Y = (y) => y1 - (y1 - y0) * (y - mn) / ((mx - mn) || 1);
      const coul = serie === 'dette' ? 'var(--red)' : 'var(--green)', l = ys.map((y, i) => (i ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(y).toFixed(1)).join(' ');
      const s = svg('svg', { viewBox: `0 0 ${W} ${H}`, role: 'img', 'aria-label': 'Évolution mois par mois' });
      s.append(svg('path', { d: l + ` L${x1} ${y1} L${x0} ${y1} Z`, fill: coul, opacity: 0.14 }), svg('path', { d: l, stroke: coul, 'stroke-width': 3, fill: 'none', 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }),
        svg('circle', { cx: X(pts.length - 1), cy: Y(ys[ys.length - 1]), r: 4.5, fill: coul }));
      const pas = Math.ceil(pts.length / 6);
      pts.forEach((q, i) => { if (i % pas === 0 || i === pts.length - 1) s.append(svg('text', { x: X(i), y: H - 4, 'text-anchor': i === 0 ? 'start' : i === pts.length - 1 ? 'end' : 'middle' }, moisCourt(q.mois))); });
      const box = el('div', 'v-graph'); box.append(s); out.push(box);
    }
    if (!p.complet) { const b = el('button', 'app-btn', 'Compléter mes placements'); b.type = 'button'; b.style.cssText = 'width:100%;margin-top:12px'; b.onclick = () => onglet('regles'); out.push(b); }
    c.replaceChildren(...out);
  });
  const lignesComptes = (p) => [
    ligne({ ic: 'banque', ton: 'var(--green)', titre: 'Livret A', sous: p.livret === null ? 'À saisir une fois' : 'Suivi avec les virements', val: p.livret === null ? '—' : eur(p.livret), clic: () => placer('livret'), chev: true }),
    ligne({ ic: 'hausse', ton: 'var(--indigo)', titre: 'PEA', sous: p.pea_date ? 'Valeur du ' + p.pea_date.slice(0, 5) : 'À saisir', val: p.pea === null ? '—' : eur(p.pea), clic: () => placer('pea'), chev: true }),
    ligne({ ic: 'portefeuille', ton: 'var(--blue)', titre: 'Trade Republic', sous: p.tr_date ? 'Solde au ' + p.tr_date.slice(0, 5) : 'Importe son export CSV', val: p.tr === null ? '—' : eur(p.tr), clic: () => placer('tr'), chev: true }),
    ligne({ ic: 'diplome', ton: 'var(--red)', titre: 'Prêt étudiant', sous: p.fin_pret ? 'Fin en ' + p.fin_pret : 'À saisir une fois', val: p.dette === null ? '—' : eur(-p.dette), valCls: 'neg', clic: () => placer('pret'), chev: true })];
  dash.draw('v_comptes', (c) => {
    const v = V(), p = v.patrimoine, k = v.caisse.valeur;
    const tuile = (ic, couleur, t, b, s, cls) => { const d = el('div', 'v-tuile'), h = el('div', 't'), i = dessin(ic, 15); i.style.color = couleur; h.append(i, t); d.append(h, el('b', cls || '', b), el('small', '', s)); return d; };
    const tu = el('div', 'v-tuiles');
    tu.append(tuile('bouee', 'var(--green)', 'Matelas', String(p.matelas).replace('.', ',') + ' mois', 'de dépenses normales'),
      tuile('caisse', 'var(--orange)', 'Caisse', signe(k), 'enveloppes', k < 0 ? 'neg' : ''));
    c.replaceChildren(section('Comptes'), liste(lignesComptes(p)), tu);
  });
  dash.draw('v_coussin', (c) => {
    const k = V().coussin;
    if (!k.liste.length) { c.replaceChildren(section('Coussin du compte'), el('p', 'v-note', 'Importe un export récent de ta banque : son solde après chaque opération permet de suivre le coussin.')); return; }
    const mx = Math.max(...k.liste.map((x) => x.solde), k.seuil, 1);
    const rows = k.liste.slice().reverse().map((x) => ligne({ titre: cap(x.mois_lib), sous: 'Veille du salaire, le ' + x.jour.slice(0, 5) + (x.ecart === null ? '' : ' · ' + signe(x.ecart)),
      apres: barre(x.solde / mx, x.solde < k.seuil ? 'var(--red)' : 'var(--green)', k.seuil / mx), val: eur(x.solde), valCls: x.solde < k.seuil ? 'neg' : '' }));
    const min = el('label', 'v-ligne'); min.append(el('div', 'v-txt', 'Minimum souhaité'));
    const inp = el('input', 'v-input'); inp.type = 'text'; inp.inputMode = 'numeric'; inp.value = eur(k.seuil); inp.setAttribute('aria-label', 'Minimum souhaité pour le coussin');
    inp.onchange = () => { const n = nombre(inp.value); if (n >= 0) A.maj(Object.assign({}, A.bundle(), { coussin_min: n }), 'Minimum du coussin enregistré.'); else A.msg('Minimum invalide : rien n’a été changé.', true); };
    min.append(inp); rows.push(min);
    c.replaceChildren(section('Coussin du compte'), liste(rows), el('p', 'v-note', 'Ce qui reste sur le compte quand le mois se termine. Le trait marque ton minimum ; ta vraie sécurité reste le Livret A.'));
  });

  // Placements : feuille de saisie (une saisie invalide garde la feuille ouverte, avec l'erreur)
  let enCours = null;
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
      tr: ['Trade Republic', 'Le plus simple : importe l’export CSV de Trade Republic (bouton en haut de Patrimoine). Sinon, tape le solde espèces.', champ(0, 'Solde espèces (€)', p.tr)],
      pret: ['Prêt étudiant', 'Capital restant dû aujourd’hui, d’après ton tableau d’amortissement.', [...champ(0, 'Capital restant (€)', p.dette), ...champ(1, 'Taux annuel (%)', P.pret && P.pret.taux), ...champ(2, 'Mensualité (€)', P.pret && P.pret.mensualite), ...champ(3, 'Mois du déblocage (AAAA-MM, facultatif)', P.pret && P.pret.debut, 'texte')]]
    }[k];
    $('pl-titre').textContent = T[0]; $('pl-aide').textContent = T[1]; $('pl-champs').replaceChildren(...T[2]);
    A.ouvrir(dPl);
  };

  // ================= Opérations =================
  $('v-q').addEventListener('input', () => { ops.limite = 120; dash.draw('v_ops'); });
  dash.draw('v_ops_filtres', (c) => {
    const v = V(), mt = v.epargne.cle, box = el('div', 'v-filtres');
    const puce = (t, on, go) => { const b = el('button', 'v-puce' + (on ? ' on' : ''), t); b.type = 'button'; b.setAttribute('aria-pressed', String(on)); b.onclick = go; box.append(b); };
    const changer = (o) => { Object.assign(ops, o, { limite: 120 }); dash.draw('v_ops_filtres'); dash.draw('v_ops'); };
    puce(cap(MOIS_L[Number(v.mc.slice(5, 7)) - 1]), ops.mois === v.mc && !ops.depuis, () => changer({ mois: v.mc, depuis: '' }));
    puce(cap(MOIS_L[Number(mt.slice(5, 7)) - 1]), ops.mois === mt && !ops.depuis, () => changer({ mois: mt, depuis: '' }));
    puce('12 mois', !ops.mois && !ops.depuis, () => changer({ mois: '', depuis: '' }));
    const blocs = Array.from(new Set((dash.data('operations').data || []).map((r) => r.bloc))).sort();
    const sel = el('select', 'v-puce' + (ops.bloc ? ' on' : '')); sel.setAttribute('aria-label', 'Catégorie');
    sel.append(new Option('Toutes les catégories', ''), ...blocs.map((b) => new Option(b, b))); sel.value = ops.bloc;
    sel.onchange = () => changer({ bloc: sel.value, poste: '' }); box.append(sel);
    if (ops.poste) { const b = el('button', 'v-puce on'); b.type = 'button'; b.append(ops.poste, dessin('croix', 14)); b.setAttribute('aria-label', 'Retirer le filtre ' + ops.poste); b.onclick = () => changer({ poste: '' }); box.append(b); }
    if (ops.depuis) { const b = el('button', 'v-puce on'); b.type = 'button'; b.append('Depuis janvier', dessin('croix', 14)); b.onclick = () => changer({ depuis: '' }); box.append(b); }
    c.replaceChildren(box);
  });
  dash.draw('v_ops', (c) => {
    if (!ops.mois && !ops.bloc && !ops.poste && !ops.depuis && ops.init === undefined) { ops.init = true; ops.mois = V().mc; dash.draw('v_ops_filtres'); }
    const q = $('v-q').value.trim().toLowerCase();
    const l = (dash.data('operations').data || []).filter((r) => (!ops.mois || r.mois === ops.mois) && (!ops.bloc || r.bloc === ops.bloc) && (!ops.poste || r.poste === ops.poste) && (!ops.depuis || r.mois >= ops.depuis) &&
      (!q || (r.libelle + ' ' + r.poste + ' ' + r.bloc).toLowerCase().includes(q)))
      .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.id - a.id));
    const total = l.reduce((s, r) => s + Number(r.montant), 0), out = [el('p', 'v-note', l.length + ' opération' + (l.length > 1 ? 's' : '') + ' · ' + signe2(total))];
    out[0].style.margin = '10px 4px 0';
    let jour = null, rows = [];
    const fermer = () => { if (rows.length) out.push(liste(rows)); rows = []; };
    l.slice(0, ops.limite).forEach((r) => {
      if (r.date !== jour) { fermer(); jour = r.date; out.push(el('h3', 'v-jour', dateLongue(r.date))); }
      const nc = r.bloc === 'Non classé', m = Number(r.montant);
      rows.push(ligne({ ic: nc ? 'etiquette' : icone(r.poste), ton: nc ? 'var(--orange)' : ton(r.bloc), titre: r.libelle.replace(/\s+/g, ' '), sous: nc ? 'À classer' : r.poste, sousCls: nc ? 'orange' : '',
        val: signe2(m), valCls: m > 0 ? 'pos' : '', data: { op: String(r.id) }, clic: () => {} }));
    });
    fermer();
    if (l.length > ops.limite) { const b = el('button', 'app-btn v-plus', 'Afficher plus'); b.type = 'button'; b.onclick = () => { ops.limite += 200; dash.draw('v_ops'); }; out.push(b); }
    if (!l.length) out.push(el('p', 'v-note', 'Aucune opération ne correspond.'));
    c.replaceChildren(...out);
  });

  // ================= Réglages =================
  const corpsRefs = (type, note) => () => {
    const refs = A.bundle().references.filter((r) => r.type === type);
    return [liste(refs.map((r) => ligne({ titre: r.poste, sous: r.note || null, val: eur2(Number(r.montant)) + (type === 'Enveloppe annuelle' ? ' / an' : ''), data: { ref: r.id }, clic: () => {}, chev: true }))), el('p', 'v-note', note)];
  };
  const pageRefs = (type, titre, note) => pousser({ retour: 'Réglages', titre: () => titre, corps: corpsRefs(type, note) });
  const corpsPerso = () => {
    const l = A.bundle().regles_perso || [];
    if (!l.length) return [el('p', 'v-note', 'Aucune pour l’instant. Elles se créent quand tu reclasses une opération en cochant « Toujours classer ce marchand ici ».')];
    return [liste(l.map((p, i) => { const r = ligne({ titre: p.marchand, sous: p.poste + ' · ' + p.bloc }); const b = el('button', 'v-puce', 'Supprimer'); b.type = 'button'; b.style.color = 'var(--red)';
      b.onclick = () => A.maj(Object.assign({}, A.bundle(), { regles_perso: l.filter((x, j) => j !== i) }), 'Règle « ' + p.marchand + ' » supprimée.'); r.append(b); return r; })),
      el('p', 'v-note', 'Les supprimer ne change pas les opérations déjà classées.')];
  };
  const corpsRegles = () => [liste((dash.data('regles').data || []).map((r) => ligne({ titre: r.regle, sous: r.poste + ' · ' + r.bloc })))];
  const corpsCalcul = () => [liste([
    'Revenus du mois : salaire versé à la fin du mois précédent, plus la CAF et Action Logement reçues dans le mois.',
    'Somme à partager : revenus du mois, moins les charges fixes prévues, la part mensuelle des enveloppes et les montants prévus des charges variables.',
    'Budget loisirs du mois : ' + String(syn('part_loisirs') || (A.calc().datasets.references.find((r) => r.id === 'part_loisirs') || {}).montant).replace('.', ',') + ' % de la somme à partager, réparti entre les loisirs selon leur part. Le reste correspond à l’épargne.',
    'Enveloppes : ' + eur2(V().normal.env) + ' par mois vont dans la caisse des enveloppes, qui paie leurs dépenses. Les plafonds annuels repartent à zéro en janvier.',
    'Épargne à virer : revenus, moins les charges fixes passées, les loisirs et charges variables dépensés et la part des enveloppes. Un mois négatif est déduit du suivant. Suivi depuis octobre 2026, début du budget avec le prêt.',
    'Exclus : mouvements internes, titres-restaurant, revenus exceptionnels et dépenses hors budget. Les montants sont nets des remboursements.'
  ].map((t) => { const r = el('div', 'v-ligne'); r.append(el('div', 'v-txt', t)); r.querySelector('.v-txt').style.cssText = 'font-size:15px;line-height:1.4;padding:4px 0'; return r; }), true)];

  dash.draw('v_reglages', (c) => {
    const v = V(), n = v.normal, b = A.bundle(), p = v.patrimoine, out = [];
    // Le mois normal en une barre
    const carte = el('div', 'v-carte'), bar = el('div'), leg = el('div', 'v-gris');
    bar.style.cssText = 'display:flex;height:12px;border-radius:6px;overflow:hidden;margin-top:8px;gap:2px';
    leg.style.cssText = 'display:flex;flex-wrap:wrap;gap:4px 12px;margin-top:8px;font-size:13px';
    const parts = [['Fixes', n.fixes, 'var(--gray)'], ['Variables', n.variables, 'var(--blue)'], ['Enveloppes', n.env, 'var(--orange)'], ['Loisirs', n.loisirs, 'var(--indigo)'], ['Épargne', Math.max(0, n.epargne), 'var(--green)']];
    parts.forEach(([t, x, co]) => { const i = el('i'); i.style.cssText = 'flex:' + Math.max(0.01, x) + ';background:' + co; bar.append(i); const s = el('span'), d = el('i'); d.style.cssText = 'display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:5px;background:' + co; s.append(d, t + ' ' + nf0.format(Math.round(x))); leg.append(s); });
    const t = el('div', 'v-gris', 'Un mois normal · ' + eur(n.revenus) + ' de revenus'); t.style.fontSize = '13px';
    carte.append(t, bar, leg); out.push(carte);
    out.push(liste([
      ligne({ ic: 'billet', ton: 'var(--green)', titre: 'Revenus', val: eur(n.revenus), valCls: 'v-gris', clic: () => pageRefs('Revenu', 'Revenus', 'Moyennes d’un mois normal. Le budget du mois suit les revenus vraiment reçus.'), chev: true }),
      ligne({ ic: 'maison', ton: 'var(--gray)', titre: 'Charges fixes', val: eur(n.fixes), valCls: 'v-gris', clic: () => pageRefs('Charge fixe', 'Charges fixes', 'Montants prélevés chaque mois. Touche un montant pour le modifier.'), chev: true }),
      ligne({ ic: 'panier', ton: 'var(--blue)', titre: 'Charges variables', val: eur(n.variables), valCls: 'v-gris', clic: () => pageRefs('Charge variable', 'Charges variables', 'Plafonds mensuels fixes.'), chev: true }),
      ligne({ ic: 'cadeau', ton: 'var(--orange)', titre: 'Enveloppes', sous: eur(n.env * 12) + ' par an', val: eur(n.env) + ' / mois', valCls: 'v-gris', clic: () => pageRefs('Enveloppe annuelle', 'Enveloppes', 'Montants pour l’année. Un douzième part chaque mois dans la caisse des enveloppes.'), chev: true }),
      ligne({ ic: 'resto', ton: 'var(--indigo)', titre: 'Loisirs', sous: 'Ce mois-ci : ' + eur(v.prevu.loisirs), val: eur(n.loisirs), valCls: 'v-gris', clic: () => pageRefs('Loisir', 'Loisirs', 'Montants d’un mois normal. Chaque mois, le budget loisirs suit les revenus reçus.'), chev: true }),
      ligne({ ic: 'pieces', ton: 'var(--green)', titre: 'Épargne prévue', sous: 'Ce qui reste d’un mois normal', val: eur(n.epargne), valCls: 'v-gris' })]));
    out.push(liste([
      ligne({ ic: 'etiquette', ton: 'var(--orange)', titre: 'Règles « toujours ce marchand »', val: String((b.regles_perso || []).length), valCls: 'v-gris', clic: () => pousser({ retour: 'Réglages', titre: () => 'Mes règles', corps: corpsPerso }), chev: true }),
      ligne({ ic: 'liste', ton: 'var(--gray)', titre: 'Règles de classement', val: String((dash.data('regles').data || []).length), valCls: 'v-gris', clic: () => pousser({ retour: 'Réglages', titre: () => 'Classement', corps: corpsRegles }), chev: true }),
      ligne({ ic: 'etincelle', ton: 'var(--indigo)', titre: 'Recalcul de janvier', sous: 'Propose des montants à partir des 12 derniers mois', clic: () => $('app-proposer').onclick(), chev: true }),
      ligne({ ic: 'calcul', ton: 'var(--blue)', titre: 'Comment c’est calculé', clic: () => pousser({ retour: 'Réglages', titre: () => 'Calculs', corps: corpsCalcul }), chev: true })]));
    out.push(section('Placements'), liste(lignesComptes(p)));
    const sav = b.sauvegarde_le;
    out.push(section('Données'), liste([
      ligne({ ic: 'disque', ton: 'var(--blue)', titre: 'Sauvegarder', sous: sav ? 'Dernière : ' + new Date(sav).toLocaleDateString('fr-FR') : 'Jamais sauvegardé', sousCls: sav ? '' : 'orange', clic: () => A.sauvegarder(), chev: true }),
      ligne({ ic: 'import', ton: 'var(--gray)', titre: 'Importer', sous: 'Banque, Trade Republic ou sauvegarde', clic: () => $('app-file').click(), chev: true })]));
    c.replaceChildren(...out);
  });

  majHaut();
})();
