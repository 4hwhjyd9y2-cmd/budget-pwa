// Tests du moteur, sur des données entièrement inventées (aucun relevé réel, aucun nom réel).
// Navigateur : ouvrir tests/index.html. Node : node tests/moteur.test.js
(function () {
  const M = typeof require !== 'undefined' ? require('../moteur.js') : window.Moteur;
  const resultats = [];
  let groupe = '';
  const dans = (nom) => { groupe = nom; };
  const noter = (nom, ok, detail) => resultats.push({ groupe, nom, ok, detail: ok ? '' : detail });
  const egal = (nom, obtenu, attendu) => noter(nom, obtenu === attendu, 'obtenu ' + JSON.stringify(obtenu) + ', attendu ' + JSON.stringify(attendu));
  const proche = (nom, obtenu, attendu) => noter(nom, typeof obtenu === 'number' && Math.abs(obtenu - attendu) < 0.011, 'obtenu ' + obtenu + ', attendu ' + attendu);
  const somme = (a) => a.reduce((s, x) => s + x, 0);

  // ---------- Jeu de données inventé ----------
  // Mois civils. Le salaire versé fin de mois compte pour le mois suivant.
  // Mars, avril et mai sont terminés ; juin est en cours (export du 15 juin).
  const EPARGNE = 'Virement d’épargne';
  let n = 0;
  const op = (date, libelle, montant, bloc, poste) => ({ id: ++n, date, mois: date.slice(0, 7), libelle, montant, bloc, poste, src: 'test' });
  const sal = (date, m) => op(date, 'VIR SEPA EMPLOYEUR FICTIF', m, 'Revenus', 'Salaire');
  const caf = (date) => op(date, 'VIR SEPA CAISSE FICTIVE', 20, 'Revenus', 'CAF');
  const loyer = (date) => op(date, 'PRLV SEPA BAILLEUR FICTIF', -600, 'Charges fixes', 'Loyer');
  const tel = (date) => op(date, 'PRLV SEPA OPERATEUR FICTIF', -20, 'Charges fixes', 'Téléphone');
  const courses = (date, m) => op(date, 'CARTE SUPERMARCHE FICTIF CB*0000', -m, 'Charges variables', 'Courses');
  const restos = (date, m) => op(date, 'CARTE BISTROT FICTIF CB*0000', -m, 'Loisirs', 'Restos, bars et sorties');
  const epargne = (date, m) => op(date, 'VIR VIREMENT VERS LIVRET A', -m, 'Interne', EPARGNE);
  const operations = [
    sal('2026-02-27', 2000),
    // Mars
    loyer('2026-03-02'), caf('2026-03-05'), tel('2026-03-10'), courses('2026-03-15', 280), restos('2026-03-20', 200), sal('2026-03-27', 2000),
    // Avril : virement d'épargne de mars (trop élevé), gros cadeau qui vide la caisse des enveloppes
    loyer('2026-04-02'), epargne('2026-04-03', 900), caf('2026-04-05'), tel('2026-04-10'), courses('2026-04-15', 320), restos('2026-04-20', 350),
    op('2026-04-22', 'CARTE FLEURISTE FICTIF CB*0000', -350, 'Enveloppes', 'Cadeaux'), sal('2026-04-28', 2200),
    // Mai
    loyer('2026-05-02'), epargne('2026-05-04', 500), caf('2026-05-05'), tel('2026-05-10'), courses('2026-05-15', 310), restos('2026-05-20', 250),
    op('2026-05-21', 'CARTE BOUTIQUE FICTIVE CB*0000', -60, 'Loisirs', 'Vêtements'),
    op('2026-05-22', 'CARTE PHARMACIE FICTIVE CB*0000', -40, 'Enveloppes', 'Santé'), sal('2026-05-28', 2000),
    // Juin, en cours : la CAF et le téléphone ne sont pas encore passés
    loyer('2026-06-02'), epargne('2026-06-05', 400), courses('2026-06-08', 100), restos('2026-06-12', 90)
  ];
  const R = (id, type, poste, montant) => ({ id, type, poste, montant });
  const references = [
    R('rev_sal', 'Revenu', 'Salaire', 2000), R('rev_caf', 'Revenu', 'CAF', 20),
    R('loyer', 'Charge fixe', 'Loyer', 600), R('tel', 'Charge fixe', 'Téléphone', 20),
    R('courses', 'Charge variable', 'Courses', 300),
    R('restos', 'Loisir', 'Restos, bars et sorties', 300), R('vetements', 'Loisir', 'Vêtements', 100),
    R('cadeaux', 'Enveloppe annuelle', 'Cadeaux', 600), R('sante', 'Enveloppe annuelle', 'Santé', 600),
    R('part_loisirs', 'Calcul', 'Part des loisirs', 0)
  ];
  const donnees = (plus) => Object.assign({
    version: 2, references, operations, regles: [], regles_perso: [],
    regles_auto: [{ motif: 'EMPLOYEUR FICTIF', sens: 'credit', bloc: 'Revenus', poste: 'Salaire' }],
    suivi_depuis: '2026-03', soldes: {}, export: '2026-06-15'
  }, plus || {});
  const c = M.calculer(donnees());
  const v = c.vue;
  const syn = (id) => c.datasets.synthese.find((s) => s.id === id).valeur;
  const lig = (l, id) => l.find((x) => x.id === id);

  // ---------- Budget de référence ----------
  dans('Budget de référence');
  proche('revenus de référence', v.normal.revenus, 2020);
  proche('charges fixes', v.normal.fixes, 620);
  proche('part mensuelle des enveloppes (1 200 € par an)', v.normal.env, 100);
  proche('loisirs', v.normal.loisirs, 400);
  proche('épargne de référence', v.normal.epargne, 600);
  proche('revenus = fixes + variables + enveloppes + loisirs + épargne', v.normal.revenus, v.normal.fixes + v.normal.variables + v.normal.env + v.normal.loisirs + v.normal.epargne);
  proche('part des loisirs dans la somme à partager (40 %)', lig(c.datasets.references, 'part_loisirs').montant, 40);

  // ---------- Mois terminé ----------
  dans('Mois terminé (mai)');
  egal('mois affiché', syn('mois_cle'), '2026-05');
  proche('revenus : salaire versé fin avril + CAF de mai', syn('revenus'), 2220);
  proche('somme à partager', syn('a_partager'), 1200);
  proche('budget loisirs : 40 % de la somme à partager', syn('loisirs_mois'), 480);
  proche('restos : plafond au prorata (300 / 400)', lig(c.datasets.mois_courant, 'restos').seuil, 360);
  proche('vêtements : plafond au prorata (100 / 400)', lig(c.datasets.mois_courant, 'vetements').seuil, 120);
  proche('courses : plafond fixe', lig(c.datasets.mois_courant, 'courses').seuil, 300);
  proche('courses : dépassement visible', lig(c.datasets.mois_courant, 'courses').reste, -10);
  proche('budget du mois : plafond', lig(c.datasets.mois_courant, 'global').seuil, 780);
  proche('budget du mois : dépensé', lig(c.datasets.mois_courant, 'global').depense, 620);
  egal('loyer : conforme', lig(c.datasets.mois_courant, 'f_loyer').etat, 'Conforme');
  proche('enveloppe cadeaux : cumul depuis janvier', lig(c.datasets.mois_courant, 'cadeaux').depense, 350);
  egal('aucune charge fixe à vérifier', syn('fix_ko'), 0);

  // ---------- Virement d'épargne ----------
  dans('Virement d’épargne');
  proche('revenus du mois', syn('tr_revenus'), 2220);
  proche('charges fixes passées', syn('tr_fixes'), 620);
  proche('loisirs et charges variables dépensés', syn('tr_depenses'), 620);
  proche('report : trop viré en mars, puis en avril', syn('tr_report'), -100);
  proche('à virer = 2 220 − 620 − 620 − 100 − report', syn('tr_virement'), 780);
  proche('déjà viré : l’envoi du 5 juin compte pour mai', syn('tr_deja'), 400);
  proche('reste à virer', syn('tr_reste'), 380);
  egal('état', syn('tr_etat'), 'En partie fait.');
  proche('Ce mois-ci affiche le même montant à virer', v.epargne.a_virer, syn('tr_virement'));
  proche('Ce mois-ci affiche le même reste à virer', v.epargne.reste, syn('tr_reste'));
  const cLaisse = M.calculer(donnees({ deficits_laisses: { '2026-04': true } }));
  proche('manque laissé filer : pas de report', cLaisse.vue.epargne.a_virer, 880);
  const cAvril = M.calculer(donnees({ export: '2026-05-15', operations: operations.filter((o) => o.date <= '2026-05-15') }));
  proche('avril : la caisse des enveloppes passe sous zéro, le trou sort de l’épargne', cAvril.vue.epargne.trou_env, 150);
  proche('avril : à virer = 2 020 − 620 − 670 − 100 − 150 − 80 de report', cAvril.vue.epargne.a_virer, 400);

  // ---------- Caisse des enveloppes ----------
  dans('Caisse des enveloppes');
  proche('versé : 3 mois à 100 €', v.caisse.verse, 300);
  proche('dépensé depuis le début du suivi', v.caisse.depense, 390);
  proche('valeur : repart de zéro après le trou d’avril', v.caisse.valeur, 60);

  // ---------- Mois en cours ----------
  dans('Mois en cours (juin)');
  egal('mois en cours', v.mc, '2026-06');
  egal('jour de l’export', v.auj, 15);
  proche('revenus : salaire versé fin mai + CAF attendue', v.revenus, 2020);
  egal('CAF pas encore arrivée : attendue', syn('mc_caf_etat'), 'attendue');
  proche('budget loisirs', v.prevu.loisirs, 400);
  proche('loisirs dépensés', v.depense.loisirs, 90);
  proche('charges variables dépensées', v.depense.variables, 100);
  proche('restos : reste', lig(v.postes, 'restos').reste, 210);
  proche('courbe : solde du budget au jour de l’export', v.courbe[v.courbe.length - 1].v, 1230);
  egal('à venir : téléphone, part des enveloppes, salaire', v.aVenir.length, 3);
  proche('fin de mois prévue = revenus − fixes − budgets − enveloppes', v.fin, 600);
  proche('fin de mois prévue = épargne de référence (aucun dépassement)', v.fin, v.normal.epargne);

  // ---------- Cohérence entre les pages ----------
  dans('Cohérence entre les pages');
  const brut = (mois, poste) => -somme(operations.filter((o) => o.mois === mois && o.poste === poste).map((o) => o.montant));
  proche('Opérations : total d’un poste = dépensé affiché (mois en cours)', brut('2026-06', 'Courses'), lig(v.postes, 'courses').depense);
  proche('Opérations : total d’un poste = dépensé affiché (mois terminé)', brut('2026-05', 'Restos, bars et sorties'), lig(c.datasets.mois_courant, 'restos').depense);
  proche('dépensé du mois = somme des postes', v.depense.loisirs + v.depense.variables, somme(v.postes.map((l) => l.depense)));
  proche('plafonds des loisirs = budget loisirs', somme(v.postes.filter((l) => l.bloc === 'Loisirs').map((l) => l.seuil)), v.prevu.loisirs);
  const attendu = 2220 - (brut('2026-05', 'Loyer') + brut('2026-05', 'Téléphone')) - (brut('2026-05', 'Courses') + brut('2026-05', 'Restos, bars et sorties') + brut('2026-05', 'Vêtements')) - 100 - 100;
  proche('à virer : recalcul depuis les opérations brutes', v.epargne.a_virer, attendu);

  // ---------- Patrimoine ----------
  dans('Patrimoine');
  const cPat = M.calculer(donnees({ patrimoine: { livret: { valeur: 3000, date: '2026-05-01' } } }));
  proche('livret : valeur saisie + virements vus après la date', cPat.vue.patrimoine.livret, 3900);
  proche('matelas en mois de dépenses de référence', cPat.vue.patrimoine.matelas, 2.7);
  const cPret = M.calculer(donnees({ patrimoine: { pret: { capital: 1000, date: '2026-06-01', taux: 0, mensualite: 100 } } }));
  proche('prêt à taux nul : capital restant dû', cPret.vue.patrimoine.dette, 1000);
  egal('prêt à taux nul : fin dans 10 mois', cPret.vue.patrimoine.fin_pret, 'avril 2027');

  // ---------- Lecture du relevé et classement ----------
  dans('Lecture du relevé et classement');
  const csv = [
    'Date opération;Date valeur;Libellé;Catégorie;Catégorie parent;Montant;Solde',
    '10/06/2026;10/06/2026;"VIR SEPA EMPLOYEUR FICTIF";"Virements reçus";"";"2 000,00";"2 500,00"',
    '11/06/2026;11/06/2026;"CARTE 10/06/26 SUPERMARCHE FICTIF CB*0000";"Alimentation";"";"-42,50";"2 457,50"',
    '12/06/2026;12/06/2026;"RETRAIT DAB 11/06/26 VILLE FICTIVE CB*0000";"";"";"-20,00";"2 437,50"',
    '13/06/2026;13/06/2026;"CARTE 12/06/26 CANTINE EDENRED CB*0000";"Restaurants";"";"-9,00";"2 428,50"',
    '14/06/2026;14/06/2026;"CARTE 13/06/26 CAFE LONDON 12,00 GBP CB*0000";"Restaurants";"";"-14,10";"2 414,40"',
    '15/06/2026;15/06/2026;"VIR INST CAMILLE EXEMPLE";"";"";"25,00";"2 439,40"',
    '16/06/2026;16/06/2026;"VIR VIREMENT VERS MON COMPTE";"Epargne financière";"";"-150,00";"2 289,40"',
    '17/06/2026;17/06/2026;"CARTE 16/06/26 AMAZON PAYMENTS CB*0000";"Electronique";"";"-30,00";"2 259,40"'
  ].join('\n');
  const imp = M.importer(donnees({ operations: [], export: '' }), csv, 'export-operations-17-06-2026_10-00-00.csv');
  const lu = (bout) => imp.bundle.operations.find((o) => o.libelle.includes(bout));
  egal('8 opérations lues', imp.stats.lues, 8);
  egal('opération non suivie : pas importée', lu('EDENRED'), undefined);
  egal('date au format AAAA-MM-JJ', lu('EMPLOYEUR').date, '2026-06-10');
  proche('montant avec espace des milliers', lu('EMPLOYEUR').montant, 2000);
  egal('date de l’export lue dans le nom du fichier', imp.bundle.export, '2026-06-17');
  proche('solde de fin de journée', imp.bundle.soldes['2026-06-17'], 2259.4);
  egal('règle des données : salaire', lu('EMPLOYEUR').poste, 'Salaire');
  egal('catégorie de la banque : courses', lu('SUPERMARCHE').poste, 'Courses');
  egal('retrait : achats divers', lu('RETRAIT').poste, 'Achats divers');
  egal('paiement en devise : voyages', lu('LONDON').poste, 'Voyages');
  egal('virement d’une personne : à classer à la main', lu('CAMILLE').bloc, 'Non classé');
  egal('virement classé « épargne » par la banque : virement d’épargne', lu('MON COMPTE').poste, EPARGNE);
  egal('marchand généraliste : à classer à la main', lu('AMAZON').bloc, 'Non classé');
  egal('deux opérations à classer comptées', imp.stats.aClasser, 2);
  const recl = M.reclasser(imp.bundle, lu('AMAZON').id, 'Enveloppes', 'Achats divers', true);
  egal('reclassement à la main', recl.operations.find((o) => o.libelle.includes('AMAZON')).poste, 'Achats divers');
  egal('marchand mémorisé', recl.regles_perso.length, 1);
  const imp2 = M.importer(recl, csv + '\n18/06/2026;18/06/2026;"CARTE 17/06/26 AMAZON PAYMENTS CB*0000";"Electronique";"";"-12,00";"2 247,40"', 'export-operations-18-06-2026_10-00-00.csv');
  egal('nouvel import : une seule opération nouvelle', imp2.stats.nouvelles, 1);
  egal('nouvel import : le classement fait à la main est gardé', imp2.bundle.operations.find((o) => o.montant === -30).src, 'manuel');
  egal('nouvel import : le marchand mémorisé est appliqué', imp2.bundle.operations.find((o) => o.montant === -12).poste, 'Achats divers');
  let erreur = '';
  try { M.lireExport('a;b;c\n1;2;3'); } catch (e) { erreur = e.message; }
  egal('fichier qui n’est pas un relevé : refusé', erreur !== '', true);

  // ---------- Corrections des données déjà enregistrées ----------
  dans('Corrections des données');
  const ren = M.renommerPostes(donnees(), [['Courses', 'Alimentation']]);
  egal('renommage : montant de référence', ren.references.find((r) => r.id === 'courses').poste, 'Alimentation');
  egal('renommage : opérations', ren.operations.filter((o) => o.poste === 'Courses').length, 0);
  egal('le renommage ne s’applique qu’une fois', M.renommerPostes(ren, [['Courses', 'Alimentation']]), ren);
  const aj = M.ajusterReferences(donnees(), [{ cle: 'test-loyer', id: 'loyer', montant: 650, note: 'test' }]);
  proche('ajustement d’un montant de référence', aj.references.find((r) => r.id === 'loyer').montant, 650);
  egal('l’ajustement ne s’applique qu’une fois', M.ajusterReferences(aj, [{ cle: 'test-loyer', id: 'loyer', montant: 650 }]), aj);

  // ---------- Remise à jour annuelle ----------
  dans('Remise à jour annuelle des montants');
  const prop = M.proposer(donnees());
  proche('charge fixe : dernier montant passé', prop.lignes.find((l) => l.id === 'loyer').propose, 600);
  egal('charge fixe inchangée : pas cochée', prop.lignes.find((l) => l.id === 'loyer').coche, false);
  proche('enveloppe : cumul des 12 derniers mois', prop.lignes.find((l) => l.id === 'cadeaux').propose, 350);

  // ---------- Bilan ----------
  const ko = resultats.filter((r) => !r.ok);
  if (typeof document === 'undefined') {
    resultats.forEach((r) => console.log((r.ok ? 'ok    ' : 'ÉCHEC ') + r.groupe + ' : ' + r.nom + (r.ok ? '' : ' (' + r.detail + ')')));
    console.log('\n' + (resultats.length - ko.length) + ' / ' + resultats.length + ' vérifications justes');
    if (ko.length && typeof process !== 'undefined') process.exitCode = 1;
    return;
  }
  window.RESULTATS = { total: resultats.length, echecs: ko };
  const bilan = document.getElementById('bilan'), liste = document.getElementById('liste');
  bilan.textContent = ko.length ? ko.length + ' échec(s) sur ' + resultats.length + ' vérifications' : resultats.length + ' vérifications justes';
  bilan.className = ko.length ? 'ko' : 'ok';
  let ul = null, dernierGroupe = '';
  resultats.forEach((r) => {
    if (r.groupe !== dernierGroupe) {
      const h = document.createElement('h2'); h.textContent = r.groupe; liste.appendChild(h);
      ul = document.createElement('ul'); liste.appendChild(ul); dernierGroupe = r.groupe;
    }
    const li = document.createElement('li'); li.className = r.ok ? 'ok' : 'ko';
    li.textContent = r.nom + (r.ok ? '' : ' : ' + r.detail); ul.appendChild(li);
  });
})();
