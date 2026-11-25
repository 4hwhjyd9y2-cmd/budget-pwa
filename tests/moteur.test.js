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
  // Répartition par défaut du reste (revenus moins charges fixes) : 30 % variables, 25 % enveloppes, 35 % loisirs, 10 % épargne.
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
    // Avril : virement d'épargne de mars, gros cadeau qui vide la caisse des enveloppes
    loyer('2026-04-02'), epargne('2026-04-03', 500), caf('2026-04-05'), tel('2026-04-10'), courses('2026-04-15', 320), restos('2026-04-20', 350),
    op('2026-04-22', 'CARTE FLEURISTE FICTIF CB*0000', -850, 'Enveloppes', 'Cadeaux'), sal('2026-04-28', 2200),
    // Mai : virement d'avril (trop élevé)
    loyer('2026-05-02'), epargne('2026-05-04', 300), caf('2026-05-05'), tel('2026-05-10'), courses('2026-05-15', 310), restos('2026-05-20', 250),
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
  // Données comme sur un téléphone déjà passé au mois civil : la migration rattache les envois du 1er au 10 au mois d'avant
  const donnees = (plus) => M.migrerEpargneCalendaire(Object.assign({
    version: 2, references, operations, regles: [], regles_perso: [],
    regles_auto: [{ motif: 'EMPLOYEUR FICTIF', sens: 'credit', bloc: 'Revenus', poste: 'Salaire' }],
    suivi_depuis: '2026-03', soldes: {}, export: '2026-06-15'
  }, plus || {}));
  // Soldes de fin de journée d'un compte qui avait `depart` € avant la première opération
  const soldesDe = (liste, depart) => { const s = {}; let v = depart; liste.slice().sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0)).forEach((o) => { v = Math.round((v + o.montant) * 100) / 100; s[o.date] = v; }); return s; };
  // Le même compte, avec ses soldes : 300 € déjà là avant le salaire de février
  const avecSolde = (liste, plus) => donnees(Object.assign({ operations: liste, soldes: soldesDe(liste, 300) }, plus || {}));
  const c = M.calculer(donnees());
  const cPatP = () => M.calculer(donnees({ patrimoine: { livret: { valeur: 3000, date: '2026-05-01' } } }));
  const v = c.vue;
  const syn = (id) => c.datasets.synthese.find((s) => s.id === id).valeur;
  const lig = (l, id) => l.find((x) => x.id === id);
  const em = (vv, k) => vv.epargne_mois.find((x) => x.cle === k);

  // ---------- Budget de référence ----------
  dans('Budget de référence');
  proche('revenus de référence', v.normal.revenus, 2020);
  proche('charges fixes', v.normal.fixes, 620);
  proche('reste à partager : revenus moins charges fixes', v.normal.reste, 1400);
  proche('charges variables : 30 % du reste', v.normal.variables, 420);
  proche('enveloppes : 25 % du reste', v.normal.env, 350);
  proche('loisirs : 35 % du reste', v.normal.loisirs, 490);
  proche('épargne : les 10 % restants', v.normal.epargne, 140);
  proche('revenus = fixes + variables + enveloppes + loisirs + épargne', v.normal.revenus, v.normal.fixes + v.normal.variables + v.normal.env + v.normal.loisirs + v.normal.epargne);
  proche('part des loisirs affichée dans Règles', lig(c.datasets.references, 'part_loisirs').montant, 35);

  // ---------- Répartition du reste ----------
  dans('Répartition du reste');
  egal('par défaut : 30 / 25 / 35, l’épargne prend le reste', JSON.stringify(M.partsDuReste({})), '{"variables":30,"enveloppes":25,"loisirs":35,"epargne":10}');
  egal('réglée à la main', M.partsDuReste({ repartition: { variables: 20, enveloppes: 20, loisirs: 50 } }).epargne, 10);
  egal('plus de 100 % : pas d’épargne négative', M.partsDuReste({ repartition: { variables: 50, enveloppes: 30, loisirs: 40 } }).epargne, 0);
  const cRep = M.calculer(donnees({ repartition: { variables: 20, enveloppes: 20, loisirs: 50 } }));
  proche('réglée à la main : budget loisirs de mai = 50 % de 1 600', cRep.datasets.synthese.find((s) => s.id === 'loisirs_mois').valeur, 800);
  proche('réglée à la main : courses de mai = 20 % de 1 600', lig(cRep.datasets.mois_courant, 'courses').seuil, 320);

  // ---------- Mois terminé ----------
  dans('Mois terminé (mai)');
  egal('mois affiché', syn('mois_cle'), '2026-05');
  proche('revenus : salaire versé fin avril + CAF de mai', syn('revenus'), 2220);
  proche('reste à partager : 2 220 − 620', syn('a_partager'), 1600);
  proche('budget loisirs : 35 % du reste', syn('loisirs_mois'), 560);
  proche('budget des charges variables : 30 % du reste, il suit le salaire', syn('variables_mois'), 480);
  proche('restos : plafond au prorata (300 / 400)', lig(c.datasets.mois_courant, 'restos').seuil, 420);
  proche('vêtements : plafond au prorata (100 / 400)', lig(c.datasets.mois_courant, 'vetements').seuil, 140);
  proche('courses : seul poste des variables, il prend toute la part', lig(c.datasets.mois_courant, 'courses').seuil, 480);
  proche('courses : reste', lig(c.datasets.mois_courant, 'courses').reste, 170);
  proche('budget du mois : plafond', lig(c.datasets.mois_courant, 'global').seuil, 1040);
  proche('budget du mois : dépensé', lig(c.datasets.mois_courant, 'global').depense, 620);
  egal('loyer : conforme', lig(c.datasets.mois_courant, 'f_loyer').etat, 'Conforme');
  proche('enveloppe cadeaux : cumul depuis janvier', lig(c.datasets.mois_courant, 'cadeaux').depense, 850);
  egal('aucune charge fixe à vérifier', syn('fix_ko'), 0);

  // ---------- Virement d'épargne ----------
  dans('Virement d’épargne');
  proche('revenus du mois', syn('tr_revenus'), 2220);
  proche('charges fixes passées', syn('tr_fixes'), 620);
  proche('loisirs et charges variables dépensés', syn('tr_depenses'), 620);
  proche('part des enveloppes : 25 % du reste de mai', syn('tr_env'), 400);
  proche('report : avril a reçu 70 € de trop', syn('tr_report'), -70);
  proche('à virer = 2 220 − 620 − 620 − 400 − 70', syn('tr_virement'), 510);
  proche('déjà viré : l’envoi du 5 juin compte pour mai', syn('tr_deja'), 400);
  proche('reste à virer', syn('tr_reste'), 110);
  egal('état', syn('tr_etat'), 'En partie fait.');
  proche('Ce mois-ci affiche le même montant à virer', v.epargne.a_virer, syn('tr_virement'));
  proche('Ce mois-ci affiche le même reste à virer', v.epargne.reste, syn('tr_reste'));
  const cAvril = M.calculer(donnees({ export: '2026-05-15', operations: operations.filter((o) => o.date <= '2026-05-15') }));
  proche('avril : la caisse des enveloppes passe sous zéro, le trou sort de l’épargne', cAvril.vue.epargne.trou_env, 150);
  proche('avril : à virer = 2 020 − 620 − 670 − 350 − 150', cAvril.vue.epargne.a_virer, 230);

  // ---------- Tout ce qui passe sur le compte ----------
  dans('L’épargne du mois compte tout ce qui passe sur le compte');
  const plusMai = (o) => M.calculer(donnees({ operations: operations.concat([o]) })).vue;
  proche('rentrée exceptionnelle non dépensée : elle rejoint l’épargne du mois', em(plusMai(op('2026-05-12', 'VIR SEPA CADEAU FICTIF', 500, 'Exceptionnel', 'Cadeaux reçus')), '2026-05').a_epargner, 1010);
  proche('rentrée exceptionnelle : les plafonds ne bougent pas', M.calculer(donnees({ operations: operations.concat([op('2026-05-12', 'VIR SEPA CADEAU FICTIF', 500, 'Exceptionnel', 'Cadeaux reçus')]) })).datasets.synthese.find((s) => s.id === 'loisirs_mois').valeur, 560);
  proche('voyage hors budget : il sort de l’épargne du mois', em(plusMai(op('2026-05-13', 'CARTE HOTEL FICTIF CB*0000', -300, 'Hors budget', 'Voyages')), '2026-05').a_epargner, 210);
  proche('opération à classer : elle compte aussi', em(plusMai(op('2026-05-14', 'VIR INST INCONNU FICTIF', -50, 'Non classé', 'Non classé')), '2026-05').a_epargner, 460);
  proche('ligne du calcul : rentrées exceptionnelles', em(plusMai(op('2026-05-12', 'VIR SEPA CADEAU FICTIF', 500, 'Exceptionnel', 'Cadeaux reçus')), '2026-05').calcul.exc, 500);

  // ---------- Caisse des enveloppes ----------
  dans('Caisse des enveloppes');
  proche('versé : 25 % du reste chaque mois (350 + 350 + 400 + 350), juin compris', v.caisse.verse, 1450);
  proche('dépensé depuis le début du suivi', v.caisse.depense, 890);
  proche('valeur : repart de zéro après le trou d’avril, plus mai et juin', v.caisse.valeur, 710);
  // Avril en cours (relevé du 25) : le gros cadeau dépasse la caisse. La part d'avril compte une seule fois.
  const cAvrilEnCours = M.calculer(donnees({ export: '2026-04-25', operations: operations.filter((o) => o.date <= '2026-04-25') })).vue;
  proche('avril en cours : caisse = 350 de mars + 350 d’avril − 850', cAvrilEnCours.caisse.valeur, -150);
  proche('avril en cours : le trou vient en moins de ce qui reste à dépenser', cAvrilEnCours.reste_budget, 90);
  proche('avril en cours : caisse = fin de mars + ligne Enveloppes de Ce mois-ci', cAvrilEnCours.caisse.valeur, 350 + cAvrilEnCours.prevu.env - cAvrilEnCours.depense.env);
  proche('avril en cours : l’épargne prévue reste entière tant que le budget tient', em(cAvrilEnCours, '2026-04').a_epargner, 140);

  // ---------- Mois en cours ----------
  dans('Mois en cours (juin)');
  egal('mois en cours', v.mc, '2026-06');
  egal('jour de l’export', v.auj, 15);
  proche('revenus : salaire versé fin mai + CAF attendue', v.revenus, 2020);
  egal('CAF pas encore arrivée : attendue', syn('mc_caf_etat'), 'attendue');
  proche('budget loisirs', v.prevu.loisirs, 490);
  proche('budget des charges variables', v.prevu.variables, 420);
  proche('part des enveloppes', v.prevu.env, 350);
  proche('loisirs dépensés', v.depense.loisirs, 90);
  proche('charges variables dépensées', v.depense.variables, 100);
  proche('restos : reste', lig(v.postes, 'restos').reste, 277.5);
  proche('reste du budget (loisirs et variables)', v.reste_budget, 720);
  proche('téléphone : encore attendu', lig(v.fixes_mc, 'tel').reste, 20);
  proche('loyer : déjà passé', lig(v.fixes_mc, 'loyer').reste, 0);
  egal('sans solde dans les relevés : pas de chiffre tiré du compte', v.dispo, null);
  proche('épargne prévue de juin : 10 % du reste', em(v, '2026-06').a_epargner, 140);

  // ---------- Ce que tu peux dépenser, à partir du solde ----------
  dans('Ce que tu peux dépenser (solde du compte)');
  const cS = M.calculer(avecSolde(operations)).vue, dS = cS.dispo;
  proche('solde du compte au relevé', dS.solde, 2050);
  proche('départ du suivi : l’argent déjà là entre dans l’épargne de mars', em(cS, '2026-03').calcul.report, 300);
  egal('départ du suivi : signalé', em(cS, '2026-03').calcul.depart, true);
  proche('mars : 570 + 300 − 500 virés = 370 à virer', em(cS, '2026-03').reste, 370);
  proche('épargne des mois passés à virer', cS.a_virer, 480);
  proche('le chiffre = solde + CAF attendue − téléphone − épargne à virer − épargne de juin − caisse', dS.valeur, 2050 + 20 - 20 - 480 - 140 - 710);
  proche('quand rien d’autre ne passe sur le compte, il vaut le reste du budget', dS.valeur, cS.reste_budget);
  proche('les lignes du calcul font le chiffre', dS.lignes.reduce((s, l) => s + l.montant, 0), dS.valeur);
  egal('jours restants jusqu’au 30', dS.jours, 15);
  const plusJuin = (liste, plus) => M.calculer(avecSolde(operations.concat(liste), plus)).vue;
  proche('une dépense de loisirs baisse le chiffre d’autant', plusJuin([restos('2026-06-14', 50)]).dispo.valeur, 670);
  const exc = op('2026-06-10', 'VIR SEPA CADEAU FICTIF', 100, 'Exceptionnel', 'Cadeaux reçus');
  proche('rentrée exceptionnelle : elle reste à dépenser', plusJuin([exc]).dispo.valeur, 820);
  const excE = Object.assign({}, exc, { vers_epargne: true });
  proche('rentrée ajoutée à l’épargne : le chiffre ne bouge pas', plusJuin([excE]).dispo.valeur, 720);
  proche('rentrée ajoutée à l’épargne : l’épargne prévue de juin monte d’autant', em(plusJuin([excE]), '2026-06').a_epargner, 240);
  egal('rentrée du mois listée avec son choix', plusJuin([excE]).dispo.exc[0].vers_epargne, true);
  proche('voyage : il baisse le chiffre', plusJuin([op('2026-06-11', 'CARTE HOTEL FICTIF CB*0000', -300, 'Hors budget', 'Voyages')]).dispo.valeur, 420);
  const gros = plusJuin([op('2026-06-11', 'CARTE HOTEL FICTIF CB*0000', -1000, 'Hors budget', 'Voyages')]);
  proche('dépassement : le chiffre passe sous zéro', gros.dispo.valeur, -280);
  proche('dépassement : il vient en moins de l’épargne prévue', em(gros, '2026-06').a_epargner, -140);
  proche('« pas ce mois-ci » : le téléphone n’est plus attendu', plusJuin([], { fixes_sautes: { '2026-06': ['tel'] } }).dispo.valeur, 740);
  const coussin = plusJuin([], { coussin: 200 });
  proche('coussin : il reste sur le compte, le chiffre ne change pas', coussin.dispo.valeur, 720);
  proche('coussin : l’argent de départ au-dessus du coussin va à l’épargne', em(coussin, '2026-03').calcul.report, 100);
  // Virement d'épargne en avance (300 € le 14 juin pour 140 € prévus) : les 160 € de plus ne sont plus sur le compte
  const avance = plusJuin([epargne('2026-06-14', 300)]);
  proche('virement en avance : le chiffre baisse de ce qui dépasse l’épargne prévue', avance.dispo.valeur, 720 - 160);
  proche('virement en avance : l’épargne à garder ne passe pas en négatif', lig(avance.dispo.lignes, 'epargne').montant, 0);
  proche('virement en avance : les lignes du calcul font le chiffre', avance.dispo.lignes.reduce((s, l) => s + l.montant, 0), avance.dispo.valeur);
  proche('virement en avance : ce que tu dépenses en moins rattrape l’épargne', em(avance, '2026-06').calcul.retenu, 160);
  proche('virement en avance : juin prévoit d’épargner ce qui est viré', em(avance, '2026-06').a_epargner, 300);
  proche('virement en avance : plus rien à virer pour juin', em(avance, '2026-06').reste, 0);
  // Report au choix : mai fini avec 90 € virés en trop (600 € virés pour 510 €)
  const trop = [epargne('2026-05-25', 200)];
  const rep1 = plusJuin(trop), rep0 = plusJuin(trop, { reporter: { '2026-05': false } });
  egal('report : activé par défaut', em(rep1, '2026-05').reporte, true);
  proche('report : les 90 € en trop baissent l’objectif de juin', em(rep1, '2026-06').a_epargner, 50);
  proche('report : le chiffre ne bouge pas', rep1.dispo.valeur, 720);
  egal('sans report : mai le dit', em(rep0, '2026-05').reporte, false);
  proche('sans report : juin garde son objectif', em(rep0, '2026-06').a_epargner, 140);
  proche('sans report : les 90 € sont pris sur ce que tu peux dépenser', rep0.dispo.valeur, 630);
  proche('sans report : les lignes du calcul font le chiffre', rep0.dispo.lignes.reduce((s, l) => s + l.montant, 0), rep0.dispo.valeur);
  proche('sans report : ce qui n’est pas reporté est noté', em(rep0, '2026-06').calcul.non_reporte, -90);
  // Premier mois suivi (mai) qui finit dans le rouge : pas reporté, sauf si tu le demandes
  const prem = (plus) => M.calculer(avecSolde(operations.concat(trop), Object.assign({ suivi_depuis: '2026-05', coussin: 700 }, plus || {}))).vue;
  noter('premier mois suivi : il finit bien dans le rouge', em(prem(), '2026-05').ecart < 0, 'écart ' + em(prem(), '2026-05').ecart);
  egal('premier mois suivi : pas reporté par défaut', em(prem(), '2026-05').reporte, false);
  proche('premier mois suivi : juin garde son objectif', em(prem(), '2026-06').a_epargner, 140);
  proche('premier mois suivi : reporté si tu le demandes', em(prem({ reporter: { '2026-05': true } }), '2026-06').a_epargner, 140 + em(prem(), '2026-05').ecart);
  // « Je ne le vire pas » : les 110 € qui restaient à virer pour mai redeviennent dépensables en juin
  const nv = plusJuin([], { non_vires: { '2026-05': '2026-06' } });
  proche('je ne le vire pas : mai n’a plus rien à virer', em(nv, '2026-05').reste, 0);
  proche('je ne le vire pas : le montant est noté', em(nv, '2026-05').non_vire, 110);
  proche('je ne le vire pas : il ne reste que mars à virer', nv.a_virer, 370);
  proche('je ne le vire pas : les 110 € redeviennent dépensables', nv.dispo.valeur, 830);
  proche('je ne le vire pas : l’objectif de juin ne change pas', em(nv, '2026-06').a_epargner, 140);
  proche('je ne le vire pas : juin les reçoit dans son calcul', em(nv, '2026-06').calcul.libere, 110);
  // Salaire de juillet arrivé le 28 juin : le chiffre vaut jusqu'à fin juillet
  const cB = M.calculer(avecSolde(operations.concat([sal('2026-06-28', 2000)]), { export: '2026-06-29' })).vue;
  egal('salaire arrivé : le chiffre passe au mois suivant', cB.dispo.bascule, true);
  egal('salaire arrivé : jusqu’à fin juillet', cB.dispo.fin, '2026-07');
  egal('salaire arrivé : jours jusqu’au 31 juillet', cB.dispo.jours, 32);
  proche('salaire arrivé : il reste les plafonds de juillet (variables et loisirs)', cB.dispo.valeur, 420 + 490);
  proche('salaire arrivé : juin garde pour l’épargne ce qu’il a laissé', em(cB, '2026-06').a_epargner, 2020 - 600 - 20 - 190 - 350);
  proche('salaire arrivé : les lignes du calcul font le chiffre', cB.dispo.lignes.reduce((s, l) => s + l.montant, 0), cB.dispo.valeur);
  // Juin a trop dépensé : son manque est pris sur l'épargne de juillet, et au-delà sur ce que tu peux dépenser
  const basc = (m) => M.calculer(avecSolde(operations.concat([sal('2026-06-28', 2000), op('2026-06-20', 'CARTE HOTEL FICTIF CB*0000', -m, 'Hors budget', 'Voyages')]), { export: '2026-06-29' })).vue;
  proche('salaire arrivé, juin à −40 € : pris sur l’épargne de juillet, le chiffre ne bouge pas', basc(900).dispo.valeur, 910);
  proche('salaire arrivé, juin à −40 € : épargne de juillet à garder 100 €', lig(basc(900).dispo.lignes, 'epargne_suivant').montant, -100);
  proche('salaire arrivé, juin à −240 € : au-delà des 140 € de juillet, pris sur le chiffre', basc(1100).dispo.valeur, 810);
  proche('salaire arrivé, juin à −240 € : les lignes du calcul font le chiffre', basc(1100).dispo.lignes.reduce((s, l) => s + l.montant, 0), basc(1100).dispo.valeur);

  // ---------- Cohérence entre les pages ----------
  dans('Cohérence entre les pages');
  const brut = (mois, poste) => -somme(operations.filter((o) => o.mois === mois && o.poste === poste).map((o) => o.montant));
  proche('Opérations : total d’un poste = dépensé affiché (mois en cours)', brut('2026-06', 'Courses'), lig(v.postes, 'courses').depense);
  proche('Opérations : total d’un poste = dépensé affiché (mois terminé)', brut('2026-05', 'Restos, bars et sorties'), lig(c.datasets.mois_courant, 'restos').depense);
  proche('dépensé du mois = somme des postes', v.depense.loisirs + v.depense.variables, somme(v.postes.map((l) => l.depense)));
  proche('plafonds des loisirs = budget loisirs', somme(v.postes.filter((l) => l.bloc === 'Loisirs').map((l) => l.seuil)), v.prevu.loisirs);
  const attendu = 2220 - (brut('2026-05', 'Loyer') + brut('2026-05', 'Téléphone')) - (brut('2026-05', 'Courses') + brut('2026-05', 'Restos, bars et sorties') + brut('2026-05', 'Vêtements')) - 0.25 * (2220 - 620) - 70;
  proche('à virer : recalcul depuis les opérations brutes', v.epargne.a_virer, attendu);

  // ---------- Repère 50 / 30 / 20 ----------
  dans('Repère 50 / 30 / 20 (réel)');
  egal('3 mois terminés dans la moyenne', v.reel.mois.length, 3);
  proche('revenus réels moyens', v.reel.revenus, 2086.67);
  proche('obligations : fixes, variables, santé', v.reel.obligations, 936.67);
  proche('plaisir : loisirs et cadeaux', v.reel.plaisir, 570);
  proche('épargne = revenus − dépenses', v.reel.epargne, 580);
  proche('les trois parts font 100 %', v.reel.pct.obligations + v.reel.pct.plaisir + v.reel.pct.epargne, 1);
  proche('mois dernier : revenus', v.dernier.revenus, 2220);
  proche('mois dernier : obligations', v.dernier.obligations, 970);
  proche('mois dernier : plaisir', v.dernier.plaisir, 310);
  proche('mois dernier : épargne', v.dernier.epargne, 940);
  const cExc = M.calculer(donnees({ operations: operations.concat([op('2026-05-12', 'VIR SEPA CADEAU FICTIF', 500, 'Exceptionnel', 'Cadeaux reçus')]) }));
  proche('un revenu exceptionnel ne change pas la moyenne', cExc.vue.reel.revenus, 2086.67);
  const cVoy = M.calculer(donnees({ operations: operations.concat([op('2026-05-13', 'CARTE HOTEL FICTIF CB*0000', -300, 'Hors budget', 'Voyages')]) }));
  proche('un voyage hors budget compte en plaisir', cVoy.vue.dernier.plaisir, 610);
  const cNeuf = M.calculer(donnees({ operations: operations.filter((o) => o.date >= '2026-05-28') }));
  egal('sans mois terminé : pas de répartition', cNeuf.vue.reel.mois.length, 0);
  egal('sans mois terminé : base = budget de référence', cNeuf.vue.base.reel, false);
  proche('sans mois terminé : épargne de référence', cNeuf.vue.base.epargne, 140);

  // ---------- Projections ----------
  dans('Projections');
  proche('base : épargne réelle moyenne', v.base.epargne, v.reel.epargne);
  proche('base : salaire réel moyen', v.base.salaire, 2066.67);
  const projet = M.projeter('projet', { montant: 1200, mois: '2027-06' }, c);
  egal('projet : 12 mois avant l’échéance', projet.res.n, 12);
  proche('projet : à mettre de côté par mois', projet.res.par_mois, 100);
  proche('projet : épargne restante', projet.res.epargne_reste, 480);
  egal('projet : réponse donnée, pas d’hypothèse', projet.hyp.montant, false);
  egal('projet sans réponse : hypothèse signalée', M.projeter('projet', {}, c).hyp.montant, true);
  const baisse = M.projeter('baisse', {}, c);
  proche('baisse sans réponse : 80 % du salaire réel moyen', baisse.res.salaire, 1653.34);
  proche('baisse : épargne = nouveaux revenus − dépenses réelles', baisse.res.epargne, baisse.res.revenus - v.reel.depenses);
  const chute = M.projeter('baisse', { salaire: 1000 }, cPatP());
  proche('forte baisse : à réduire chaque mois', chute.res.a_reduire, 486.67);
  proche('forte baisse : durée couverte par le livret', chute.res.reserve, 7.6);
  const conges = M.projeter('conges', { jours: 10, mois: '2026-10', par_jour: 100 }, c);
  proche('congés : total à mettre de côté', conges.res.total, 1000);
  proche('congés : par mois sur 4 mois', conges.res.par_mois, 250);

  // ---------- Patrimoine ----------
  dans('Patrimoine');
  const cPat = M.calculer(donnees({ patrimoine: { livret: { valeur: 3000, date: '2026-05-01' } } }));
  proche('livret : valeur saisie + virements vus après la date', cPat.vue.patrimoine.livret, 3700);
  proche('matelas en mois de dépenses d’un mois normal', cPat.vue.patrimoine.matelas, 2);
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
  proche('enveloppe : cumul des 12 derniers mois', prop.lignes.find((l) => l.id === 'cadeaux').propose, 850);

  dans('Épargne par mois (mois civil)');
  egal('liste : juin prévu, puis mai, avril, mars', v.epargne_mois.map((x) => x.cle + ' ' + x.etat).join(', '), '2026-06 prevu, 2026-05 termine, 2026-04 termine, 2026-03 termine');
  proche('mai : à épargner (avec le report)', em(v, '2026-05').a_epargner, 510);
  proche('mai : déjà viré (envoi du 5 juin rattaché par la migration)', em(v, '2026-05').vire, 400);
  proche('mai : reste à virer', em(v, '2026-05').reste, 110);
  proche('mai : la liste dit la même chose que le virement du mois terminé', em(v, '2026-05').reste, v.epargne.reste);
  proche('à virer aujourd’hui = somme des restes des mois terminés', v.a_virer, v.epargne_mois.filter((x) => x.etat === 'termine').reduce((s, x) => s + x.reste, 0));
  egal('le mois en cours ne compte pas dans « à virer aujourd’hui »', v.epargne_mois[0].etat, 'prevu');
  proche('avril : 70 € virés en plus, ils réduisent mai', em(v, '2026-04').en_trop, 70);
  const migreE = M.migrerEpargneCalendaire(Object.assign({}, donnees(), { migrations: [] , operations }));
  egal('migration : l’envoi du 5 juin est rattaché à mai', migreE.operations.find((o) => o.date === '2026-06-05').mois_epargne, '2026-05');
  egal('migration : une seule fois', M.migrerEpargneCalendaire(migreE), migreE);
  const sansMig = Object.assign({}, donnees(), { operations, migrations: ['epargne-calendaire'] });
  proche('sans rattachement, un envoi compte pour le mois civil de sa date', em(M.calculer(sansMig).vue, '2026-06').vire, 400);
  proche('sans rattachement, mai ne compte que son propre envoi (4 mai)', em(M.calculer(sansMig).vue, '2026-05').vire, 300);
  const rattache = M.reclasser(sansMig, operations.find((o) => o.date === '2026-06-05').id, 'Interne', EPARGNE, false, '2026-05');
  proche('rattaché à mai à la main : il compte pour mai', em(M.calculer(rattache).vue, '2026-05').vire, 700);
  proche('rattaché à mai : il ne compte plus pour juin', em(M.calculer(rattache).vue, '2026-06').vire, 0);
  egal('reclasser hors épargne : le rattachement disparaît', M.reclasser(rattache, operations.find((o) => o.date === '2026-06-05').id, 'Loisirs', 'Vêtements', false).operations.find((o) => o.date === '2026-06-05').mois_epargne, undefined);
  const avecRetrait = donnees({ operations: operations.concat([op('2026-05-25', 'VIR DEPUIS LIVRET A', 1000, 'Interne', EPARGNE)]) });
  proche('un retrait ne réduit pas « déjà viré »', em(M.calculer(avecRetrait).vue, '2026-05').vire, 400);
  proche('un retrait est montré à part', em(M.calculer(avecRetrait).vue, '2026-05').retraits, 1000);
  proche('un retrait non dépensé revient dans l’épargne du mois', em(M.calculer(avecRetrait).vue, '2026-05').reste, 1110);
  proche('rattachement : le solde du Livret A ne change pas', M.calculer(Object.assign({}, rattache, { patrimoine: { livret: { valeur: 3000, date: '2026-05-01' } } })).vue.patrimoine.livret, M.calculer(Object.assign({}, sansMig, { patrimoine: { livret: { valeur: 3000, date: '2026-05-01' } } })).vue.patrimoine.livret);

  dans('Affichage : euros entiers et noms courts');
  egal('entiers : le total est l’arrondi de la somme', M.entiers([293.6, 394.6]).join('+'), '294+394');
  egal('entiers : la somme des lignes vaut le total', somme(M.entiers([10.4, 20.4, 30.4, 0.4])), 62);
  egal('entiers : des montants ronds ne bougent pas', M.entiers([600, 20, 300]).join(' '), '600 20 300');
  egal('entiers : montants négatifs (un calcul avec des moins)', somme(M.entiers([2020.4, -620.3, -300.3, -100.4])), 999);
  egal('entiers : liste vide', M.entiers([]).length, 0);
  egal('entiers : dépensé des postes du mois = arrondi du total', somme(M.entiers(v.postes.map((r) => Number(r.depense)))), Math.round(v.depense.loisirs + v.depense.variables));
  egal('entiers : plafonds des postes du mois = arrondi du total', somme(M.entiers(v.postes.map((r) => Number(r.seuil)))), Math.round(v.prevu.loisirs + v.prevu.variables));
  egal('nom lisible : carte avec date et numéro', M.nomLisible('CARTE 03/06/26 BOULANGERIE FICTIVE CB*1234'), 'Boulangerie Fictive');
  egal('nom lisible : carte sans date', M.nomLisible('CARTE BISTROT FICTIF'), 'Bistrot Fictif');
  egal('nom lisible : prélèvement', M.nomLisible('PRLV SEPA OPERATEUR FICTIF'), 'Operateur Fictif');
  egal('nom court : des mots entiers, 20 caractères au plus', M.nomCourt('PRLV SEPA ASSURANCE FICTIVE MANAGEMENT EUROPE'), 'Assurance Fictive');
  egal('nom court : un seul mot trop long est tronqué', M.nomCourt('CARTE 03/06/26 ABCDEFGHIJKLMNOPQRSTUVWXYZ CB*1234').length, 20);

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
