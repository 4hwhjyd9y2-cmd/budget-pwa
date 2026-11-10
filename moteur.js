// Moteur du budget : lecture de l'export bancaire (CSV ou zip), classement des opérations et calcul des tableaux.
// Fonctionne dans le navigateur (window.Moteur) et sous Node (module.exports) pour les tests.
(function (root) {
  const r2 = (x) => Math.round(x * 100) / 100;
  const norm = (s) => String(s || '').replace(/[\s  ]+/g, ' ').trim();
  const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  const moisNom = (k) => MOIS[Number(k.slice(5, 7)) - 1];
  const moisLabel = (k) => moisNom(k) + ' ' + k.slice(0, 4);
  const moisDecale = (k, n) => { const d = new Date(Date.UTC(Number(k.slice(0, 4)), Number(k.slice(5, 7)) - 1 + n, 1)); return d.toISOString().slice(0, 7); };
  const fr2 = (v) => Number(v).toFixed(2).replace('.', ',');
  const jourDe = (iso) => Number(iso.slice(8, 10));
  const frDate = (iso) => iso.slice(8, 10) + '/' + iso.slice(5, 7) + '/' + iso.slice(0, 4);

  // Postes possibles, par catégorie (les postes budgétés viennent des montants de référence)
  const POSTES_FIXES = {
    'Revenus': ['Salaire', 'CAF', 'Action Logement'],
    'Exceptionnel': ['Virements de proches', 'Cadeaux reçus'],
    'Interne': ['Mouvements internes', 'Virement d’épargne'],
    'Hors budget': ['Voyages', 'Anciens abonnements'],
    'Exclu': ['Non suivis'],
    'Non classé': ['Non classé']
  };
  const TYPE_BLOC = { 'Charge fixe': 'Charges fixes', 'Charge variable': 'Charges variables', 'Loisir': 'Loisirs', 'Enveloppe annuelle': 'Enveloppes' };
  // Postes proposés : les fixes, ceux des montants de référence, puis ceux déjà utilisés dans les données
  function postes(bundle) {
    const out = {};
    ['Revenus', 'Charges fixes', 'Charges variables', 'Loisirs', 'Enveloppes', 'Exceptionnel', 'Interne', 'Hors budget', 'Non classé'].forEach((b) => { out[b] = (POSTES_FIXES[b] || []).slice(); });
    const ajoute = (b, p) => { if (out[b] && p && !out[b].includes(p)) out[b].push(p); };
    bundle.references.forEach((r) => ajoute(TYPE_BLOC[r.type], r.poste));
    (bundle.regles_auto || []).concat(bundle.operations || []).forEach((o) => ajoute(o.bloc, o.poste));
    return out;
  }

  // ---------- Lecture du CSV ----------
  function parseCSV(text) {
    text = text.replace(/^﻿/, '');
    const rows = []; let row = [], cell = '', q = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (q) { if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c; }
      else if (c === '"') q = true;
      else if (c === ';') { row.push(cell); cell = ''; }
      else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cell); rows.push(row); row = []; cell = ''; }
      else cell += c;
    }
    if (cell || row.length) { row.push(cell); rows.push(row); }
    return rows.filter((r) => r.length > 1 || r[0]);
  }
  const montant = (s) => Number(String(s).replace(/[\s  ]/g, '').replace(',', '.'));

  // Renvoie [{date, libelle, montant, cat}] depuis l'export bancaire
  function lireExport(text) {
    const rows = parseCSV(text);
    if (rows.length < 2) throw new Error('Fichier vide.');
    const h = rows[0].map((x) => norm(x).toLowerCase());
    const col = (test, def) => { const i = h.findIndex(test); return i >= 0 ? i : def; };
    const iDate = col((x) => x.startsWith('date op'), 0);
    const iLib = col((x) => x === 'libellé' || x === 'libelle', 2);
    const iCat = col((x) => x === 'catégorie' || x === 'categorie', 4);
    const iMt = col((x) => x === 'montant', col((x) => x === 'solde', 6));
    // Solde du compte après l'opération : la dernière colonne « Solde » quand elle n'est pas celle du montant
    const iSolde = h.lastIndexOf('solde') !== iMt ? h.lastIndexOf('solde') : -1;
    if (!/^date op/.test(h[iDate] || '')) throw new Error('Ce fichier ne ressemble pas à un export de la banque.');
    const ops = [];
    rows.slice(1).forEach((r) => {
      let d = norm(r[iDate]);
      if (/^\d\d\/\d\d\/\d{4}$/.test(d)) d = d.slice(6) + '-' + d.slice(3, 5) + '-' + d.slice(0, 2);
      const m = montant(r[iMt]);
      if (!/^\d{4}-\d\d-\d\d$/.test(d) || !isFinite(m)) return;
      const so = iSolde >= 0 && norm(r[iSolde]) !== '' ? montant(r[iSolde]) : NaN;
      ops.push({ date: d, libelle: norm(r[iLib]), montant: r2(m), cat: norm(r[iCat]), solde: isFinite(so) ? r2(so) : null });
    });
    if (!ops.length) throw new Error('Aucune opération lisible dans ce fichier.');
    return ops;
  }

  // ---------- Classement ----------
  function marchand(lib) {
    const l = norm(lib).toUpperCase();
    let m = l.match(/^(?:CARTE|AVOIR) \d\d\/\d\d\/\d\d (.*?)(?: \d+,\d+ [A-Z]{3})?(?: CB\*\d+)?$/);
    if (m) return m[1].replace(/ \d+,\d+ [A-Z]{3}$/, '');
    m = l.match(/^(PRLV SEPA|VIR SEPA|VIR INST|VIR) ?(.*)$/);
    if (m) return m[1] + ' ' + m[2].slice(0, 30);
    if (/^RETRAIT DAB/.test(l)) return 'RETRAIT DAB';
    return l.slice(0, 30);
  }

  // Règles personnelles : stockées dans les données (regles_auto), jamais dans le code publié.
  // Format : {motif: expression régulière sur le libellé en majuscules, sens: 'credit'|'debit', montant, mois: '01'..'12', max (montant absolu maximal), bloc, poste}
  function reglePerso(o, regles) {
    const L = norm(o.libelle).toUpperCase(), m = o.montant;
    for (const r of regles) {
      let re; try { re = new RegExp(r.motif); } catch (e) { continue; }
      if (!re.test(L)) continue;
      if (r.sens === 'credit' && !(m > 0)) continue;
      if (r.sens === 'debit' && !(m < 0)) continue;
      if (r.montant !== undefined && r.montant !== null && Math.abs(m - Number(r.montant)) > 0.005) continue;
      if (r.mois && o.date.slice(5, 7) !== r.mois) continue;
      if (r.max !== undefined && Math.abs(m) > Number(r.max)) continue;
      return { bloc: r.bloc, poste: r.poste };
    }
    return null;
  }

  // Virement sortant que la banque classe en « Epargne financière » : le virement d'épargne du mois.
  // Passe avant les règles personnelles, qui rangent ces virements dans les mouvements internes.
  const EPARGNE = 'Virement d’épargne';
  const SUIVI_DEFAUT = '2026-10';
  function regleEpargne(o) {
    return o.montant < 0 && /^VIR /.test(norm(o.libelle).toUpperCase()) && /^epargne financi/i.test(o.cat || '') ? { bloc: 'Interne', poste: EPARGNE } : null;
  }

  // Règles génériques, valables pour n'importe quel compte
  function regleGenerique(o) {
    const L = norm(o.libelle).toUpperCase();
    const R = (bloc, poste) => ({ bloc, poste });
    if (/EDENRED/.test(L)) return R('Exclu', 'Non suivis');
    if (/LIVRET A|^VIR EPARGNE|VIREMENT DEPUIS /.test(L)) return R('Interne', 'Mouvements internes');
    if (/CPAM/.test(L)) return R('Enveloppes', 'Santé');
    if (/^RETRAIT DAB/.test(L)) return R('Enveloppes', 'Achats divers');
    const dev = L.match(/ \d+,\d+ ([A-Z]{3}) CB\*/);
    if (dev && dev[1] !== 'EUR' && dev[1] !== 'EU') return R('Hors budget', 'Voyages');
    return null;
  }

  // Catégorie de la banque vers poste, en dernier recours
  const CAT_BANQUE = [
    [/^alimentation/i, 'Charges variables', 'Courses'],
    [/^restaurants/i, 'Loisirs', 'Restos, bars et sorties'],
    [/^(péages|carburant|parking|transports quotidiens)/i, 'Charges variables', 'Carburant et péages'],
    [/^tabac/i, 'Loisirs', 'CE'],
    [/^vêtements/i, 'Loisirs', 'Vêtements'],
    [/^(dons et cadeaux|livres)/i, 'Enveloppes', 'Cadeaux'],
    [/^(divertissement|club \/ association|loisirs - autres)/i, 'Loisirs', 'Restos, bars et sorties'],
    [/^(remboursements frais de santé|médecins|pharmacie|optique|santé - autres)/i, 'Enveloppes', 'Santé'],
    [/^(entretien - réparation|auto \/ moto)/i, 'Enveloppes', 'Entretien voiture et moto'],
    [/^(electronique|bricolage|contraventions|etudes|mobilier)/i, 'Enveloppes', 'Achats divers'],
    [/^bien-être/i, 'Loisirs', 'Soins et coiffeur'],
    [/^vie quotidienne - autres/i, 'Charges variables', 'Maison et quotidien'],
    [/^(transports longue distance|hébergement|voyages)/i, 'Hors budget', 'Voyages'],
    [/^(epargne|revenus épargne|revenus d'épargne|virements reçus de comptes)/i, 'Interne', 'Mouvements internes']
  ];

  // Table apprise : marchand -> poste, quand l'historique est net (au moins 80 % dans le même poste)
  function apprendre(ops) {
    const t = {};
    ops.forEach((o) => {
      if (o.bloc === 'Non classé' || o.bloc === 'Exclu') return;
      const k = marchand(o.libelle), p = o.bloc + '|' + o.poste;
      (t[k] = t[k] || {})[p] = (t[k][p] || 0) + 1;
    });
    const out = {};
    Object.keys(t).forEach((k) => {
      const e = Object.entries(t[k]).sort((a, b) => b[1] - a[1]), n = e.reduce((s, x) => s + x[1], 0);
      if (e[0][1] / n >= 0.8) { const [bloc, poste] = e[0][0].split('|'); out[k] = { bloc, poste }; }
    });
    return out;
  }

  function classer(o, ctx) {
    const k = marchand(o.libelle);
    const perso = ctx.perso.find((p) => p.marchand === k);
    if (perso) return { bloc: perso.bloc, poste: perso.poste, src: 'règle perso' };
    const f = regleEpargne(o) || reglePerso(o, ctx.regles) || regleGenerique(o); if (f) return Object.assign(f, { src: 'règle' });
    // Virements de ou vers des personnes : toujours à vérifier à la main
    if (/^VIR /.test(k)) return { bloc: 'Non classé', poste: 'Non classé', src: 'auto' };
    const a = ctx.appris[k]; if (a) return { bloc: a.bloc, poste: a.poste, src: 'historique' };
    if (!/AMAZON|ALIEXPRESS/.test(k)) for (const [re, bloc, poste] of CAT_BANQUE) if (re.test(o.cat || '')) return { bloc, poste, src: 'catégorie banque' };
    return { bloc: 'Non classé', poste: 'Non classé', src: 'auto' };
  }

  // Fusionne un export dans le jeu de données : les opérations déjà connues gardent leur classement
  function importer(bundle, texte, nomFichier) {
    const brut = lireExport(texte);
    const anciens = bundle.operations || [];
    const cle = (o) => o.date + '|' + norm(o.libelle) + '|' + r2(o.montant).toFixed(2);
    const pool = {}; anciens.forEach((o) => { (pool[cle(o)] = pool[cle(o)] || []).push(o); });
    const ctx = { regles: bundle.regles_auto || [], perso: bundle.regles_perso || [], appris: apprendre(anciens) };
    let maxId = anciens.reduce((m, o) => Math.max(m, Number(o.id) || 0), 0);
    const fn = (nomFichier || '').match(/(\d\d)-(\d\d)-(\d{4})/);
    const dExport = fn ? fn[3] + '-' + fn[2] + '-' + fn[1] : brut.reduce((m, o) => (o.date > m ? o.date : m), '');
    const vus = new Set(); let nouvelles = 0, aClasser = 0, migres = 0;
    const ops = [];
    brut.forEach((o) => {
      const p = pool[cle(o)];
      if (p && p.length) {
        let a = p.shift(); vus.add(a);
        if (a.poste === 'Mouvements internes' && regleEpargne(o)) { a = Object.assign({}, a, { poste: EPARGNE, src: 'règle' }); migres++; }
        ops.push(a);
        return;
      }
      const c = classer(o, ctx);
      if (c.bloc === 'Exclu') return;
      nouvelles++; if (c.bloc === 'Non classé') aClasser++;
      ops.push({ date: o.date, libelle: o.libelle, montant: o.montant, bloc: c.bloc, poste: c.poste, id: ++maxId, mois: o.date.slice(0, 7), jour: frDate(o.date), src: c.src });
    });
    // Opérations plus anciennes que l'export : toutes gardées (l'historique n'est jamais effacé)
    anciens.forEach((o) => { if (!vus.has(o) && o.date < brut.reduce((m, x) => (x.date < m ? x.date : m), '9999')) ops.push(o); });
    ops.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.id - b.id));
    // Solde de fin de journée : l'export liste les opérations du plus récent au plus ancien, ou l'inverse
    const soldes = {};
    Object.entries(bundle.soldes || {}).forEach(([d, v]) => { soldes[d] = v; });
    const avecSolde = brut.filter((o) => o.solde !== null);
    if (avecSolde.length) {
      const desc = avecSolde[0].date >= avecSolde[avecSolde.length - 1].date;
      const vu = new Set();
      (desc ? avecSolde : avecSolde.slice().reverse()).forEach((o) => { if (!vu.has(o.date)) { vu.add(o.date); soldes[o.date] = o.solde; } });
    }
    const out = Object.assign({}, bundle, { version: 2, operations: ops, soldes, export: dExport, maj: new Date().toISOString() });
    return { bundle: out, stats: { lues: brut.length, nouvelles, aClasser, migres } };
  }

  // Reclassement manuel ; avec `toutes`, mémorise le marchand et reclasse ses opérations non classées
  function reclasser(bundle, id, bloc, poste, toutes) {
    const ops = bundle.operations.map((o) => Object.assign({}, o));
    const o = ops.find((x) => String(x.id) === String(id)); if (!o) return bundle;
    Object.assign(o, { bloc, poste, src: 'manuel' });
    let perso = (bundle.regles_perso || []).slice();
    if (toutes) {
      const k = marchand(o.libelle);
      perso = perso.filter((p) => p.marchand !== k).concat([{ marchand: k, bloc, poste }]);
      ops.forEach((x) => { if (x.bloc === 'Non classé' && marchand(x.libelle) === k) Object.assign(x, { bloc, poste, src: 'règle perso' }); });
    }
    return Object.assign({}, bundle, { operations: ops, regles_perso: perso });
  }

  // ---------- Calculs ----------
  function calculer(bundle) {
    const refs = bundle.references, ops = bundle.operations;
    const ref = (id) => { const r = refs.find((x) => x.id === id); return r ? Number(r.montant) : 0; };
    const parType = (t) => refs.filter((r) => r.type === t);
    const somme = (a) => a.reduce((s, x) => s + x, 0);
    const exp = bundle.export || ops.reduce((m, o) => (o.date > m ? o.date : m), '');
    const mc = exp.slice(0, 7), mt = moisDecale(mc, -1), an = mt.slice(0, 4), debutCle = an + '-01';
    const opsDe = (mois, poste) => ops.filter((o) => o.mois === mois && o.poste === poste);
    const net = (mois, poste) => r2(-somme(opsDe(mois, poste).map((o) => Number(o.montant))));
    const recu = (mois, poste) => r2(somme(opsDe(mois, poste).map((o) => Number(o.montant))));

    const fixes = r2(somme(parType('Charge fixe').map((r) => Number(r.montant))));
    const variables = r2(somme(parType('Charge variable').map((r) => Number(r.montant))));
    const envMois = somme(parType('Enveloppe annuelle').map((r) => Number(r.montant))) / 12;
    const loisirsNormal = somme(parType('Loisir').map((r) => Number(r.montant)));
    const partagerNormal = ref('rev_sal') + ref('rev_caf') + ref('rev_al') - fixes - envMois - variables;
    // Part des loisirs arrondie au centième de pourcent (75,66 %), comme dans le classeur
    const part = partagerNormal > 0 ? Math.round(loisirsNormal / partagerNormal * 10000) / 10000 : 0;
    const budgetLoisirs = (rev) => Math.max(0, (rev - fixes - envMois - variables) * part);

    // Montant habituel d'un versement : le plus fréquent dans l'historique (Action Logement : 100 €)
    const habituel = (poste) => { const n = {}; ops.forEach((o) => { if (o.poste === poste && o.montant > 0) n[o.montant] = (n[o.montant] || 0) + 1; }); const e = Object.entries(n).sort((a, b) => b[1] - a[1] || b[0] - a[0])[0]; return e ? Number(e[0]) : 0; };
    const revenusDe = (mois, enCours) => {
      const sal = recu(moisDecale(mois, -1), 'Salaire');
      let caf = recu(mois, 'CAF'), al = recu(mois, 'Action Logement'), cafEtat = 'reçue', alEtat = 'reçue';
      if (enCours && caf === 0) { caf = ref('rev_caf'); cafEtat = 'attendue'; }
      if (enCours && al === 0) { al = habituel('Action Logement') || ref('rev_al'); alEtat = 'attendue'; }
      return { sal, caf, al, cafEtat, alEtat, total: r2(sal + caf + al) };
    };

    const ligne = (r, bloc, seuil, depense, extra) => {
      const reste = r2(seuil - depense);
      return Object.assign({ id: r.id, bloc, poste: r.poste, seuil: r2(seuil), depense: r2(depense), reste, pct_reste: seuil ? Math.round(reste / seuil * 100) : 0 }, extra || {});
    };
    const budget = (mois, rev, extra) => {
      const bl = budgetLoisirs(rev.total);
      return parType('Loisir').map((r) => ligne(r, 'Loisirs', bl * Number(r.montant) / loisirsNormal, net(mois, r.poste), extra))
        .concat(parType('Charge variable').map((r) => ligne(r, 'Charges variables', Number(r.montant), net(mois, r.poste), extra)));
    };

    // Mois terminé
    const rev = revenusDe(mt, false);
    const lignesMt = budget(mt, rev);
    const env = parType('Enveloppe annuelle').map((r) => {
      const dep = r2(-somme(ops.filter((o) => o.poste === r.poste && o.mois >= debutCle && o.mois <= mt).map((o) => Number(o.montant))));
      return ligne(r, 'Enveloppes', Number(r.montant), dep, { depense_mois: net(mt, r.poste) });
    });
    const gS = somme(lignesMt.map((l) => l.seuil)), gD = somme(lignesMt.map((l) => l.depense));
    const global = { id: 'global', bloc: 'Global', poste: 'Budget du mois (loisirs et charges variables)', seuil: r2(gS), depense: r2(gD), reste: r2(gS - gD), pct_reste: gS ? Math.round((gS - gD) / gS * 100) : 0 };
    const fixesL = parType('Charge fixe').map((r) => {
      const dep = net(mt, r.poste), mtt = Number(r.montant);
      const base = { id: 'f_' + r.id, bloc: 'Charges fixes', poste: r.poste, depense: dep };
      if (r.id === 'sport') {
        // Abonnement mensuel prélevé en début de mois ; un mois peut compter deux prélèvements (décembre 2026).
        // L'ancienne formule de 45 € reste reconnue pour les mois passés.
        const n = mtt > 0 ? dep / mtt : 0, entier = dep > 0 && Math.abs(n - Math.round(n)) < 0.001, f45 = Math.abs(dep - 45) < 0.01;
        const etat = f45 ? 'Formule de 45 € payée' : !entier ? (dep === 0 ? 'Aucun paiement trouvé' : 'Écart') : Math.round(n) === 1 ? 'Conforme' : Math.round(n) + ' prélèvements ce mois';
        return Object.assign(base, { seuil: mtt, ok: f45 || entier, etat, note: 'Mensuel, prélevé en début de mois' });
      }
      if (r.id === 'prime') {
        const att = mt.slice(5) === '02' ? r2(mtt * 12) : 0, ok = Math.abs(dep - att) <= Math.max(1, att * 0.1);
        return Object.assign(base, { seuil: att, ok, etat: ok ? 'Conforme' : dep === 0 ? 'Aucun paiement trouvé' : 'Écart', note: 'Annuel, prélevé en février' });
      }
      const ok = Math.abs(dep - mtt) < 0.01;
      return Object.assign(base, { seuil: mtt, ok, etat: ok ? 'Conforme' : dep === 0 ? 'Aucun paiement trouvé' : 'Écart', note: 'Mensuel' });
    });
    const moisCourant = lignesMt.concat(env, [global], fixesL);

    // Virement d'épargne de fin de mois : revenus - charges fixes passées - loisirs et charges variables dépensés
    // - part des enveloppes - dépassement de la caisse des enveloppes. Un mois négatif est reporté sur le suivant.
    const postesFixes = parType('Charge fixe').map((r) => r.poste);
    const postesBudget = parType('Loisir').concat(parType('Charge variable')).map((r) => r.poste);
    const postesEnv = parType('Enveloppe annuelle').map((r) => r.poste);
    // Le budget actuel (avec le prêt) ne vaut qu'à partir de `suivi_depuis` : le report et la caisse partent de ce mois
    const premierOps = ops.length ? moisDecale(ops.reduce((m, o) => (o.mois < m ? o.mois : m), '9999-99'), 1) : mt;
    const suivi = bundle.suivi_depuis || SUIVI_DEFAUT;
    const premierMois = suivi > premierOps ? suivi : premierOps;
    const laisses = bundle.deficits_laisses || {};
    // Caisse des enveloppes : reçoit la part mensuelle, paie les enveloppes. Si elle passe sous zéro,
    // le trou est retiré de l'épargne du mois et la caisse repart de zéro.
    const envDep = (mois) => r2(-somme(ops.filter((o) => o.mois === mois && postesEnv.includes(o.poste)).map((o) => Number(o.montant))));
    const trouEnv = {};
    let caisseFin = 0;
    for (let m = premierMois; m <= mt; m = moisDecale(m, 1)) {
      const c = r2(caisseFin + envMois - envDep(m));
      trouEnv[m] = c < 0 ? -c : 0; caisseFin = Math.max(0, c);
    }
    const brutVirement = (mois) => {
      const rv = revenusDe(mois, false).total;
      const fx = r2(somme(postesFixes.map((p) => net(mois, p))));
      const dp = r2(somme(postesBudget.map((p) => net(mois, p))));
      const te = trouEnv[mois] || 0;
      return { rv, fx, dp, te, v: r2(rv - fx - dp - envMois - te) };
    };
    // Mouvements avec l'épargne rattachés à un mois : les envois faits du 1er au 10 comptent pour le mois d'avant,
    // tout le reste (dont les retraits) pour le mois où il a lieu
    const moisEpargne = (o) => (Number(o.montant) < 0 && jourDe(o.date) <= 10 ? moisDecale(o.mois, -1) : o.mois);
    const mvtEpargne = (mois) => {
      const l = ops.filter((o) => o.poste === EPARGNE && moisEpargne(o) === mois);
      const envois = r2(-somme(l.filter((o) => o.montant < 0).map((o) => Number(o.montant))));
      const retraits = r2(somme(l.filter((o) => o.montant > 0).map((o) => Number(o.montant))));
      return { envois, retraits, net: r2(envois - retraits) };
    };
    // Report : ce qui manque à la fin d'un mois (virement dû moins virement net) passe au mois suivant,
    // sauf si tu as choisi de le laisser filer (pris sur le compte courant)
    let report = 0;
    for (let m = premierMois; m < mt; m = moisDecale(m, 1)) {
      const ecart = r2(brutVirement(m).v + report - mvtEpargne(m).net);
      report = laisses[m] ? 0 : Math.min(0, ecart);
    }
    const vir = brutVirement(mt), virTotal = r2(vir.v + report);
    const mvt = mvtEpargne(mt), deja = mvt.net;
    const resteVir = r2(virTotal - deja);
    const manque = resteVir < 0 ? -resteVir : 0;

    // Mois en cours
    const revMc = revenusDe(mc, true);
    const moisEnCours = budget(mc, revMc, { mois: mc });

    const nc = ops.filter((o) => o.bloc === 'Non classé').length;
    const S = (id, libelle, valeur, unite) => ({ id, libelle, valeur, unite: unite || '' });
    const synthese = [
      S('mois', 'Mois affiché', moisLabel(mt)),
      S('revenus', 'Revenus du mois', rev.total, '€'),
      S('salaire', 'Salaire versé fin ' + moisNom(moisDecale(mt, -1)), rev.sal, '€'),
      S('salaire_mois', 'Mois du salaire', moisNom(moisDecale(mt, -1))),
      S('caf', 'CAF', rev.caf, '€'),
      S('al', 'Action Logement', rev.al, '€'),
      S('a_partager', 'Somme à partager entre loisirs et épargne', r2(rev.total - fixes - envMois - variables), '€'),
      S('loisirs_mois', 'Budget loisirs du mois', r2(budgetLoisirs(rev.total)), '€'),
      S('debut_enveloppes', 'Année des enveloppes', 'janvier à décembre ' + an),
      S('maj', 'Export utilisé', frDate(exp)),
      S('mois_cle', 'Clé du mois affiché', mt),
      S('debut_cle', 'Premier mois des enveloppes', debutCle),
      S('nc', 'Opérations non classées', nc),
      S('fix_ko', 'Charges fixes à vérifier', fixesL.filter((l) => !l.ok).length),
      S('mc_mois', 'Mois en cours', moisLabel(mc)),
      S('mc_maj', 'Dépenses du mois en cours jusqu’au', frDate(exp)),
      S('mc_revenus', 'Revenus du mois en cours', revMc.total, '€'),
      S('mc_salaire', 'Salaire versé fin ' + moisNom(mt), revMc.sal, '€'),
      S('mc_salaire_mois', 'Mois du salaire', moisNom(mt)),
      S('mc_caf', 'CAF', revMc.caf, '€'),
      S('mc_caf_etat', 'État CAF', revMc.cafEtat),
      S('mc_al', 'Action Logement', revMc.al, '€'),
      S('mc_al_etat', 'État Action Logement', revMc.alEtat),
      S('mc_loisirs', 'Budget loisirs du mois en cours', r2(budgetLoisirs(revMc.total)), '€'),
      S('tr_mois', 'Mois du virement', moisLabel(mt)),
      S('tr_revenus', 'Revenus du mois', vir.rv, '€'),
      S('tr_fixes', 'Charges fixes passées', vir.fx, '€'),
      S('tr_depenses', 'Loisirs et charges variables dépensés', vir.dp, '€'),
      S('tr_env', 'Part mensuelle des enveloppes', r2(envMois), '€'),
      S('tr_trou_env', 'Dépassement de la caisse des enveloppes', vir.te, '€'),
      S('tr_envois', 'Envoyé vers l’épargne', mvt.envois, '€'),
      S('tr_retraits', 'Retiré de l’épargne', mvt.retraits, '€'),
      S('tr_manque', 'Manque du mois', manque, '€'),
      S('tr_report', 'Report du mois précédent', report, '€'),
      S('tr_virement', 'À virer', Math.max(0, virTotal), '€'),
      S('tr_deja', 'Déjà viré (net des retraits)', deja, '€'),
      S('tr_reste', 'Reste à virer', Math.max(0, resteVir), '€'),
      S('tr_etat', 'État du virement', manque > 0 ? 'Mois fini à −' + fr2(manque) + ' € : cet argent a été pris sur ton compte courant.' : virTotal <= 0 ? 'Rien à virer ce mois-ci.' : deja <= 0 && mvt.retraits === 0 ? 'Pas encore fait.' : resteVir <= 0 ? 'Fait.' : 'En partie fait.'),
      S('tr_note', 'Report', manque > 0 ? (laisses[mt] ? 'Tu as choisi de le laisser filer : rien n’est reporté sur le mois prochain.' : fr2(manque) + ' € seront déduits du virement du mois prochain, sauf si tu choisis de les laisser filer.') : 'Montant à virer sur ton compte d’épargne en début de mois.')
    ];
    // ---------- Vue « Ce mois-ci » ----------
    const jourOf = (iso) => Number(iso.slice(8, 10));
    const nbJours = new Date(Date.UTC(Number(mc.slice(0, 4)), Number(mc.slice(5, 7)), 0)).getUTCDate();
    const auj = exp.slice(0, 7) === mc ? jourOf(exp) : nbJours;
    // Jour habituel d'une opération : celui du dernier passage (charges fixes, salaire)
    const jourHabituel = (poste) => { const l = ops.filter((o) => o.poste === poste && o.mois < mc).sort((a, b) => (a.date < b.date ? 1 : -1))[0]; return l ? Math.min(jourOf(l.date), nbJours) : null; };
    const jSalaire = jourHabituel('Salaire') || 28;
    const jEnv = Math.min(jSalaire + 1, nbJours);
    const blocsBudget = { Loisirs: 0, 'Charges variables': 0 };
    moisEnCours.forEach((l) => { blocsBudget[l.bloc] += l.depense; });
    const envMc = parType('Enveloppe annuelle').map((r) => {
      const dep = r2(-somme(ops.filter((o) => o.poste === r.poste && o.mois >= mc.slice(0, 4) + '-01' && o.mois <= mc).map((o) => Number(o.montant))));
      return ligne(r, 'Enveloppes', Number(r.montant), dep, { depense_mois: net(mc, r.poste) });
    });
    const envDepMc = r2(somme(envMc.map((l) => l.depense_mois)));
    // Courbe : revenus du mois, moins les charges fixes et les dépenses du budget au jour le jour, moins la part des enveloppes le lendemain du salaire
    const parJour = new Array(nbJours + 1).fill(0);
    ops.filter((o) => o.mois === mc && (postesFixes.includes(o.poste) || postesBudget.includes(o.poste))).forEach((o) => { parJour[jourOf(o.date)] += Number(o.montant); });
    const fixesMc = parType('Charge fixe').map((r) => {
      const passe = net(mc, r.poste), j = jourHabituel(r.poste);
      let attendu = Number(r.montant);
      if (r.id === 'prime') attendu = mc.slice(5) === '02' ? r2(attendu * 12) : 0;
      return { poste: r.poste, passe, attendu: r2(attendu), jour: j || nbJours, reste: passe > 0.01 ? 0 : r2(attendu) };
    });
    const courbe = [{ j: 0, v: revMc.total }];
    let v = revMc.total;
    for (let j = 1; j <= auj; j++) { v += parJour[j]; if (j === jEnv) v -= envMois; courbe.push({ j, v: r2(v) }); }
    const resteBudget = somme(moisEnCours.map((l) => Math.max(0, l.reste)));
    const proj = [{ j: auj, v: r2(v) }];
    for (let j = auj + 1; j <= nbJours; j++) {
      v -= resteBudget / (nbJours - auj);
      fixesMc.forEach((f) => { if (f.reste > 0 && Math.max(f.jour, auj + 1) === j) v -= f.reste; });
      if (j === jEnv) v -= envMois;
      proj.push({ j, v: r2(v) });
    }
    const aVenir = fixesMc.filter((f) => f.reste > 0).map((f) => ({ jour: f.jour, libelle: f.poste, detail: f.jour < auj ? 'charge fixe, pas encore vue' : 'charge fixe', montant: -f.reste }))
      .concat(jEnv > auj ? [{ jour: jEnv, libelle: 'Part des enveloppes', detail: 'vers la caisse des enveloppes', montant: -r2(envMois) }] : [])
      .concat(jSalaire >= auj && recu(mc, 'Salaire') === 0 ? [{ jour: jSalaire, libelle: 'Salaire', detail: 'attendu, compte pour ' + moisNom(moisDecale(mc, 1)), montant: ref('rev_sal') }] : [])
      .sort((a, b) => a.jour - b.jour);

    // Caisse des enveloppes à aujourd'hui : fin du mois terminé, moins les enveloppes déjà payées ce mois-ci
    let nbVerse = 0; for (let m = premierMois; m <= mt; m = moisDecale(m, 1)) nbVerse++;
    const envDepuis = r2(-somme(ops.filter((o) => o.mois >= premierMois && postesEnv.includes(o.poste)).map((o) => Number(o.montant))));
    const caisse = { depuis: moisLabel(premierMois), verse: r2(nbVerse * envMois), depense: envDepuis, valeur: r2(caisseFin - envDep(mc)), mois_suivant: moisLabel(mc) };

    // Coussin : solde du compte courant la veille de chaque salaire (fin du mois budgétaire)
    const soldes = bundle.soldes || {}, joursSolde = Object.keys(soldes).sort();
    const seuilCoussin = Number(bundle.coussin_min) || 150;
    const coussinL = [];
    if (joursSolde.length) {
      const moisSal = [...new Set(ops.filter((o) => o.poste === 'Salaire' && jourDe(o.date) >= 20).map((o) => o.mois))].sort();
      moisSal.forEach((m) => {
        const dSal = ops.filter((o) => o.poste === 'Salaire' && o.mois === m && jourDe(o.date) >= 20).map((o) => o.date).sort()[0];
        const veille = joursSolde.filter((d) => d < dSal).pop();
        if (veille && veille >= joursSolde[0]) coussinL.push({ mois: m, mois_lib: moisLabel(m), date: veille, jour: frDate(veille), solde: soldes[veille] });
      });
    }
    coussinL.forEach((c, i) => { c.ecart = i ? r2(c.solde - coussinL[i - 1].solde) : null; });
    const dernier = coussinL[coussinL.length - 1] || null;
    const coussin = { seuil: seuilCoussin, liste: coussinL.slice(-12), dernier, sous_seuil: !!dernier && dernier.solde < seuilCoussin, baisse: !!dernier && dernier.ecart !== null && dernier.ecart < 0 };

    // ---------- Répartition réelle (repère 50 / 30 / 20) ----------
    // Moyenne des mois terminés (12 au plus), sur ce qui est vraiment passé sur le compte.
    // Obligations : charges fixes, charges variables, enveloppes de santé et d'entretien.
    // Plaisir : loisirs, autres enveloppes, hors budget (voyages). Les revenus exceptionnels ne comptent pas.
    const groupeDe = (o) => (o.bloc === 'Charges fixes' || o.bloc === 'Charges variables' ? 'obligations'
      : o.bloc === 'Loisirs' || o.bloc === 'Hors budget' ? 'plaisir'
      : o.bloc === 'Enveloppes' ? (/sant|entretien/i.test(o.poste) ? 'obligations' : 'plaisir') : null);
    const depGroupe = {};
    ops.forEach((o) => { const g = groupeDe(o); if (g) { const k = o.mois + '|' + g; depGroupe[k] = (depGroupe[k] || 0) - Number(o.montant); } });
    const repartition = (liste) => {
      const moy = (f) => (liste.length ? r2(somme(liste.map(f)) / liste.length) : 0);
      const x = { mois: liste, revenus: moy((m) => revenusDe(m, false).total), salaire: moy((m) => revenusDe(m, false).sal),
        obligations: moy((m) => depGroupe[m + '|obligations'] || 0), plaisir: moy((m) => depGroupe[m + '|plaisir'] || 0) };
      x.depenses = r2(x.obligations + x.plaisir); x.epargne = r2(x.revenus - x.depenses);
      const pr = (y) => (x.revenus > 0 ? y / x.revenus : 0);
      x.pct = { obligations: pr(x.obligations), plaisir: pr(x.plaisir), epargne: pr(x.epargne) };
      return x;
    };
    const moisReels = [];
    if (ops.length) for (let m = mt; m >= premierOps && moisReels.length < 12; m = moisDecale(m, -1)) moisReels.unshift(m);
    const reel = repartition(moisReels);
    const dernierReel = moisReels.length ? repartition([mt]) : null;
    // Base des projections : la moyenne réelle, ou le budget de référence tant qu'aucun mois n'est terminé
    const base = reel.mois.length
      ? { revenus: reel.revenus, depenses: reel.depenses, epargne: reel.epargne, plaisir: reel.plaisir, salaire: reel.salaire > 0 ? reel.salaire : ref('rev_sal'), reel: true }
      : { revenus: r2(ref('rev_sal') + ref('rev_caf') + ref('rev_al')), depenses: r2(fixes + variables + envMois + loisirsNormal), epargne: r2(partagerNormal - loisirsNormal), plaisir: r2(loisirsNormal), salaire: ref('rev_sal'), reel: false };
    base.pct_epargne = base.revenus > 0 ? base.epargne / base.revenus : 0;

    const vue = {
      mc, mois_mc: moisLabel(mc), auj, nbJours, revenus: revMc.total,
      prevu: { loisirs: r2(budgetLoisirs(revMc.total)), variables, env: r2(envMois), fixes },
      depense: { loisirs: r2(blocsBudget.Loisirs), variables: r2(blocsBudget['Charges variables']), env: envDepMc },
      postes: moisEnCours, enveloppes: envMc, courbe, projection: proj, fin: r2(v), jEnv, aVenir,
      epargne: { mois: moisLabel(mt), cle: mt, a_virer: Math.max(0, virTotal), deja, reste: Math.max(0, resteVir), manque, laisse: !!laisses[mt], retraits: mvt.retraits, trou_env: vir.te },
      coussin,
      caisse, nc, fixKo: fixesL.filter((l) => !l.ok).map((l) => l.poste),
      normal: { revenus: r2(ref('rev_sal') + ref('rev_caf') + ref('rev_al')), fixes, variables, env: r2(envMois), loisirs: r2(loisirsNormal), epargne: r2(partagerNormal - loisirsNormal) },
      patrimoine: patrimoine(bundle, mc, fixes + variables + envMois + loisirsNormal),
      reel, dernier: dernierReel, base
    };

    // Les montants calculés de la page Règles suivent les montants de référence
    const refsAff = refs.map((r) => (r.id === 'part_loisirs' ? Object.assign({}, r, { montant: r2(part * 100) }) : r.id === 'env_mois' ? Object.assign({}, r, { montant: r2(envMois) }) : r));
    return {
      datasets: { mois_courant: moisCourant, mois_en_cours: moisEnCours, operations: ops, references: refsAff, regles: bundle.regles || [], synthese },
      textes: { mois: moisNom(mt), mois_lib: moisLabel(mt), mois_mc: moisLabel(mc), annee: an, annee_suiv: String(Number(an) + 1) },
      vue
    };
  }

  // ---------- Patrimoine ----------
  // bundle.patrimoine : { livret: {valeur, date}, pea: [{date, valeur}], tr: {date, solde, fins: {mois: solde}}, pret: {capital, date, taux, mensualite, debut} }
  // Livret A : valeur saisie, ajustée par les virements depuis ou vers le livret vus sur le compte courant.
  function patrimoine(bundle, mc, depMois) {
    const P = bundle.patrimoine || {}, ops = bundle.operations || [];
    const finMois = (m) => m + '-31';
    const fluxLivret = ops.filter((o) => /LIVRET A/i.test(o.libelle) && o.bloc === 'Interne');
    // Après la valeur saisie, chaque 1er janvier ajoute les intérêts estimés (taux saisi × valeur au 31 décembre)
    const livretAu = (d) => {
      if (!P.livret) return null;
      const b = P.livret, taux = Number(b.taux) || 0;
      if (d < b.date) return r2(b.valeur + fluxLivret.filter((o) => o.date > d && o.date <= b.date).reduce((s, o) => s + Number(o.montant), 0));
      let v = b.valeur, depuis = b.date;
      for (let an = Number(b.date.slice(0, 4)) + 1; an + '-01-01' <= d; an++) {
        const jan = an + '-01-01';
        v -= fluxLivret.filter((o) => o.date > depuis && o.date < jan).reduce((s, o) => s + Number(o.montant), 0);
        v += v * taux / 100; depuis = jan > depuis ? (an - 1) + '-12-31' : depuis;
      }
      v -= fluxLivret.filter((o) => o.date > depuis && o.date <= d).reduce((s, o) => s + Number(o.montant), 0);
      return r2(v);
    };
    // Avant la première valeur saisie, le PEA compte pour 0 (sauf pour la valeur du jour)
    const peaAu = (d) => { const l = (P.pea || []).filter((x) => x.date <= d).sort((a, b) => (a.date < b.date ? 1 : -1))[0]; return l ? l.valeur : (P.pea || []).length ? 0 : null; };
    const trAu = (m) => {
      if (!P.tr) return null;
      const ks = Object.keys(P.tr.fins || {}).filter((k) => k <= m).sort();
      return ks.length ? P.tr.fins[ks[ks.length - 1]] : 0;
    };
    const detteAu = (m) => {
      const p = P.pret; if (!p) return null;
      if (p.debut && m < p.debut) return 0;
      const t = Number(p.taux) / 100 / 12, k0 = p.date.slice(0, 7);
      let c = Number(p.capital);
      if (m >= k0) for (let x = k0; x < m; x = moisDecale(x, 1)) c = Math.max(0, c * (1 + t) - p.mensualite);
      else for (let x = k0; x > m; x = moisDecale(x, -1)) c = (c + p.mensualite) / (1 + t);
      return r2(c);
    };
    const finPret = () => {
      const p = P.pret; if (!p || !(p.mensualite > 0)) return null;
      const t = Number(p.taux) / 100 / 12; let c = Number(p.capital), m = p.date.slice(0, 7), n = 0;
      while (c > 0.01 && n < 600) { c = c * (1 + t) - p.mensualite; m = moisDecale(m, 1); n++; }
      return moisLabel(m);
    };
    const aujourd = bundle.export || new Date().toISOString().slice(0, 10);
    const livret = livretAu(aujourd), pea = peaAu(aujourd), tr = P.tr ? P.tr.solde : null, dette = detteAu(mc);
    const brut = r2((livret || 0) + (pea || 0) + (tr || 0)), netV = r2(brut - (dette || 0));
    // Courbe : fins de mois, depuis le déblocage du prêt (ou 12 mois au plus)
    let m0 = moisDecale(mc, -11);
    if (P.pret && P.pret.debut && P.pret.debut > m0) m0 = P.pret.debut;
    const courbe = [];
    for (let m = m0; m <= mc; m = moisDecale(m, 1)) {
      const d = m === mc ? aujourd : finMois(m);
      const b = r2((livretAu(d) || 0) + (peaAu(d) || 0) + (m === mc ? tr || 0 : trAu(m) || 0)), dt = detteAu(m) || 0;
      courbe.push({ mois: m, brut: b, dette: dt, net: r2(b - dt) });
    }
    const peaDer = (P.pea || []).slice().sort((a, b) => (a.date < b.date ? 1 : -1))[0];
    return {
      complet: livret !== null && pea !== null && tr !== null && dette !== null,
      livret, pea, pea_date: peaDer ? frDate(peaDer.date) : '', tr, tr_date: P.tr ? frDate(P.tr.date) : '',
      dette, fin_pret: finPret(), brut, net: netV, courbe,
      livret_taux: P.livret && P.livret.taux ? Number(P.livret.taux) : null,
      matelas: depMois > 0 ? Math.round((livret || 0) / depMois * 10) / 10 : 0
    };
  }

  // ---------- Projections (questions facultatives : ce qui manque prend une hypothèse) ----------
  const val = (x) => (x === '' || x === null || x === undefined || !isFinite(Number(x)) ? null : Number(x));
  const choix = (x, def) => { const v = val(x); return v === null ? { v: def, hyp: true } : { v, hyp: false }; };
  const moisEntre = (deK, aK) => (Number(aK.slice(0, 4)) - Number(deK.slice(0, 4))) * 12 + Number(aK.slice(5, 7)) - Number(deK.slice(5, 7));
  // calc : le résultat de calculer(). Base : la moyenne réelle des mois terminés.
  function projeter(type, rep, calc) {
    const v = calc.vue, P = v.base, S = Math.max(0, Number(P.salaire) || 0), livret = v.patrimoine.livret;
    const reserveDe = (deficit) => (deficit > 0 && livret ? Math.round(livret / deficit * 10) / 10 : null);
    const out = { hyp: {}, reserve: P.depenses > 0 && livret ? Math.round(livret / P.depenses * 10) / 10 : null };
    const note = (k, o) => { out.hyp[k] = o.hyp; return o.v; };
    if (type === 'conges') {
      const jours = note('jours', choix(rep.jours, 5));
      const mois = rep.mois && /^\d{4}-\d\d$/.test(rep.mois) ? rep.mois : moisDecale(v.mc, 4); out.hyp.mois = !rep.mois;
      const parJour = note('par_jour', choix(rep.par_jour, r2(S / 21.67)));
      const total = r2(jours * parJour), n = Math.max(1, moisEntre(v.mc, mois)), parMois = r2(total / n);
      out.res = { jours, mois, mois_lib: moisLabel(mois), par_jour: parJour, total, n, par_mois: parMois,
        epargne_avant: P.pct_epargne, epargne_pendant: P.revenus > 0 ? (P.epargne - parMois) / P.revenus : 0, sans_rien: r2(P.epargne - total) };
    } else if (type === 'baisse') {
      const nouveau = note('salaire', choix(rep.salaire, r2(S * 0.8)));
      const autres = P.revenus - S, rev = r2(nouveau + autres), ep = r2(rev - P.depenses);
      out.res = { salaire: nouveau, revenus: rev, epargne: ep, epargne_pct: rev > 0 ? ep / rev : 0, avant_pct: P.pct_epargne,
        a_reduire: ep < 0 ? r2(-ep) : 0, reduc_plaisir: ep < 0 && P.plaisir > 0 ? Math.min(1, -ep / P.plaisir) : 0,
        reserve: reserveDe(-ep), reserve_sans_salaire: reserveDe(r2(P.depenses - autres)) };
    } else if (type === 'projet') {
      const montantP = note('montant', choix(rep.montant, 1000));
      const deja = note('deja', choix(rep.deja, 0));
      const mois = rep.mois && /^\d{4}-\d\d$/.test(rep.mois) ? rep.mois : moisDecale(v.mc, 12); out.hyp.mois = !rep.mois;
      const n = Math.max(1, moisEntre(v.mc, mois)), parMois = r2(Math.max(0, montantP - deja) / n);
      out.res = { montant: montantP, deja, mois, mois_lib: moisLabel(mois), n, par_mois: parMois, pct: P.revenus > 0 ? parMois / P.revenus : 0, epargne_reste: r2(P.epargne - parMois) };
    }
    return out;
  }

  // ---------- Export Trade Republic (CSV) ----------
  // Solde espèces du compte titres (hors PEA) : somme des montants, frais et impôts ; solde de chaque fin de mois.
  function lireTR(texte) {
    const lignes = texte.replace(/^﻿/, '').split(/\r?\n/).filter((l) => l.trim());
    const champs = (l) => { const out = []; let cur = '', q = false; for (let i = 0; i < l.length; i++) { const c = l[i]; if (q) { if (c === '"') { if (l[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; } else if (c === '"') q = true; else if (c === ',') { out.push(cur); cur = ''; } else cur += c; } out.push(cur); return out; };
    const h = champs(lignes[0]), ix = (n) => h.indexOf(n);
    const iD = ix('date'), iA = ix('amount'), iF = ix('fee'), iT = ix('tax'), iC = ix('account_type');
    if (iD < 0 || iA < 0 || iC < 0) throw new Error('Ce CSV ne ressemble pas à un export Trade Republic.');
    const rows = lignes.slice(1).map(champs).filter((c) => c[iC] !== 'PEA' && /^\d{4}-\d\d-\d\d/.test(c[iD])).sort((a, b) => (a[iD] < b[iD] ? -1 : 1));
    const n = (x) => (x ? Number(x) : 0);
    let s = 0; const fins = {};
    rows.forEach((c) => { s += n(c[iA]) + n(c[iF]) + n(c[iT]); fins[c[iD].slice(0, 7)] = r2(s); });
    return { date: rows.length ? rows[rows.length - 1][iD].slice(0, 10) : '', solde: r2(s), fins };
  }
  const estTR = (texte) => /"?account_type"?/.test(texte.slice(0, 400)) && /"?transaction_id"?/.test(texte.slice(0, 400));

  // ---------- Remise à jour annuelle des montants de référence ----------
  // Propose des montants à partir des 12 derniers mois terminés. `coche` : appliqué par défaut.
  function proposer(bundle) {
    const refs = bundle.references, ops = bundle.operations;
    const exp = bundle.export || ops.reduce((m, o) => (o.date > m ? o.date : m), '');
    const mt = moisDecale(exp.slice(0, 7), -1), debut = moisDecale(mt, -11);
    const dans = (o) => o.mois >= debut && o.mois <= mt;
    const somme12 = (poste) => r2(-ops.filter((o) => dans(o) && o.poste === poste).reduce((s, o) => s + Number(o.montant), 0));
    const recu12 = (poste) => -somme12(poste);
    const dernierMois = (poste) => { for (let m = mt; m >= debut; m = moisDecale(m, -1)) { const v = r2(-ops.filter((o) => o.mois === m && o.poste === poste).reduce((s, o) => s + Number(o.montant), 0)); if (v > 0) return { v, m }; } return null; };
    const periode = moisLabel(debut) + ' à ' + moisLabel(mt);
    const out = [];
    const P = (r, propose, base, coche) => { if (propose === null || !isFinite(propose)) return; out.push({ id: r.id, type: r.type, poste: r.poste, actuel: Number(r.montant), propose: r2(propose), base, coche: coche && Math.abs(r2(propose) - Number(r.montant)) >= 0.01 }); };
    refs.forEach((r) => {
      if (r.type === 'Revenu') {
        if (r.id === 'rev_sal') P(r, recu12('Salaire') / 12, 'Moyenne des salaires versés de ' + periode, true);
        else if (r.id === 'rev_caf') { const l = ops.filter((o) => o.poste === 'CAF' && o.montant > 0).sort((a, b) => (a.date < b.date ? 1 : -1))[0]; if (l) P(r, Number(l.montant), 'Dernier versement (' + l.jour + ')', true); }
        else if (r.id === 'rev_al') P(r, recu12('Action Logement') / 12, 'Total reçu de ' + periode + ', divisé par 12', true);
      } else if (r.type === 'Charge fixe') {
        if (r.id === 'sport' || r.id === 'prime') {
          // Abonnement récent : pas assez d'historique pour une moyenne fiable
          const mois = new Set(ops.filter((o) => dans(o) && o.poste === r.poste && o.montant < 0).map((o) => o.mois)).size;
          if (r.id === 'prime' ? mois >= 1 : mois >= 10) P(r, somme12(r.poste) / 12, 'Total payé de ' + periode + ', divisé par 12', true);
        }
        else { const d = dernierMois(r.poste); if (d) P(r, d.v, 'Montant passé en ' + moisLabel(d.m), true); }
      } else if (r.type === 'Charge variable' || r.type === 'Loisir') {
        P(r, somme12(r.poste) / 12, 'Moyenne réelle de ' + periode + ' (seuil à décider)', false);
      } else if (r.type === 'Enveloppe annuelle') {
        const c = somme12(r.poste);
        if (r.id === 'entretien') P(r, c * 0.9, 'Cumul de ' + periode + ' (' + String(c.toFixed(2)).replace('.', ',') + ' €) moins 10 %', true);
        else P(r, c, 'Cumul net de ' + periode, r.id === 'sante');
      }
    });
    return { periode, lignes: out };
  }

  // ---------- Zip (export bancaire compressé) ----------
  async function lireZip(buf) {
    const v = new DataView(buf), u8 = new Uint8Array(buf);
    let p = 0;
    while (p + 30 <= u8.length && v.getUint32(p, true) === 0x04034b50) {
      const meth = v.getUint16(p + 8, true), flags = v.getUint16(p + 6, true);
      let taille = v.getUint32(p + 18, true);
      const nl = v.getUint16(p + 26, true), xl = v.getUint16(p + 28, true);
      const nom = new TextDecoder().decode(u8.subarray(p + 30, p + 30 + nl));
      const deb = p + 30 + nl + xl;
      if (flags & 8 && taille === 0) taille = tailleDepuisCentral(v, u8, nom);
      const data = u8.subarray(deb, deb + taille);
      if (/\.csv$/i.test(nom)) {
        if (meth === 0) return { nom, texte: new TextDecoder('utf-8').decode(data) };
        if (meth === 8) {
          const s = new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
          return { nom, texte: await new Response(s).text() };
        }
        throw new Error('Compression du zip non prise en charge.');
      }
      p = deb + taille;
    }
    throw new Error('Pas de fichier CSV dans ce zip.');
  }
  function tailleDepuisCentral(v, u8, nom) {
    for (let p = u8.length - 22; p >= 0; p--) if (v.getUint32(p, true) === 0x06054b50) {
      let c = v.getUint32(p + 16, true);
      while (v.getUint32(c, true) === 0x02014b50) {
        const nl = v.getUint16(c + 28, true), n = new TextDecoder().decode(u8.subarray(c + 46, c + 46 + nl));
        if (n === nom) return v.getUint32(c + 20, true);
        c += 46 + nl + v.getUint16(c + 30, true) + v.getUint16(c + 32, true);
      }
      break;
    }
    return 0;
  }

  // Renomme des postes partout (montants de référence, opérations, règles), une seule fois par renommage
  function renommerPostes(bundle, paires) {
    const faits = new Set(bundle.renommages || []), aFaire = paires.filter(([a, b]) => !faits.has(a + '>' + b));
    if (!aFaire.length) return bundle;
    const ren = (x) => { const p = aFaire.find(([a]) => x && x.poste === a); return p ? Object.assign({}, x, { poste: p[1] }) : x; };
    const l = (k) => (bundle[k] || []).map(ren);
    return Object.assign({}, bundle, { references: l('references'), operations: l('operations'), regles: l('regles'), regles_auto: l('regles_auto'), regles_perso: l('regles_perso'),
      renommages: [...faits, ...aFaire.map(([a, b]) => a + '>' + b)] });
  }

  // Montants de référence corrigés à la demande, une seule fois chacun
  function ajusterReferences(bundle, liste) {
    const faits = new Set(bundle.ajustements || []), aFaire = liste.filter((a) => !faits.has(a.cle));
    if (!aFaire.length) return bundle;
    const refs = bundle.references.map((r) => { const a = aFaire.find((x) => x.id === r.id); return a ? Object.assign({}, r, { montant: a.montant, note: a.note }) : r; });
    return Object.assign({}, bundle, { references: refs, ajustements: [...faits, ...aFaire.map((a) => a.cle)] });
  }

  const api = { renommerPostes, ajusterReferences, lireExport, importer, reclasser, calculer, projeter, moisLabel, proposer, lireZip, postes, marchand, lireTR, estTR };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.Moteur = api;
})(typeof window !== 'undefined' ? window : globalThis);
