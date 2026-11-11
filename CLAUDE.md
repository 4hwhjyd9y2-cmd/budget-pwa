# Budget : guide de reprise

Ce fichier permet à quelqu'un (ou à Claude) de reprendre l'appli sans l'historique des échanges qui l'ont construite. À lire en entier avant de modifier quoi que ce soit.

## En bref

- **Quoi** : une appli web installable sur iPhone (PWA) pour suivre un budget personnel à partir des exports du compte bancaire (CSV ou zip) et, en option, de l'export Trade Republic.
- **Où** : hébergée sur GitHub Pages depuis la branche `main` de ce dépôt. Chaque push sur `main` met l'appli à jour en une à deux minutes.
- **Sans serveur, sans dépendance** : HTML, CSS et JavaScript simples, aucun outil de build, aucune bibliothèque externe.
- **Les données ne sont jamais dans le dépôt.** Elles vivent dans le `localStorage` du téléphone (clé `budget-donnees`). Le dépôt est public : il ne doit contenir ni montant personnel, ni nom de personne, ni libellé bancaire, ni règle nominative.
- **Langue** : tout est en français (interface, code, commentaires, messages de commit).

## Fichiers

| Fichier | Rôle |
|---|---|
| `index.html` | Structure des 5 onglets, feuille de style (style iOS), en-têtes PWA et Content-Security-Policy. |
| `moteur.js` | Toute la logique : lecture des exports, classement, calculs, répartition réelle, projections, patrimoine, remise à jour annuelle. Aucun accès au DOM. Exposé en `window.Moteur` (et `module.exports` sous Node). |
| `dash-shim.js` | Socle de l'appli : stockage local, import, sauvegarde chiffrée, messages avec annulation, feuilles (dialogues), et le petit système `dash.draw(nom, fonction)` qui redessine chaque zone `data-draw="nom"`. Exposé en `window.App`. |
| `vues.js` | Dessin de tous les écrans, à partir de `App.calc().vue`. |
| `sw.js` | Service worker : réseau d'abord, cache en secours. **Incrémenter `VERSION` à chaque mise en ligne.** |
| `tests/` | Tests du moteur sur des données inventées : ouvrir `tests/index.html` (ou `node tests/moteur.test.js`). À relancer avant chaque mise en ligne. |
| `.gitignore` | Exclut `*.json` (sauf le manifeste), `*.csv`, `*.xlsx`, `.claude/`. Ne pas l'affaiblir. |

Attention à l'ordre dans `vues.js` : `dash.draw(nom, fonction)` exécute la fonction tout de suite. Une fonction définie plus bas dans le fichier doit donc être appelée dans une fonction fléchée (`clic: () => pageProj()`), pas passée directement.

## Les écrans

Cinq onglets, une question chacun. Un écran porte un seul grand chiffre ; le détail s'ouvre en touchant une ligne (page poussée).

1. **Ce mois-ci** (combien je peux encore dépenser) : reste à dépenser et par jour, bouton « Je veux acheter… », alertes éventuelles (montant à virer, opérations à classer, charges fixes à vérifier). Puis « Où tu en es » : Loisirs, Charges variables, Enveloppes (chacun ouvre le détail de ses postes).
2. **Épargne** (combien dois-je virer aujourd'hui) : « À virer aujourd'hui » = somme des restes à virer des 3 derniers mois terminés. Puis « Mois par mois » : le mois en cours (gris, prévu : la fin de mois prévue) et les 3 derniers mois terminés ; chaque mois ouvre son calcul, ses virements comptés, « laisser filer » un mois négatif et, pour le dernier mois terminé, ses plafonds et charges fixes. Puis la caisse des enveloppes et **Et si…** (3 projections, réponses gardées dans `localStorage['budget-proj']`).
3. **Patrimoine** (ce que j'ai) : valeur nette et sa courbe, puis les comptes (Livret A, PEA, Trade Republic, prêt étudiant). Plus de compte courant.
4. **Opérations** : recherche, mois en cours / mois terminé / tout, menu des catégories, reclassement d'une opération (option « toujours classer ce marchand ici » ; pour un virement d'épargne, « Compte pour » un autre mois de la liste).
5. **Réglages** : « Mon budget d'un mois normal » (revenus moins chaque famille de dépenses = épargne prévue), « Ma répartition 50 / 30 / 20 », « Mes données » (import, sauvegarde), « Classement et calculs ». Une ligne = un titre et une valeur.

Un point rouge sur l'onglet Épargne signale un virement à faire ; un point orange sur Réglages, une sauvegarde à faire.

## Règles d'affichage (à respecter)

- **Une seule lecture de ligne** : dépensé sur budget à gauche, ce qu'il reste à droite (« restants » ou « de trop »).
- **Un total affiché est la somme des lignes affichées.** Les écrans passent par `vueMois()` (`vues.js`) et `Moteur.entiers()` : euros entiers dont la somme tombe juste. Ne pas arrondir un total à part.
- **Rien n'est coupé** : `ajuster()` raccourcit un nom d'opération mot par mot (`Moteur.nomCourt`, le libellé complet reste dans la fiche) et rétrécit un autre titre trop long. Les sous-titres tiennent sur une ligne : les garder courts.
- **Zones à toucher d'au moins 44 px** (boutons, segments, champs).
- **Avant d'ajouter une fonction**, décider dans quel onglet elle va et ce qu'elle remplace ; ne pas l'empiler en bas d'un écran.
- Vérifier à 375 px de large : aucun texte coupé, aucune ligne sur deux lignes, aucun débordement.

## Modèle de données (`localStorage['budget-donnees']`)

```js
{
  version: 2,
  references: [{ id, type, poste, montant, note }],
  // type : 'Revenu' | 'Charge fixe' | 'Charge variable' | 'Loisir' | 'Enveloppe annuelle'
  // ids attendus par le moteur : rev_sal, rev_caf, rev_al (revenus) ; sport, prime (charges fixes à rythme particulier) ;
  // part_loisirs, env_mois (lignes calculées, affichées dans Règles)
  operations: [{ id, date, mois: 'AAAA-MM', jour, libelle, montant, bloc, poste, src, mois_epargne }],   // mois_epargne : facultatif, mois pour lequel compte un virement d'épargne
  // bloc : 'Revenus' | 'Charges fixes' | 'Charges variables' | 'Loisirs' | 'Enveloppes' | 'Exceptionnel' | 'Interne' | 'Hors budget' | 'Non classé'
  regles_auto: [{ motif, sens, montant, mois, max, bloc, poste }],   // règles personnelles (expressions régulières sur le libellé)
  regles_perso: [{ marchand, bloc, poste }],                         // créées par « toujours classer ce marchand ici »
  regles: [...],                                                     // texte des règles affichées dans Réglages
  suivi_depuis: 'AAAA-MM',            // premier mois du budget actuel (report et caisse partent de là)
  deficits_laisses: { 'AAAA-MM': true },   // mois dont le manque n'est pas reporté
  coussin_min, soldes: { 'AAAA-MM-JJ': solde },   // coussin_min n'est plus affiché
  migrations: ['epargne-calendaire'],              // corrections déjà appliquées une fois
  patrimoine: { livret: { valeur, date, taux }, pea: [{ date, valeur }], tr: { date, solde, fins }, pret: { capital, date, taux, mensualite, debut } },
  renommages: [], ajustements: [], export, maj
}
```

Les règles nominatives sont dans `regles_auto`, donc uniquement sur le téléphone. Ne jamais les recopier dans le code.

## Ordre de classement d'une opération (`classer`)

1. Règle « marchand » mémorisée (`regles_perso`).
2. Virement sortant que la banque classe en épargne : poste « Virement d'épargne ».
3. Règles des données (`regles_auto`), puis règles génériques du code (titres-restaurant exclus, livret, remboursements santé, retraits, paiement en devise).
4. Virement de ou vers une personne : toujours « Non classé », à classer à la main.
5. Historique appris (marchand classé à 80 % dans le même poste).
6. Catégorie de la banque (`CAT_BANQUE`), sauf pour les marchands généralistes.
7. Sinon : « Non classé ».

Un import ne reclasse jamais une opération déjà connue (clé date + libellé + montant). L'historique plus ancien que l'export est gardé.

## Règles de calcul

- **Mois** : mois civil. Le salaire versé en fin de mois compte pour le mois suivant. Le « mois terminé » est celui qui précède le mois de l'export.
- **Budget de référence** : revenus de référence − charges fixes − part mensuelle des enveloppes (total annuel ÷ 12) − charges variables = somme à partager. Les loisirs en prennent une part fixe (`part_loisirs`), le reste est l'épargne.
- **Plafonds du mois** : les charges variables ont un plafond fixe ; le budget loisirs suit les revenus réels du mois et se répartit entre les postes au prorata de leurs montants de référence.
- **Enveloppes** : plafond annuel, de janvier à décembre. La caisse des enveloppes reçoit la part mensuelle et paie les enveloppes ; si elle passe sous zéro, le trou sort de l'épargne du mois et la caisse repart de zéro.
- **Virement d'épargne** du mois terminé = revenus − charges fixes passées − loisirs et charges variables dépensés − part des enveloppes − trou de la caisse + report. Mois civil : un envoi vers l'épargne compte pour le mois de sa date, ou pour le mois auquel il est rattaché (`mois_epargne`, choisi dans Opérations). « Déjà viré » ne compte que les envois ; les retraits sont montrés à part. Un manque (ou un virement en trop) est reporté sur le mois suivant, sauf s'il est « laissé filer ».
- **Épargne par mois** (`vue.epargne_mois`, `vue.a_virer`) : le mois en cours (prévision = fin de mois prévue + report − trou de la caisse), puis les 3 derniers mois terminés, pas avant `suivi_depuis`.
- **Répartition réelle (repère 50 / 30 / 20)** : moyenne des mois terminés (12 au plus) et mois dernier. Obligations = charges fixes, charges variables, enveloppes de santé et d'entretien. Plaisir = loisirs, autres enveloppes, hors budget (voyages). Épargne = revenus − dépenses. Les revenus exceptionnels, les mouvements internes et les opérations non classées ne comptent pas.
- **Projections** : partent de cette moyenne réelle (revenus, dépenses, épargne, salaire moyen), ou du budget de référence tant qu'aucun mois n'est terminé. La durée couverte se calcule sur le Livret A.
- **Patrimoine** : Livret A = valeur saisie, virements vus sur le compte courant, intérêts estimés au 1er janvier ; dette du prêt recalculée chaque mois.

Après toute modification de calcul, vérifier la cohérence entre les pages : recalculer à partir des opérations brutes et comparer à ce que chaque écran affiche. Toute nouvelle règle reçoit son test.

## Corriger des données déjà sur le téléphone

Les données existent seulement sur l'appareil. Trois mécanismes, appliqués une seule fois chacun au chargement (`dash-shim.js`) : `renommerPostes` (liste `RENOMMAGES`), `ajusterReferences` (liste `AJUSTEMENTS`) et `migrerEpargneCalendaire` (passage au mois civil : chaque ancien envoi fait du 1er au 10 est rattaché au mois d'avant, pour que l'historique ne change pas ; noté dans `migrations`).

## Sauvegarde, import, sécurité

- Sauvegarde : fichier JSON, chiffré si un mot de passe est donné (AES-GCM, clé dérivée par PBKDF2). Toute modification peut être annulée depuis le message qui la confirme.
- Import : sauvegarde (`.json`), export bancaire (`.zip` ou `.csv`), export Trade Republic (`.csv`).
- Aucun texte importé n'est inséré comme HTML : uniquement `textContent`. CSP stricte (`script-src 'self'`), aucun script ni police hébergés ailleurs.

## Tester en local

Servir le dossier avec un serveur statique, par exemple `python -m http.server 8768`, puis ouvrir `http://localhost:8768/` (appli) ou `http://localhost:8768/tests/index.html` (tests). Pour voir les écrans sans données réelles, charger le jeu inventé des tests dans `localStorage['budget-donnees']`. Vérifier sur une largeur d'iPhone (375 px), en clair et en sombre.

## Mettre en ligne

1. Lancer les tests : tout doit être juste.
2. Vérifier que rien de personnel n'est suivi par git (`git status`, puis chercher montants et noms avec `git grep`).
3. Incrémenter `VERSION` dans `sw.js`.
4. Commit (message en français) puis push sur `main`.
5. Sur l'iPhone : fermer complètement l'appli puis la rouvrir.

## Façon de travailler avec le propriétaire

- Montrer une maquette ou des captures (largeur iPhone) et attendre son accord avant de construire ou de mettre en ligne.
- Style natif iOS : listes groupées, carrés d'icône colorés, feuilles qui montent du bas, pages poussées, barre d'onglets en verre. Pas de tableaux type tableur.
- Chaque chiffre affiché doit dire ce qu'il est (réel ou budget) et tomber juste avec les autres pages.
- Pas de conseil d'investissement personnalisé : donner les faits et les ordres de grandeur, il décide.
