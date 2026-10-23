# SALI DigiCom PopCard — 2.5.0

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

## Modifications de la version 2.5

- Signature : suppression du libellé « Carte de visite » au recto, centrage de la composition et adaptation des noms longs.
- Validation partagée entre l’éditeur, le paiement et l’API de commande : nom ou société, contact visible et valide, formats des coordonnées et du logo Essentiel. Navigation directe entre étapes également contrôlée. Les brouillons conservent les saisies incomplètes.
- Retour du paiement vers la carte, informations de livraison conservées dans l’onglet, quantité entière et ICE entreprise contrôlés. Une modification concurrente empêche de commander un aperçu périmé. Une commande en attente renvoie vers son suivi.
- Défilement de la page, panneaux d’édition et mini-site affichés sur leur hauteur complète. Navigation des étapes sur deux rangées sur mobile.
- 80 familles de polices clients, recherche, filtre de style, aperçus et import TTF/OTF/WOFF/WOFF2 (2 Mo maximum, 20 fichiers personnels par compte). Tous les fichiers sont servis localement. Seuls les aperçus visibles et les polices sélectionnées sont chargés.
- Lecture des noms de polices des SVG/PDF lorsqu’ils existent. Les images et logos vectorisés proposent une comparaison visuelle ; aucune reconnaissance exacte n’est annoncée.
- Les polices personnelles restent privées avant publication ; le lien d’aperçu privé incorpore sa police. L’accès public suit l’état du mini-site.
- Compatibilité de la création avec une prévisualisation HTTP : repli cryptographique pour les navigateurs sans `crypto.randomUUID`.
- Essentiel : le rendu blanc préserve le lettrage d’un logo simple sur fond opaque clair ou sombre, avec une analyse d’image limitée à 32 × 32 pixels. Un logo transparent reste préférable pour les compositions complexes.

Le parcours détaillé est dans `PARCOURS-CLIENT-SALI.md`. Cette mise à jour réutilise le schéma existant : aucune nouvelle migration n’est nécessaire.

## Corrections de la version 2.4

- Signature : colonnes rééquilibrées, logo plus présent, informations centrées dans leur zone et séparateur sur toute la largeur utile. Format de carte conservé à 85,6 × 54 mm.
- Essentiel : logo complet en monochrome blanc, réduit et centré sur les deux axes, sans pastille ajoutée au recto.
- Studio : phrase sous le QR code supprimée. Les noms Essentiel, Signature et Studio sont identiques sur l’accueil et dans l’éditeur.
- QR : les deux couleurs choisies sont utilisées, avec un cœur de module contrasté pour préserver le scan. Les accents trop pâles restent visibles autour du médaillon ; une principale trop claire est assombrie pour garder un code lisible.
- Montserrat remplace les familles non approuvées sur le site, le dashboard et les aperçus. Moontime est désormais fourni par le site à partir du fichier transmis, en WOFF et TTF, et est incorporé dans la planche autonome. Les courtes phrases graphiques utilisent Moontime ; les textes contenant des caractères absents du fichier, notamment les accents français, conservent Montserrat sur tout le bloc afin d’éviter un mélange dans un mot. Ces règles concernent l’identité SALI ; la bibliothèque clients est élargie en version 2.5.

Les anciennes valeurs de police sont encore acceptées dans les données pour permettre la lecture et la sauvegarde des cartes historiques verrouillées. L’identité du site reste limitée à Montserrat et Moontime ; les cartes clients utilisent leur propre sélection.

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
npm run test:ui
npm run test:journeys
```

Les tests d’intégration et SMTP démarrent leurs services locaux jetables. Le serveur PGlite de test utilise une connexion exclusive ; il ne remplace pas une recette de charge sur PostgreSQL natif. Les anciens scripts navigateur restent disponibles pour les environnements qui les autorisent. La recette navigateur de cette version utilise le navigateur de prévisualisation supervisé. Exécutez-les un par un : ports 3000, 55432 et éventuellement 2526. Aucun de ces tests n’utilise votre base de production ni votre fournisseur SMTP.

Le navigateur peut aussi être fourni par `PLAYWRIGHT_CHROMIUM_EXECUTABLE` ou par `USE_SPARTICUZ=true`. Les captures d’inspection et les journaux bruts sont des fichiers de travail exclus des archives. Le rapport livré récapitule les contrôles réellement exécutés et leurs limites.
