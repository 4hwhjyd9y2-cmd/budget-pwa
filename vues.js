// Écrans de l'appli, dans le style d'une appli iOS : Ce mois-ci, Épargne, Patrimoine, Opérations, Réglages,
// pages poussées (détail d'un groupe, fin de mois, répartition, projections, réglages) et feuille « Je veux acheter ».
// Un écran = une question et un seul grand chiffre ; le détail s'ouvre en touchant une ligne. Calculs dans moteur.js (calc.vue).
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
    cible: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
    boussole: '<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5Z"/>',
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
  const ICONES = [[/resto|bar|sortie/i, 'resto'], [/v[eê]tement/i, 'vetement'], [/tabac/i, 'tabac'], [/^c\.?s?\.?e\.?$/i, 'etiquette'], [/soin|coiff/i, 'ciseaux'], [/carbur|p[ée]age/i, 'carburant'], [/course/i, 'panier'],
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
  // o : { ic, ton, titre, apres (jauge), sous, sousCls, val, valSous, valCls, clic, chev, data, haut, total, court }
  const ligne = (o) => {
    const r = el(o.clic ? 'button' : 'div', 'v-ligne' + (o.haut ? ' haut' : '') + (o.total ? ' total' : '')); if (o.clic) { r.type = 'button'; r.onclick = o.clic; }
    if (o.data) Object.entries(o.data).forEach(([k, v]) => { r.dataset[k] = v; });
    if (o.ic) r.append(carre(o.ic, o.ton));
    const t = el('div', 'v-txt'); const b = el('b', '', o.titre); if (o.court) b.dataset.court = '1'; t.append(b); if (o.apres) t.append(o.apres); if (o.sous) t.append(el('small', o.sousCls || '', o.sous));
    r.append(t);
    if (o.val !== undefined && o.val !== null) { const v = el('div', 'v-val' + (o.valCls ? ' ' + o.valCls : ''), o.val); if (o.valSous) v.append(el('small', '', o.valSous)); r.append(v); }
    if (o.chev) r.append(chev());
    return r;
  };
  const liste = (rows, nu) => { const l = el('div', 'v-liste' + (nu ? ' nu' : '')); l.append(...rows); return l; };
  const section = (titre, bouton, go) => { const h = el('h2', 'v-section', titre); if (bouton) { const b = el('button', '', bouton); b.type = 'button'; b.onclick = go; h.append(b); } return h; };
  const barre = (pct, couleur, repere) => { const b = el('div', 'v-barre'), i = el('i'); i.style.width = Math.max(0, Math.min(100, pct * 100)) + '%'; i.style.background = couleur; b.append(i); if (repere !== undefined && repere !== null) { const m = el('b'); m.style.left = Math.min(99, repere * 100) + '%'; b.append(m); } return b; };

  // ---------- Navigation : onglets, page poussée, barre compacte ----------
  const montrer = (nom) => {
    const tabs = [...document.querySelectorAll('.bm-tab')];
    if (!tabs.some((t) => t.dataset.tab === nom)) nom = 'reste';
    tabs.forEach((t) => t.setAttribute('aria-selected', String(t.dataset.tab === nom)));
    document.querySelectorAll('.bm-page').forEach((p) => { p.hidden = p.id !== nom; });
  };
  const onglet = (n) => { document.querySelector('.bm-tab[data-tab="' + n + '"]').click(); };
  document.querySelectorAll('.bm-tab').forEach((t) => t.addEventListener('click', () => { montrer(t.dataset.tab); history.replaceState(null, '', '#' + t.dataset.tab); window.scrollTo(0, 0); majHaut(); }));
  montrer(location.hash.slice(1));
  document.querySelectorAll('[data-importer]').forEach((b) => { b.onclick = () => $('app-file').click(); });

  let page = null;
  const pageEl = $('v-page'); pageEl.dataset.draw = 'v_page';
  const pousser = (p) => { page = p; dash.draw('v_page'); pageEl.scrollTop = 0; pageEl.classList.add('on'); document.body.style.overflow = 'hidden'; setTimeout(() => $('v-retour').focus({ preventScroll: true }), 50); };
  const fermerPage = () => { pageEl.classList.remove('on'); pageEl.style.transform = ''; document.body.style.overflow = ''; page = null; };
  dash.draw('v_page', () => { if (!page) return; $('v-retour-txt').textContent = page.retour || 'Retour'; $('v-page-titre').textContent = page.titre(); const s = page.sous ? page.sous() : ''; $('v-page-sous').textContent = s; $('v-page-sous').hidden = !s; $('v-page-corps').replaceChildren(...page.corps()); });
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

  // ================= Chiffres affichés =================
  // Des euros entiers, et chaque total est la somme des lignes affichées (Moteur.entiers).
  const M = window.Moteur;
  const som = (l) => l.reduce((s, x) => s + x, 0);
  const note = (t) => el('p', 'v-note', t);
  const dec1 = (x) => String(Math.round(Number(x) * 10) / 10).replace('.', ',');
  const pc = (x) => (x < 0 ? '−' : '') + sp(new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 1, minimumFractionDigits: 1 }).format(Math.abs(x * 100))) + ' %';
  const pc0 = (x) => { const n = Math.round(x * 100); return (n < 0 ? '−' : '') + Math.abs(n) + ' %'; };
  const GROUPES = { Loisirs: ['Loisirs', 'resto', 'var(--indigo)'], 'Charges variables': ['Charges variables', 'panier', 'var(--blue)'] };
  const vueMois = () => {
    const v = V(), groupe = (bloc) => {
      const l = v.postes.filter((r) => r.bloc === bloc), d = M.entiers(l.map((r) => Number(r.depense))), b = M.entiers(l.map((r) => Number(r.seuil)));
      return { lignes: l.map((r, i) => ({ r, d: d[i], b: b[i], reste: b[i] - d[i] })), d: som(d), b: som(b), reste: som(b) - som(d) };
    };
    const loi = groupe('Loisirs'), vari = groupe('Charges variables');
    const env = { d: Math.round(v.depense.env), b: Math.round(v.prevu.env) }; env.reste = env.b - env.d;
    return { loi, vari, env, D: loi.d + vari.d + env.d, B: loi.b + vari.b + env.b, reste: loi.reste + vari.reste + env.reste, jours: v.nbJours - v.auj };
  };
  const resteTxt = (r) => (r >= 0 ? { val: eur(r), valSous: 'restants' } : { val: eur(-r), valSous: 'de trop', valCls: 'neg' });
  const jauge = (d, b, couleur) => barre(b > 0 ? d / b : d > 0 ? 1 : 0, d > b ? 'var(--red)' : couleur);
  const calcul = (rows) => { const l = liste(rows, true); l.classList.add('v-calc'); return l; };
  const moins = (x) => (x > 0 ? '−' : x < 0 ? '+' : '') + eur(Math.abs(x));

  // ================= Ce mois-ci : combien je peux encore dépenser =================
  dash.draw('v_mois_titre', (h) => { h.textContent = cap(MOIS_L[Number(V().mc.slice(5, 7)) - 1]); });
  dash.draw('v_mois_sous', (p) => { const e = A.bundle().export; p.textContent = e ? 'Relevé du ' + Number(e.slice(8, 10)) + ' ' + moisCourt(e) : ''; });

  const finAjustee = () => { const v = V(), e = v.epargne; return v.fin - (e.laisse ? 0 : e.manque) + Math.min(0, v.caisse.valeur); };
  dash.draw('v_heros', (c) => {
    const v = V(), m = vueMois(), trop = m.reste < 0, fin = v.nbJours + ' ' + moisCourt(v.mc);
    const j = barre(m.B > 0 ? m.D / m.B : 0, trop ? 'var(--red)' : 'var(--blue)', v.auj / v.nbJours); j.classList.add('grande');
    const jl = el('div', 'v-entre'); jl.append(el('span', '', eur(m.D) + ' dépensés'), el('span', '', 'sur ' + eur(m.B)));
    const b = el('button', 'app-btn primary v-bouton', 'Je veux acheter…'); b.type = 'button'; b.onclick = () => ouvrirAchat();
    c.replaceChildren(el('div', 'lab', trop ? 'Tu as dépassé ton budget de' : 'Il te reste à dépenser'), el('div', 'montant' + (trop ? ' neg' : ''), eur(Math.abs(m.reste))),
      el('div', 'lab', !trop && m.jours > 0 ? 'soit ' + eur(m.reste / m.jours) + ' par jour jusqu’au ' + fin : 'Le mois se termine le ' + fin), j, jl, b);
  });

  // Épargne par mois, en euros entiers (servent à Ce mois-ci et à l'onglet Épargne)
  const nomDe = (k) => MOIS_L[Number(k.slice(5, 7)) - 1];
  // Euros entiers d'un mois : chaque ligne du calcul arrondie seule, le total calculé à partir des lignes affichées
  const chiffresMois = (x) => {
    const k = x.calcul, l = x.etat === 'prevu'
      ? [['Aujourd’hui', k.aujourdhui, 'Revenus moins dépenses passées'], ['Reste des loisirs et variables', -k.reste_budget], ['Charges fixes à venir', -k.fixes_venir], ['Part des enveloppes', -k.env_venir], ['Report du mois d’avant', k.report], ['Trou de la caisse', -k.trou]]
      : [['Revenus ' + de(nomDe(x.cle)), k.revenus], ['Charges fixes', -k.fixes], ['Loisirs et variables', -k.depenses], ['Part des enveloppes', -k.enveloppes], ['Trou de la caisse', -k.trou], ['Report du mois d’avant', k.report]];
    const lignes = l.map(([t, n, s]) => ({ t, n: Math.round(n), s })).filter((y, i) => i === 0 || y.n !== 0);
    const a = som(lignes.map((y) => y.n)), v = Math.round(x.vire);
    return { lignes, a, v, reste: Math.max(0, a - v), trop: Math.max(0, v - Math.max(0, a)), retraits: Math.round(x.retraits) };
  };
  const vires = (v) => eur(v) + (v > 1 ? ' virés' : ' viré');
  const termines = () => (V().epargne_mois || []).filter((x) => x.etat === 'termine');
  const aVirerAffiche = () => som(termines().map((x) => chiffresMois(x).reste));

  // Ce qui demande une action, et rien d'autre
  const pageMt = () => pousser({ retour: 'Épargne', titre: () => cap(V().epargne.mois), sous: () => 'Mois terminé : plafonds et charges fixes', corps: corpsMt });
  dash.draw('v_afaire', (c) => {
    const v = V(), e = v.epargne, mt = e.mois.split(' ')[0], rows = [];
    const aVirer = aVirerAffiche();
    if (aVirer > 0) rows.push(ligne({ ic: 'envoi', ton: 'var(--teal)', titre: eur(aVirer) + ' à virer', clic: () => onglet('epargne'), chev: true }));
    if (v.nc) rows.push(ligne({ ic: 'etiquette', ton: 'var(--orange)', titre: v.nc + ' opération' + (v.nc > 1 ? 's' : '') + ' à classer', clic: () => voirOps({ bloc: 'Non classé' }), chev: true }));
    if (v.fixKo.length) rows.push(ligne({ ic: 'recu', ton: 'var(--orange)', titre: 'Charges fixes ' + de(mt) + ' à vérifier', clic: pageMt, chev: true }));
    c.replaceChildren(...(rows.length ? [liste(rows)] : []));
  });

  // Où tu en es : trois groupes lus de la même façon (dépensé sur budget à gauche, reste à droite)
  dash.draw('v_ou', (c) => {
    const m = vueMois();
    const g = (bloc, G) => ligne(Object.assign({ haut: true, ic: GROUPES[bloc][1], ton: G.reste < 0 ? 'var(--red)' : GROUPES[bloc][2], titre: GROUPES[bloc][0], apres: jauge(G.d, G.b, GROUPES[bloc][2]), sous: eur(G.d) + ' dépensés sur ' + eur(G.b), chev: true, clic: () => pageGroupe(bloc) }, resteTxt(G.reste)));
    c.replaceChildren(section('Où tu en es'), liste([g('Loisirs', m.loi), g('Charges variables', m.vari),
      ligne(Object.assign({ haut: true, ic: 'cadeau', ton: m.env.reste < 0 ? 'var(--red)' : 'var(--orange)', titre: 'Enveloppes', apres: jauge(m.env.d, m.env.b, 'var(--orange)'), sous: eur(m.env.d) + ' dépensés sur ' + eur(m.env.b), chev: true, clic: () => pageEnv() }, resteTxt(m.env.reste)))]));
  });

  // Détail d'un groupe : ses postes, lus comme le groupe
  const pageGroupe = (bloc) => pousser({
    retour: 'Ce mois-ci', titre: () => GROUPES[bloc][0],
    sous: () => { const G = vueMois()[bloc === 'Loisirs' ? 'loi' : 'vari']; return eur(G.d) + ' dépensés sur ' + eur(G.b) + ' · ' + (G.reste >= 0 ? eur(G.reste) + ' restants' : eur(-G.reste) + ' de trop'); },
    corps: () => [
      liste(vueMois()[bloc === 'Loisirs' ? 'loi' : 'vari'].lignes.map((p) => ligne(Object.assign({ haut: true, ic: icone(p.r.poste), ton: p.reste < 0 ? 'var(--red)' : GROUPES[bloc][2], titre: p.r.poste, apres: jauge(p.d, p.b, GROUPES[bloc][2]), sous: eur(p.d) + ' sur ' + eur(p.b), chev: true, clic: () => voirOps(p.r) }, resteTxt(p.reste))))),
      note(bloc === 'Loisirs' ? 'Touche un poste pour voir ses opérations. Le budget loisirs suit tes revenus du mois ; il se règle dans Réglages.' : 'Touche un poste pour voir ses opérations. Ces plafonds sont fixes ; ils se règlent dans Réglages.')
    ]
  });
  const pageEnv = () => pousser({
    retour: 'Ce mois-ci', titre: () => 'Enveloppes', sous: () => 'Plafonds de l’année ' + V().mc.slice(0, 4),
    corps: () => { const v = V(), m = vueMois(); return [
      liste(v.enveloppes.map((r) => { const d = Math.round(Number(r.depense)), b = Math.round(Number(r.seuil)); return ligne(Object.assign({ haut: true, ic: icone(r.poste), ton: b - d < 0 ? 'var(--red)' : 'var(--orange)', titre: r.poste, apres: jauge(d, b, 'var(--orange)'), sous: eur(d) + ' sur ' + eur(b) + ' cette année', chev: true, clic: () => voirOps(r) }, resteTxt(b - d))); })),
      note('Chaque mois, ' + eur(m.env.b) + ' partent dans la caisse des enveloppes, qui paie ces dépenses. Ce mois-ci : ' + eur(m.env.d) + ' dépensés.')
    ]; }
  });

  // ================= Épargne : combien dois-je virer aujourd'hui =================
  // Le mois en cours (prévision), puis les 3 derniers mois terminés. Mois civil : un virement compte pour le mois de sa date,
  // ou pour le mois auquel il est rattaché dans Opérations.
  const ligneMois = (x) => {
    const k = chiffresMois(x), nom = cap(nomDe(x.cle)), ouvrir = () => pageMoisEp(x.cle);
    if (x.etat === 'prevu') {
      const r = ligne({ haut: true, ic: 'calendrier', ton: 'var(--gray)', titre: nom, apres: barre(k.a > 0 ? k.v / k.a : 0, 'var(--gray)'), sous: vires(k.v) + ' sur ' + eur(Math.max(0, k.a)) + ' prévus', val: eur(k.reste), valSous: 'prévu', valCls: 'v-gris', chev: true, clic: ouvrir });
      r.classList.add('prevu'); return r;
    }
    if (k.a < 0) return ligne({ haut: true, ic: 'baisse', ton: 'var(--orange)', titre: nom, sous: 'Fini à ' + eur(k.a), val: '0 €', valSous: x.laisse ? 'laissé filer' : 'reporté', chev: true, clic: ouvrir });
    if (k.reste > 0) return ligne({ haut: true, ic: 'calendrier', ton: 'var(--red)', titre: nom, apres: barre(k.a > 0 ? k.v / k.a : 0, 'var(--green)'), sous: vires(k.v) + ' sur ' + eur(k.a), val: eur(k.reste), valSous: 'à virer', valCls: 'neg', chev: true, clic: ouvrir });
    const r = ligne({ haut: true, ic: 'ok', ton: 'var(--green)', titre: nom, apres: barre(1, 'var(--green)'), sous: vires(k.v) + ' sur ' + eur(k.a), val: '', valSous: k.trop ? '+' + eur(k.trop) : 'soldé', chev: true, clic: ouvrir });
    const vv = r.querySelector('.v-val'); vv.classList.add('pos'); vv.prepend(dessin('ok', 20));
    return r;
  };
  dash.draw('v_ep_sous', (p) => { const e = A.bundle().export; p.textContent = e ? 'Relevé du ' + Number(e.slice(8, 10)) + ' ' + moisCourt(e) : ''; });
  dash.draw('v_ep', (c) => {
    const v = V(), out = [], total = aVirerAffiche();
    const dus = termines().filter((x) => chiffresMois(x).reste > 0).map((x) => nomDe(x.cle));
    const h = el('div', 'v-carte v-heros');
    if (total > 0) h.append(el('div', 'lab', 'À virer aujourd’hui'), el('div', 'montant', eur(total)), el('div', 'lab', 'Pour ' + (dus.length > 1 ? dus.slice(0, -1).join(', ') + ' et ' + dus[dus.length - 1] : dus[0])));
    else h.append(el('div', 'lab', 'À virer aujourd’hui'), el('div', 'montant pos', '0 €'), el('div', 'lab', termines().length ? 'Tout est viré' : 'Pas encore de mois terminé'));
    out.push(h, section('Mois par mois'), liste((v.epargne_mois || []).map(ligneMois)));
    const k = v.caisse.valeur;
    out.push(liste([
      ligne({ ic: 'caisse', ton: k < 0 ? 'var(--orange)' : 'var(--green)', titre: 'Caisse des enveloppes', sous: k < 0 ? 'À rattraper sur l’épargne' : 'D’avance pour les enveloppes', val: signe(k), valCls: k < 0 ? 'neg' : '' }),
      ligne({ ic: 'boussole', ton: 'var(--teal)', titre: 'Et si… (projections)', clic: () => pageProj(), chev: true })]));
    $('pt-epargne').hidden = !(total > 0);
    c.replaceChildren(...out);
  });

  // Détail d'un mois : le calcul, ce qui est déjà viré, les virements comptés, et pour le mois terminé ses plafonds
  const pageMoisEp = (cle) => pousser({
    retour: 'Épargne', titre: () => cap(nomDe(cle)),
    sous: () => { const x = (V().epargne_mois || []).find((y) => y.cle === cle); return x ? (x.etat === 'prevu' ? 'Mois en cours · prévision' : 'Mois terminé') : ''; },
    corps: () => {
      const v = V(), x = (v.epargne_mois || []).find((y) => y.cle === cle); if (!x) return [note('Ce mois n’est plus dans la liste.')];
      const k = chiffresMois(x), prevu = x.etat === 'prevu', out = [];
      out.push(calcul(k.lignes.map((y, i) => ligne({ titre: y.t, sous: y.s, val: i === 0 ? (prevu ? signe(y.n) : eur(y.n)) : (y.n < 0 ? '−' + eur(-y.n) : '+' + eur(y.n)) }))
        .concat([ligne({ titre: prevu ? 'Prévu à épargner' : 'À épargner', val: eur(k.a), valCls: k.a < 0 ? 'neg' : '', total: true })])));
      out.push(calcul([ligne({ titre: 'Déjà viré', val: moins(k.v) }), ligne({ titre: 'Reste à virer', val: eur(k.reste), total: true })]));
      if (prevu) out.push(note('C’est une prévision : le reste du budget est compté comme dépensé au rythme prévu. Le montant exact sera connu à la fin du mois.'));
      else if (k.a < 0) {
        const b = el('button', 'app-btn v-bouton', x.laisse ? 'Finalement, le reporter' : 'Laisser filer'); b.type = 'button';
        b.onclick = () => { const bu = A.bundle(), l = Object.assign({}, bu.deficits_laisses || {}); if (x.laisse) delete l[cle]; else l[cle] = true; A.maj(Object.assign({}, bu, { deficits_laisses: l }), x.laisse ? 'Le manque sera reporté sur le mois suivant.' : 'Manque laissé filer : rien n’est reporté.'); };
        out.push(b, note(x.laisse ? 'Laissé filer : ce manque a été pris sur ton compte courant, sans être déduit du mois suivant.' : 'Ce manque est déduit du mois suivant. Laisser filer : tu acceptes qu’il soit pris sur ton compte courant.'));
      } else if (k.trop) out.push(note(eur(k.trop) + ' virés en plus : ils réduisent ce qu’il faudra virer le mois suivant.'));
      const ops = (dash.data('operations').data || []).filter((o) => x.virements.includes(o.id)).sort((a, b) => (a.date < b.date ? -1 : 1));
      out.push(section('Virements comptés'));
      if (!ops.length) out.push(note('Aucun pour l’instant. Un virement fait plus tard peut être rattaché à ce mois depuis Opérations.'));
      else out.push(liste(ops.map((o) => ligne({ ic: 'envoi', ton: 'var(--teal)', court: true, titre: M.nomCourt(o.libelle), sous: Number(o.date.slice(8, 10)) + ' ' + moisCourt(o.date) + (o.mois_epargne ? ' · rattaché' : ''), val: eur2(-Number(o.montant)), data: { op: String(o.id) }, clic: () => {}, chev: true }))));
      if (k.retraits > 0) out.push(note('Retiré de l’épargne ce mois-là : ' + eur(k.retraits) + '. Un retrait ne compte pas dans « Déjà viré ».'));
      if (cle === v.epargne.cle) out.push(liste([ligne({ ic: 'recu', ton: v.fixKo.length ? 'var(--orange)' : 'var(--gray)', titre: 'Plafonds et charges fixes', sous: v.fixKo.length ? 'Charges fixes à vérifier' : '', sousCls: 'orange', clic: pageMt, chev: true })]));
      return out;
    }
  });

  // ---------- Mois terminé (page poussée) ----------
  const corpsMt = () => {
    const v = V(), e = v.epargne, out = [];
    const rows = (dash.data('mois_courant').data || []).filter((r) => r.bloc === 'Loisirs' || r.bloc === 'Charges variables');
    const d = M.entiers(rows.map((r) => Number(r.depense))), b = M.entiers(rows.map((r) => Number(r.seuil))), reste = som(b) - som(d);
    const tp = section('Plafonds'); tp.append(el('span', 'v-pastille' + (reste < 0 ? ' r' : ''), reste < 0 ? eur(-reste) + ' de trop' : eur(reste) + ' restants'));
    out.push(tp, liste(rows.map((r, i) => ligne(Object.assign({ haut: true, ic: icone(r.poste), ton: b[i] - d[i] < 0 ? 'var(--red)' : ton(r.bloc), titre: r.poste, apres: jauge(d[i], b[i], ton(r.bloc)), sous: eur(d[i]) + ' sur ' + eur(b[i]), chev: true, clic: () => voirOps(Object.assign({}, r, { mois: e.cle })) }, resteTxt(b[i] - d[i]))))));
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
      // Le « Oui » n'est donné que si le mois, report et caisse compris, ne finit pas déjà dans le négatif
      const fa = finAjustee();
      if (m <= reste && fa >= 0) out.push(verdict('ok', 'var(--green)', 'Oui, c’est dans ton budget', 'Il restera ' + eur(reste - m) + ' en ' + l.poste + ' ce mois-ci.'));
      else if (m <= reste) out.push(verdict('alerte', 'var(--orange)', 'Dans le budget du poste, mais ton mois est déjà négatif', 'Il restera ' + eur(reste - m) + ' en ' + l.poste + ', mais avec le report et la caisse ton mois finit à ' + signe(fa) + '. Chaque euro dépensé creuse ce trou.'));
      else {
        const dep = m - Math.max(0, reste), autres = v.postes.filter((x) => x.id !== l.id).reduce((s, x) => s + Math.max(0, Number(x.reste)), 0);
        out.push(verdict('alerte', 'var(--orange)', 'Ça dépasse de ' + eur(dep), 'Il reste ' + eur(Math.max(0, reste)) + ' en ' + l.poste + '. Compense sur tes autres postes (' + eur(autres) + ' restants), sinon ton mois passe de ' + signe(fa) + ' à ' + signe(fa - dep) + '.'));
        if (reste > 0 && fa >= 0) out.push(verdict('ok', 'var(--green)', 'Jusqu’à ' + eur(reste) + ', c’est bon', 'Le montant maximum sans toucher à l’épargne ni aux autres postes.'));
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
  const ouvrirAchat = () => { const v = V(); if (!choix) choix = { type: 'mois', id: v.postes[0].id }; $('ach-m').value = ''; puces(); repondre(); A.ouvrir(dAch); setTimeout(() => $('ach-m').focus(), 300); };
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
    if (!p.complet) { const b = el('button', 'app-btn', 'Compléter mes placements'); b.type = 'button'; b.style.cssText = 'width:100%;margin-top:12px'; b.onclick = () => placer(p.livret === null ? 'livret' : p.pea === null ? 'pea' : p.tr === null ? 'tr' : 'pret'); out.push(b); }
    c.replaceChildren(...out);
  });
  // Les comptes ne sont affichés qu'ici
  dash.draw('v_comptes', (c) => {
    const p = V().patrimoine;
    c.replaceChildren(section('Comptes'), liste([
      ligne({ ic: 'banque', ton: 'var(--green)', titre: 'Livret A', sous: p.livret === null ? 'À saisir une fois' : dec1(p.matelas) + ' mois de dépenses', val: p.livret === null ? '—' : eur(p.livret), clic: () => placer('livret'), chev: true }),
      ligne({ ic: 'hausse', ton: 'var(--indigo)', titre: 'PEA', sous: p.pea_date ? 'Valeur du ' + p.pea_date.slice(0, 5) : 'À saisir', val: p.pea === null ? '—' : eur(p.pea), clic: () => placer('pea'), chev: true }),
      ligne({ ic: 'portefeuille', ton: 'var(--blue)', titre: 'Trade Republic', sous: p.tr_date ? 'Solde au ' + p.tr_date.slice(0, 5) : 'Importe son export', val: p.tr === null ? '—' : eur(p.tr), clic: () => placer('tr'), chev: true }),
      ligne({ ic: 'diplome', ton: 'var(--red)', titre: 'Prêt étudiant', sous: p.fin_pret ? 'Fin en ' + p.fin_pret : 'À saisir une fois', val: p.dette === null ? '—' : eur(-p.dette), valCls: 'neg', clic: () => placer('pret'), chev: true })]));
  });
  // Ma répartition : le repère 50 / 30 / 20 sur les mois terminés, en moyenne ou sur le mois dernier
  let periodeRep = 'moy';
  const pageRepere = () => pousser({
    retour: 'Réglages', titre: () => 'Ma répartition', sous: () => 'Face au repère 50 / 30 / 20',
    corps: () => {
      const v = V(), out = [];
      if (!v.reel.mois.length) return [note('Pas encore de mois terminé : ta répartition s’affichera après ton premier mois complet.')];
      if (!v.dernier) periodeRep = 'moy';
      const seg = el('div', 'v-segment'); seg.setAttribute('role', 'group');
      [['moy', 'Moyenne ' + v.reel.mois.length + ' mois'], ['der', 'Mois dernier']].forEach(([id, t]) => { if (id === 'der' && !v.dernier) return; const b = el('button', '', t); b.type = 'button'; b.setAttribute('aria-pressed', String(periodeRep === id)); b.onclick = () => { periodeRep = id; dash.draw('v_page'); }; seg.append(b); });
      out.push(seg);
      const Re = periodeRep === 'der' ? v.dernier : v.reel;
      const pts = (x) => dec1(Math.abs(x)) + (Math.abs(x) >= 2 ? ' pts' : ' pt');
      const [eo, ep, ee] = M.entiers([Re.obligations, Re.plaisir, Re.epargne]);
      out.push(liste([['Obligations', 'maison', 'var(--blue)', Re.pct.obligations, eo, 0.5, false], ['Plaisir', 'resto', 'var(--indigo)', Re.pct.plaisir, ep, 0.3, false], ['Épargne', 'cible', 'var(--green)', Re.pct.epargne, ee, 0.2, true]].map(([n, ic, col, p, e, cible, auDessus]) => {
        const ec = (p - cible) * 100, bon = auDessus ? ec >= -0.05 : ec <= 0.05;
        const r = ligne({ haut: true, ic, ton: col, titre: n, apres: barre(Math.max(0, p), bon ? col : 'var(--orange)', cible), sous: eur(e) + ' par mois · repère ' + pc0(cible), val: pc(p) });
        const ecs = el('small', bon ? 'pos' : 'orange', (ec >= 0 ? '+' : '−') + pts(ec)); ecs.style.fontWeight = '600'; r.querySelector('.v-val').append(ecs);
        return r;
      })));
      const per = periodeRep === 'der' ? cap(M.moisLabel(Re.mois[0])) : 'En moyenne de ' + M.moisLabel(Re.mois[0]) + ' à ' + M.moisLabel(Re.mois[Re.mois.length - 1]);
      out.push(note(per + ', sur ' + eur(eo + ep + ee) + ' de revenus réels par mois (hors revenus exceptionnels). Le trait de chaque jauge marque le repère. Obligations : charges fixes, charges variables, santé, entretien. Plaisir : loisirs, cadeaux, achats divers, voyages.'));
      return out;
    }
  });

  // Projections : aucune question n'est obligatoire, une réponse vide est remplacée par une hypothèse (en bleu)
  const SCEN = [['conges', 'Congés'], ['baisse', 'Salaire'], ['projet', 'Projet']];
  const TITRE_SCEN = { conges: 'Des congés sans solde', baisse: 'Une baisse de salaire', projet: 'Un projet à financer' };
  const QUESTIONS = {
    conges: [['jours', 'Jours sans solde', 'jours'], ['mois', 'Quel mois ?', 'mois'], ['par_jour', 'Perte par jour', '€']],
    baisse: [['salaire', 'Nouveau salaire', '€']],
    projet: [['montant', 'Coût du projet', '€'], ['mois', 'Pour quand ?', 'mois'], ['deja', 'Déjà mis de côté', '€']]
  };
  let scen = 'conges';
  const repProj = { conges: {}, baisse: {}, projet: {} };
  try { const x = JSON.parse(localStorage.getItem('budget-proj') || 'null'); if (x) SCEN.forEach(([k]) => { if (x[k] && typeof x[k] === 'object') repProj[k] = x[k]; }); } catch (e) {}
  const resultatProj = (zone) => {
    const calc = A.calc(), b = calc.vue.base, r = M.projeter(scen, repProj[scen], calc), x = r.res, H = r.hyp, out = [], hyps = [];
    const lh = (k, t) => { if (H[k]) hyps.push(t); };
    const mois1 = (n) => dec1(n) + ' mois';
    const carteGros = (lab, val, sous, cls) => { const k = el('div', 'v-carte'); k.append(el('div', 'v-gris', lab)); k.append(el('div', 'v-gros' + (cls ? ' ' + cls : ''), val)); if (sous) k.append(el('div', 'v-gris', sous)); return k; };
    const salTxt = (b.reel ? 'salaire moyen' : 'salaire de référence') + ' de ' + eur(b.salaire);
    if (scen === 'conges') {
      lh('jours', x.jours + ' jours'); lh('mois', 'en ' + x.mois_lib); lh('par_jour', eur(x.par_jour) + ' par jour (' + salTxt + ' ÷ 21,7 jours travaillés)');
      out.push(carteGros('À mettre de côté avant ' + x.mois_lib, eur(x.total), 'soit ' + eur(x.par_mois) + ' par mois pendant ' + x.n + ' mois'));
      const l = [ligne({ titre: 'Ton épargne ces mois-là', val: pc0(x.epargne_avant) + ' → ' + pc0(x.epargne_pendant), valCls: x.epargne_pendant < 0 ? 'neg' : '' }),
        ligne({ titre: 'Sans rien mettre de côté', sous: cap(x.mois_lib) + ' finirait à', val: eur(x.sans_rien), valCls: x.sans_rien < 0 ? 'neg' : '' })];
      if (r.reserve !== null) l.push(ligne({ titre: 'Ton Livret A couvre', val: mois1(r.reserve) }));
      out.push(liste(l, true));
    } else if (scen === 'baisse') {
      lh('salaire', eur(x.salaire) + ' (20 % de moins que ton ' + salTxt + ')');
      out.push(carteGros('Ton épargne passerait de ' + pc0(x.avant_pct) + ' à', pc0(x.epargne_pct), eur(x.epargne) + ' par mois', x.epargne < 0 ? 'neg' : ''));
      const l = [ligne({ titre: 'Revenus du mois', val: eur(x.revenus) })];
      if (x.a_reduire > 0) {
        l.push(ligne({ titre: 'À réduire chaque mois', val: eur(x.a_reduire), valCls: 'neg' }));
        l.push(ligne({ titre: 'Soit sur tes dépenses plaisir', val: '−' + pc0(x.reduc_plaisir) }));
        if (x.reserve && x.reserve <= 120) l.push(ligne({ titre: 'Ton Livret A, sans rien réduire', val: mois1(x.reserve) }));
      }
      if (x.reserve_sans_salaire) l.push(ligne({ titre: 'Ton Livret A, sans aucun salaire', val: mois1(x.reserve_sans_salaire) }));
      out.push(liste(l, true));
    } else {
      lh('montant', eur(x.montant)); lh('mois', 'pour ' + x.mois_lib); lh('deja', 'rien de côté pour l’instant');
      out.push(carteGros('À mettre de côté chaque mois', eur(x.par_mois), pc(x.pct) + ' de tes revenus, pendant ' + x.n + ' mois'));
      out.push(liste([ligne({ titre: 'Ton épargne moyenne', val: eur(b.epargne) + ' /mois' }),
        ligne({ titre: x.epargne_reste >= 0 ? 'Il te resterait à épargner' : 'Il manquerait chaque mois', val: eur(Math.abs(Math.round(b.epargne) - Math.round(x.par_mois))), valCls: x.epargne_reste < 0 ? 'neg' : '' })], true));
    }
    if (hyps.length) { const p = el('p', 'v-note'); p.append(el('span', 'v-hyp', 'hypothèses'), ' ' + hyps.join(' · ') + '.'); p.style.margin = '0 4px 12px'; out.unshift(p); }
    out.push(note((b.reel ? 'Calculs à partir de ta moyenne réelle (' + calc.vue.reel.mois.length + ' mois, hors revenus exceptionnels) : ' : 'Calculs à partir de ton budget de référence : ') + eur(b.revenus) + ' de revenus, ' + eur(b.depenses) + ' de dépenses et ' + eur(b.epargne) + ' d’épargne par mois.'));
    zone.replaceChildren(...out);
  };
  const corpsProj = () => {
    const out = [];
    const seg = el('div', 'v-segment'); seg.setAttribute('role', 'group');
    SCEN.forEach(([k, t]) => { const b = el('button', '', t); b.type = 'button'; b.setAttribute('aria-pressed', String(scen === k)); b.onclick = () => { scen = k; dash.draw('v_page'); }; seg.append(b); });
    out.push(seg, section(TITRE_SCEN[scen]));
    const zone = el('div');
    out.push(liste(QUESTIONS[scen].map(([k, lib, unite]) => {
      const row = el('label', 'v-ligne'), t = el('div', 'v-txt'); t.append(el('b', '', lib));
      const inp = el('input', 'v-champ'), estMois = unite === 'mois';
      if (estMois) { inp.type = 'month'; inp.style.width = '150px'; inp.value = repProj[scen][k] || ''; }
      else { inp.setAttribute('inputmode', 'decimal'); inp.placeholder = '?'; inp.value = repProj[scen][k] === undefined || repProj[scen][k] === '' ? '' : String(repProj[scen][k]).replace('.', ','); }
      inp.oninput = () => {
        const n = estMois ? inp.value : (inp.value.trim() === '' ? '' : nombre(inp.value));
        repProj[scen][k] = n === '' || (typeof n === 'number' && !isFinite(n)) ? '' : n;
        try { localStorage.setItem('budget-proj', JSON.stringify(repProj)); } catch (e) {}
        resultatProj(zone);
      };
      const u = el('span', 'v-gris v-unite', estMois ? '' : unite);
      row.append(t, inp, u); return row;
    }), true));
    out.push(zone);
    resultatProj(zone);
    const bloc = el('div', 'v-proj'); bloc.append(...out);
    return [bloc];
  };
  const pageProj = () => pousser({ retour: 'Épargne', titre: () => 'Et si…', sous: () => 'Laisse vide ce que tu ne sais pas.', corps: corpsProj });

  // Placements : feuille de saisie (une saisie invalide garde la feuille ouverte, avec l'erreur)
  let enCours = null;
  const dPl = A.dialogue('<h2 id="pl-titre"></h2><p id="pl-aide"></p><div id="pl-champs" style="display:grid;gap:8px"></div>' + A.boutons('Enregistrer'), () => {
    const b = A.bundle(), P = Object.assign({}, b.patrimoine), val = (i) => nombre($('pl-' + i).value);
    if (enCours === 'livret') {
      if (!(val(0) >= 0)) return 'Tape un montant positif, par exemple 22 950.';
      const t = $('pl-1').value.trim() === '' ? 0 : val(1); if (!(t >= 0 && t < 20)) return 'Taux : tape un nombre, par exemple 1,7, ou laisse vide.';
      P.livret = { valeur: val(0), date: auj(), taux: t };
    }
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
      livret: ['Livret A', 'Valeur aujourd’hui. Ensuite, l’appli suit seule les virements depuis et vers le livret, et ajoute chaque 1er janvier les intérêts estimés avec le taux indiqué.', [...champ(0, 'Valeur (€)', p.livret), ...champ(1, 'Taux annuel (%)', p.livret_taux)]],
      pea: ['PEA', 'Valeur affichée dans ton appli de bourse aujourd’hui.', champ(0, 'Valeur (€)', p.pea)],
      tr: ['Trade Republic', 'Le plus simple : importe l’export CSV de Trade Republic (bouton d’import, en haut de Patrimoine). Sinon, tape le solde espèces.', champ(0, 'Solde espèces (€)', p.tr)],
      pret: ['Prêt étudiant', 'Capital restant dû aujourd’hui, d’après ton tableau d’amortissement.', [...champ(0, 'Capital restant (€)', p.dette), ...champ(1, 'Taux annuel (%)', P.pret && P.pret.taux), ...champ(2, 'Mensualité (€)', P.pret && P.pret.mensualite), ...champ(3, 'Mois du déblocage (AAAA-MM, facultatif)', P.pret && P.pret.debut, 'texte')]]
    }[k];
    $('pl-titre').textContent = T[0]; $('pl-aide').textContent = T[1]; $('pl-champs').replaceChildren(...T[2]);
    A.ouvrir(dPl);
  };

  // ================= Opérations =================
  $('v-q').addEventListener('input', () => { ops.limite = 120; dash.draw('v_ops'); });
  dash.draw('v_ops_filtres', (c) => {
    const v = V(), mt = v.epargne.cle;
    const changer = (o) => { Object.assign(ops, o, { limite: 120 }); dash.draw('v_ops_filtres'); dash.draw('v_ops'); };
    const seg = el('div', 'v-segment'); seg.setAttribute('role', 'group');
    [[cap(MOIS_L[Number(v.mc.slice(5, 7)) - 1]), ops.mois === v.mc && !ops.depuis, { mois: v.mc, depuis: '' }], [cap(MOIS_L[Number(mt.slice(5, 7)) - 1]), ops.mois === mt && !ops.depuis, { mois: mt, depuis: '' }], ['Tout', !ops.mois && !ops.depuis, { mois: '', depuis: '' }]]
      .forEach(([t, on, o]) => { const b = el('button', '', t); b.type = 'button'; b.setAttribute('aria-pressed', String(on)); b.onclick = () => changer(o); seg.append(b); });
    const box = el('div', 'v-filtres');
    const blocs = Array.from(new Set((dash.data('operations').data || []).map((r) => r.bloc))).sort();
    const menu = el('label', 'v-puce v-menu' + (ops.bloc ? ' on' : '')), sel = el('select'); sel.setAttribute('aria-label', 'Catégorie');
    sel.append(new Option('Toutes les catégories', ''), ...blocs.map((b) => new Option(b, b))); sel.value = ops.bloc;
    sel.onchange = () => changer({ bloc: sel.value, poste: '' }); menu.append(sel, dessin('chev', 14)); box.append(menu);
    if (ops.poste) { const b = el('button', 'v-puce on'); b.type = 'button'; b.append(ops.poste, dessin('croix', 14)); b.setAttribute('aria-label', 'Retirer le filtre ' + ops.poste); b.onclick = () => changer({ poste: '' }); box.append(b); }
    if (ops.depuis) { const b = el('button', 'v-puce on'); b.type = 'button'; b.append('Depuis janvier', dessin('croix', 14)); b.onclick = () => changer({ depuis: '' }); box.append(b); }
    c.replaceChildren(seg, box);
  });
  dash.draw('v_ops', (c) => {
    if (!ops.mois && !ops.bloc && !ops.poste && !ops.depuis && ops.init === undefined) { ops.init = true; ops.mois = V().mc; dash.draw('v_ops_filtres'); }
    const q = $('v-q').value.trim().toLowerCase();
    const l = (dash.data('operations').data || []).filter((r) => (!ops.mois || r.mois === ops.mois) && (!ops.bloc || r.bloc === ops.bloc) && (!ops.poste || r.poste === ops.poste) && (!ops.depuis || r.mois >= ops.depuis) &&
      (!q || (r.libelle + ' ' + r.poste + ' ' + r.bloc).toLowerCase().includes(q)))
      .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.id - a.id));
    const total = l.reduce((s, r) => s + Number(r.montant), 0), out = [el('p', 'v-note', l.length + ' opération' + (l.length > 1 ? 's' : '') + ' · ' + signe2(total))];
    out[0].style.margin = '2px 4px 0';
    let jour = null, rows = [];
    const fermer = () => { if (rows.length) out.push(liste(rows)); rows = []; };
    l.slice(0, ops.limite).forEach((r) => {
      if (r.date !== jour) { fermer(); jour = r.date; out.push(el('h3', 'v-jour', dateLongue(r.date))); }
      const nc = r.bloc === 'Non classé', m = Number(r.montant);
      rows.push(ligne({ ic: nc ? 'etiquette' : icone(r.poste), ton: nc ? 'var(--orange)' : ton(r.bloc), court: true, titre: M.nomCourt(r.libelle), sous: nc ? 'À classer' : r.mois_epargne ? r.poste + ' · compté pour ' + nomDe(r.mois_epargne) : r.poste, sousCls: nc ? 'orange' : '',
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
  const corpsRegles = () => { const l = dash.data('regles').data || []; return l.length ? [liste(l.map((r) => ligne({ titre: r.regle, sous: r.poste + ' · ' + r.bloc })))] : [note('Aucune règle pour l’instant.')]; };
  const corpsCalcul = () => [liste([
    'Revenus du mois : salaire versé à la fin du mois précédent, plus la CAF et Action Logement reçues dans le mois.',
    'Somme à partager : revenus du mois, moins les charges fixes prévues, la part mensuelle des enveloppes et les montants prévus des charges variables.',
    'Budget loisirs du mois : ' + String(syn('part_loisirs') || (A.calc().datasets.references.find((r) => r.id === 'part_loisirs') || {}).montant).replace('.', ',') + ' % de la somme à partager, réparti entre les loisirs selon leur part. Le reste correspond à l’épargne.',
    'Enveloppes : ' + eur2(V().normal.env) + ' par mois vont dans la caisse des enveloppes, qui paie leurs dépenses. Les plafonds annuels repartent à zéro en janvier.',
    'Épargne à virer : revenus, moins les charges fixes passées, les loisirs et charges variables dépensés et la part des enveloppes. Un mois négatif est déduit du suivant. Suivi depuis octobre 2026, début du budget avec le prêt.',
    'Exclus : mouvements internes, titres-restaurant, revenus exceptionnels et dépenses hors budget. Les montants sont nets des remboursements.'
  ].map((t) => { const r = el('div', 'v-ligne'); r.append(el('div', 'v-txt', t)); r.querySelector('.v-txt').style.cssText = 'font-size:15px;line-height:1.4;padding:4px 0'; return r; }), true)];

  // Une ligne = un titre et une valeur ; le détail et l'explication sont dans la page qui s'ouvre
  const serre = (rows) => { const l = liste(rows); l.classList.add('serre'); return l; };
  const etatSauvegarde = () => {
    const b = A.bundle(), mod = b.modifie_le, sav = b.sauvegarde_le;
    if (!sav) return { txt: 'Jamais faite', due: true };
    if (mod && mod > sav) return { txt: 'À refaire', due: true };
    return { txt: 'le ' + new Date(sav).toLocaleDateString('fr-FR').slice(0, 5), due: false };
  };
  dash.draw('v_reglages', (c) => {
    const n = V().normal, b = A.bundle(), out = [], sv = etatSauvegarde();
    const [iR, iF, iV, iE, iL] = M.entiers([n.revenus, -n.fixes, -n.variables, -n.env, -n.loisirs]);
    out.push(section('Mon budget d’un mois normal'), serre([
      ligne({ ic: 'billet', ton: 'var(--green)', titre: 'Revenus', val: eur(iR), clic: () => pageRefs('Revenu', 'Revenus', 'Moyennes d’un mois normal. Le budget du mois suit les revenus vraiment reçus.'), chev: true }),
      ligne({ ic: 'maison', ton: 'var(--gray)', titre: 'Charges fixes', val: moins(-iF), clic: () => pageRefs('Charge fixe', 'Charges fixes', 'Montants prélevés chaque mois. Touche un montant pour le modifier.'), chev: true }),
      ligne({ ic: 'panier', ton: 'var(--blue)', titre: 'Charges variables', val: moins(-iV), clic: () => pageRefs('Charge variable', 'Charges variables', 'Plafonds mensuels fixes.'), chev: true }),
      ligne({ ic: 'cadeau', ton: 'var(--orange)', titre: 'Enveloppes', val: moins(-iE), clic: () => pageRefs('Enveloppe annuelle', 'Enveloppes', 'Montants pour l’année. Un douzième part chaque mois dans la caisse des enveloppes.'), chev: true }),
      ligne({ ic: 'resto', ton: 'var(--indigo)', titre: 'Loisirs', val: moins(-iL), clic: () => pageRefs('Loisir', 'Loisirs', 'Montants d’un mois normal. Chaque mois, le budget loisirs suit les revenus reçus.'), chev: true }),
      ligne({ ic: 'pieces', ton: 'var(--green)', titre: 'Épargne prévue', val: eur(iR + iF + iV + iE + iL), total: true })]), serre([ligne({ ic: 'cible', ton: 'var(--blue)', titre: 'Ma répartition 50 / 30 / 20', clic: () => pageRepere(), chev: true })]));
    out.push(section('Mes données'), serre([
      ligne({ ic: 'import', ton: 'var(--blue)', titre: 'Importer un relevé', clic: () => $('app-file').click(), chev: true }),
      ligne({ ic: 'disque', ton: 'var(--blue)', titre: 'Sauvegarder', val: sv.txt, valCls: sv.due ? 'orange' : 'v-gris', clic: () => A.sauvegarder(), chev: true })]));
    out.push(section('Classement et calculs'), serre([
      ligne({ ic: 'etiquette', ton: 'var(--orange)', titre: 'Marchands mémorisés', val: String((b.regles_perso || []).length), valCls: 'v-gris', clic: () => pousser({ retour: 'Réglages', titre: () => 'Marchands', corps: corpsPerso }), chev: true }),
      ligne({ ic: 'liste', ton: 'var(--gray)', titre: 'Règles de classement', val: String((dash.data('regles').data || []).length), valCls: 'v-gris', clic: () => pousser({ retour: 'Réglages', titre: () => 'Classement', corps: corpsRegles }), chev: true }),
      ligne({ ic: 'etincelle', ton: 'var(--indigo)', titre: 'Recalcul de janvier', clic: () => $('app-proposer').onclick(), chev: true }),
      ligne({ ic: 'calcul', ton: 'var(--blue)', titre: 'Comment c’est calculé', clic: () => pousser({ retour: 'Réglages', titre: () => 'Calculs', corps: corpsCalcul }), chev: true })]));
    out.push(note('Tes données restent sur ce téléphone. Sauvegarde après chaque import.'));
    $('pt-regles').hidden = !sv.due;
    c.replaceChildren(...out);
  });

  // Un titre qui ne tient pas sur sa ligne n'est jamais coupé : un nom d'opération perd ses derniers mots (le libellé complet est dans la fiche),
  // un autre titre rétrécit jusqu'à 14 px, puis passe sur deux lignes.
  const ajuster = () => {
    const r = page ? pageEl : document.querySelector('.bm-page:not([hidden])'); if (!r) return;
    [...r.querySelectorAll('.v-txt > b')].filter((b) => b.clientWidth && b.scrollWidth > b.clientWidth).forEach((b) => {
      if (b.dataset.court) { const m = b.textContent.split(' '); while (m.length > 1 && b.scrollWidth > b.clientWidth) { m.pop(); b.textContent = m.join(' '); } }
      for (let t = 16; t >= 14 && b.scrollWidth > b.clientWidth; t--) b.style.fontSize = t + 'px';
      if (b.scrollWidth > b.clientWidth) b.style.whiteSpace = 'normal';
    });
  };
  // Après chaque dessin (import, modification, changement d'onglet ou de page), on réajuste ce qui est visible
  new MutationObserver(() => { clearTimeout(ajuster.t); ajuster.t = setTimeout(ajuster, 0); }).observe($('dash-root'), { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden', 'class'] });
  ajuster();

  majHaut();
})();
