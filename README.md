# SALI DigiCom PopCard — 2.4.1

Application Next.js 16.4.2, React 19, API Node.js et PostgreSQL via `pg`.

## Installer cette mise à jour

Conservez vos variables et votre fichier `.env.local` de production : base de données, domaine, SMTP, banque, livraison et informations de société. Les archives ne contiennent aucun secret ni donnée client. Cette version n’exige aucune migration supplémentaire pour une base PopCard existante.

Le ZIP `dist` contient un serveur autonome pour Linux x64, Node.js 22 LTS ou 24. Dans son dossier : `node server.js`, ou `node --env-file=.env.local server.js`. Configurez `HOSTNAME=0.0.0.0` si demandé par votre hébergeur et le port attendu dans `PORT`. Ce dossier nécessite un hébergement Node.js.

Pour reconstruire depuis les sources :

```bash
npm ci
npm run build:dist
```

La construction repart d’un dossier `.next` propre et vérifie les manifestes livrés. Le résultat est dans `dist/`.

## Développement local

1. Copier `.env.example` vers `.env.local` et adapter les variables.
2. `npm ci`
3. Démarrer PostgreSQL, par exemple avec `docker compose up -d`.
4. Pour une nouvelle base uniquement : `npm run db:migrate`.
5. `npm run dev`

Le premier compte peut être promu administrateur avec `npm run admin -- votre-email@example.com`. Il n’y a pas de compte administrateur prédéfini.

## Corrections de la version 2.4

- Signature : colonnes rééquilibrées, logo plus présent, informations centrées dans leur zone et séparateur sur toute la largeur utile. Format de carte conservé à 85,6 × 54 mm.
- Essentiel : logo complet en monochrome blanc, réduit et centré sur les deux axes, sans pastille ajoutée au recto.
- Studio : phrase sous le QR code supprimée. Les noms Essentiel, Signature et Studio sont identiques sur l’accueil et dans l’éditeur.
- QR : les deux couleurs choisies sont utilisées, avec un cœur de module contrasté pour préserver le scan. Les accents trop pâles restent visibles autour du médaillon ; une principale trop claire est assombrie pour garder un code lisible.
- Montserrat remplace les familles non approuvées sur le site, le dashboard et les aperçus. Moontime est désormais fourni par le site à partir du fichier transmis, en WOFF et TTF, et est incorporé dans la planche autonome. Les courtes phrases graphiques utilisent Moontime ; les textes contenant des caractères absents du fichier, notamment les accents français, conservent Montserrat sur tout le bloc afin d’éviter un mélange dans un mot. Aucune autre famille n’est ajoutée.

Les anciennes valeurs de police sont encore acceptées dans les données pour permettre la lecture et la sauvegarde des cartes historiques verrouillées. L’affichage est limité à Montserrat et Moontime.

## Modifications de la version 2.3

- Nouvelle page en cinq sections, photographie, apparition de la carte et du titre, reflets des boutons, démonstration synchronisée au scroll et galerie interactive.
- Nouveau modèle Signature, versionné dans les données des cartes. Les cartes sans numéro de version gardent leur composition précédente. Le choix d’un nouveau modèle met à jour un brouillon non commandé ; les identités déjà commandées restent verrouillées.
- Dashboard enrichi et cadre de navigation persistant : changer d’onglet ne recharge plus toute l’interface.
- Menu à zone de défilement indépendante, compte et déconnexion accessibles sur les écrans courts. Menu mobile refermable avec Échap.
- Sauvegarde continue, écritures sérialisées, identifiant de création réutilisable après une réponse perdue, récupération locale des saisies et logos.
- Reprise des brouillons non synchronisés depuis le dashboard ou la liste. Les récupérations sont séparées par compte.
- Détection des conflits entre onglets avec choix explicite de la version à conserver.
- Analyse des couleurs sur un échantillon réduit du logo. Le détourage et la tolérance ne sont pas proposés.

Les aperçus de la page d’accueil sont des démonstrations. Ils ne représentent pas un profil client publié.

## Règles métier conservées

La première carte et son mini-site coûtent 400 DH. Les exemplaires suivants coûtent 250 DH, puis 225 DH à partir de 50 et 200 DH à partir de 100. Le serveur calcule les montants et les frais configurés.

Le virement et les droits sont validés par l’administrateur. Le paiement seul ne publie pas le mini-site : la publication intervient à l’expédition. Les commandes gardent un instantané des informations utilisées. Les coordonnées restent modifiables après publication ; modèle, couleurs, polices et logo commandés sont verrouillés.

L’aperçu envoyé par email reste privé, expire après sept jours et ne publie pas la carte. `MAIL_MODE=log` conserve les messages pour les tests ; `MAIL_MODE=smtp` utilise votre configuration existante.

## Vérifications

```bash
npm test
npm run test:designs
npm run test:integration
npm run test:smtp
npx playwright install chromium
npm run test:ui
npm run test:journeys
```

Les tests d’intégration, SMTP et navigateur démarrent leurs services locaux jetables. Exécutez-les un par un : ports 3000, 55432 et éventuellement 2526. Aucun de ces tests n’utilise votre base de production ni votre fournisseur SMTP.

Le navigateur peut aussi être fourni par `PLAYWRIGHT_CHROMIUM_EXECUTABLE` ou par `USE_SPARTICUZ=true`. Les captures d’inspection et les journaux bruts sont des fichiers de travail exclus des archives. Le rapport livré récapitule les contrôles réellement exécutés et leurs limites.
