// Moteur du budget : lecture de l'export bancaire (CSV ou zip), classement des opérations et calcul des tableaux.
// Fonctionne dans le navigateur (window.Moteur) et sous Node (module.exports) pour les tests.
(function (root) {
  const r2 = (x) => Math.round(x * 100) / 100;
  const norm = (s) => String(s || '').replace(/[\s  ]+/g, ' ').trim();
  const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
  const moisNom = (k) => MOIS[Number(k.slice(5, 7)) - 1];
  const moisLabel = (k) => moisNom(k) + ' ' + k.slice(0, 4);
  const moisDecale = (k, n) => { const d = new Date(Date.UTC(Number(k.slice(0, 4)), Number(k.slice(5, 7)) - 1 + n, 1)); return d.toISOString().slice(0, 7); };
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
    if (!/^date op/.test(h[iDate] || '')) throw new Error('Ce fichier ne ressemble pas à un export de la banque.');
    const ops = [];
    rows.slice(1).forEach((r) => {
      let d = norm(r[iDate]);
      if (/^\d\d\/\d\d\/\d{4}$/.test(d)) d = d.slice(6) + '-' + d.slice(3, 5) + '-' + d.slice(0, 2);
      const m = montant(r[iMt]);
      if (!/^\d{4}-\d\d-\d\d$/.test(d) || !isFinite(m)) return;
      ops.push({ date: d, libelle: norm(r[iLib]), montant: r2(m), cat: norm(r[iCat]) });
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
    [/^tabac/i, 'Loisirs', 'Tabac'],
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
    const debut = moisDecale(dExport.slice(0, 7), -12);
    const vus = new Set(); let nouvelles = 0, aClasser = 0, migres = 0;
    const ops = [];
    brut.forEach((o) => {
      const p = pool[cle(o)];
      if (p && p.length) {
        let a = p.shift(); vus.add(a);
        if (a.poste === 'Mouvements internes' && regleEpargne(o)) { a = Object.assign({}, a, { poste: EPARGNE, src: 'règle' }); migres++; }
        if (a.mois >= debut) ops.push(a);
        return;
      }
      if (o.date.slice(0, 7) < debut) return;
      const c = classer(o, ctx);
      if (c.bloc === 'Exclu') return;
      nouvelles++; if (c.bloc === 'Non classé') aClasser++;
      ops.push({ date: o.date, libelle: o.libelle, montant: o.montant, bloc: c.bloc, poste: c.poste, id: ++maxId, mois: o.date.slice(0, 7), jour: frDate(o.date), src: c.src });
    });
    // Opérations plus anciennes que l'export mais encore dans la fenêtre de 12 mois
    anciens.forEach((o) => { if (!vus.has(o) && o.mois >= debut && o.date < brut.reduce((m, x) => (x.date < m ? x.date : m), '9999')) ops.push(o); });
    ops.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.id - b.id));
    const out = Object.assign({}, bundle, { version: 2, operations: ops, export: dExport, maj: new Date().toISOString() });
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
        // Formule de 45 € en cours, puis 30 € toutes les 4 semaines (0, 1 ou 2 paiements dans le mois)
        const f45 = Math.abs(dep - 45) < 0.01, x30 = dep > 0 && Math.abs(dep / 30 - Math.round(dep / 30)) < 0.001;
        const etat = f45 ? 'Formule de 45 € payée' : dep === 0 ? 'Rien ce mois, formule en cours' : x30 ? 'Conforme' : 'Écart';
        return Object.assign(base, { seuil: null, ok: etat !== 'Écart', etat, note: 'Formule de 45 € en cours, puis 30 € toutes les 4 semaines' });
      }
      if (r.id === 'prime') {
        const att = mt.slice(5) === '02' ? r2(mtt * 12) : 0, ok = Math.abs(dep - att) <= Math.max(1, att * 0.1);
        return Object.assign(base, { seuil: att, ok, etat: ok ? 'Conforme' : dep === 0 ? 'Aucun paiement trouvé' : 'Écart', note: 'Annuel, prélevé en février' });
      }
      const ok = Math.abs(dep - mtt) < 0.01;
      return Object.assign(base, { seuil: mtt, ok, etat: ok ? 'Conforme' : dep === 0 ? 'Aucun paiement trouvé' : 'Écart', note: 'Mensuel' });
    });
    const moisCourant = lignesMt.concat(env, [global], fixesL);

    // Virement d'épargne de fin de mois : revenus - charges fixes passées - loisirs et charges variables dépensés - part des enveloppes.
    // Un résultat négatif est reporté sur le mois suivant.
    const postesFixes = parType('Charge fixe').map((r) => r.poste);
    const postesBudget = parType('Loisir').concat(parType('Charge variable')).map((r) => r.poste);
    const brutVirement = (mois) => {
      const rv = revenusDe(mois, false).total;
      const fx = r2(somme(postesFixes.map((p) => net(mois, p))));
      const dp = r2(somme(postesBudget.map((p) => net(mois, p))));
      return { rv, fx, dp, v: r2(rv - fx - dp - envMois) };
    };
    const premierMois = ops.length ? moisDecale(ops.reduce((m, o) => (o.mois < m ? o.mois : m), '9999-99'), 1) : mt;
    let report = 0;
    for (let m = premierMois; m < mt; m = moisDecale(m, 1)) report = Math.min(0, r2(brutVirement(m).v + report));
    const vir = brutVirement(mt), virTotal = r2(vir.v + report);
    // Virements d'épargne faits pour ce mois : sorties à partir du 21 du mois terminé (un retrait depuis l'épargne ne compte pas)
    const deja = r2(-somme(ops.filter((o) => o.poste === EPARGNE && o.montant < 0 && o.date >= mt + '-21').map((o) => Number(o.montant))));
    const resteVir = r2(Math.max(0, virTotal) - deja);

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
      S('tr_report', 'Report du mois précédent', report, '€'),
      S('tr_virement', 'À virer', Math.max(0, virTotal), '€'),
      S('tr_deja', 'Déjà viré', deja, '€'),
      S('tr_reste', 'Reste à virer', Math.max(0, resteVir), '€'),
      S('tr_etat', 'État du virement', virTotal <= 0 ? 'Rien à virer ce mois-ci.' : deja === 0 ? 'Pas encore fait.' : resteVir <= 0 ? 'Fait' + (resteVir < 0 ? ' (' + (-resteVir).toFixed(2).replace('.', ',') + ' € de plus que prévu).' : '.') : 'En partie fait.'),
      S('tr_note', 'Report', virTotal < 0 ? 'Rien à virer : ' + (-virTotal).toFixed(2).replace('.', ',') + ' € seront déduits du virement du mois prochain.' : 'Montant à virer sur ton compte d’épargne en début de mois.')
    ];
    // Les montants calculés de la page Règles suivent les montants de référence
    const refsAff = refs.map((r) => (r.id === 'part_loisirs' ? Object.assign({}, r, { montant: r2(part * 100) }) : r.id === 'env_mois' ? Object.assign({}, r, { montant: r2(envMois) }) : r));
    return {
      datasets: { mois_courant: moisCourant, mois_en_cours: moisEnCours, operations: ops, references: refsAff, regles: bundle.regles || [], synthese },
      textes: { mois: moisNom(mt), mois_lib: moisLabel(mt), mois_mc: moisLabel(mc), annee: an, annee_suiv: String(Number(an) + 1) }
    };
  }

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

  const api = { lireExport, importer, reclasser, calculer, proposer, lireZip, postes, marchand };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.Moteur = api;
})(typeof window !== 'undefined' ? window : globalThis);
