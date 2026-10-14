# SALI DigiCom PopCard — Next.js / React / Node.js / PostgreSQL

Projet unique : Next.js 16 (App Router), React 19, API Node.js intégrée, PostgreSQL via `pg`. Aucun Laravel, Firebase ou service d’authentification externe. Les comptes, sessions, tokens et données sont gérés dans le projet.

## Démarrer en local

Prérequis : Node.js 22 LTS ou 24, Docker pour lancer PostgreSQL (ou une base PostgreSQL existante).

1. Copier `.env.example` vers `.env.local`.
2. `npm ci`
3. `docker compose up -d`
4. `npm run db:migrate`
5. `npm run dev` puis ouvrir http://localhost:3000.

Inscrivez votre compte, puis lancez `npm run admin -- votre-email@example.com` pour accéder à l’administration. Il n’existe aucun mot de passe administrateur par défaut.

`MAIL_MODE=log` n’envoie pas d’e-mail : les liens de vérification et de réinitialisation sont consultables dans Administration → Journal des emails. Le journal n’est accessible qu’aux administrateurs. Pour tester un autre client, l’administrateur peut lui remettre son lien. Le lien expire en une heure et s’utilise une seule fois. En local, le lien apparaît aussi dans la console.

## Hébergement Infomaniak

Ce projet exige une application **Node.js** et une vraie base **PostgreSQL** accessible par `DATABASE_URL`. Un dépôt FTP sur un site Apache/PHP et une base MariaDB ne suffisent pas. Dans l’organisation SALI Capital, utiliser le site Node.js prévu pour PopCard ; le domaine appartient à SALI DigiCom. Ne pas changer le site principal existant.

Sur l’environnement Node.js : installer avec `npm ci`, définir les variables de `.env.example`, lancer `node scripts/migrate.mjs` avec les variables déjà chargées par le serveur (ou `npm run db:migrate` si `.env.local` est présent), construire avec `npm run build:dist`, puis démarrer avec `npm start`. Le port peut être défini via `PORT`. `APP_URL` doit être l’URL HTTPS exacte de PopCard. Les réglages du domaine, du certificat, du port et de la commande de démarrage dépendent du site Node.js dans le Manager. Guide officiel : https://www.infomaniak.com/fr/support/faq/2537/creer-un-site-nodejs-chez-infomaniak

Le SMTP doit être celui qui héberge réellement `contact@sali-digicom.com`. Le compte Infomaniak n’implique pas que cette boîte est hébergée chez lui. Renseigner le fournisseur réel et tester la réception des liens avant l’ouverture des commandes. PostgreSQL et SMTP de production n’ont pas été connectés pendant cette correction.


## Configuration métier

- `POPCARD_ORDERS_ENABLED=true`, `POPCARD_BANK_HOLDER` et `POPCARD_BANK_RIB` sont requis pour ouvrir les commandes.
- `POPCARD_BANK_NAME`, `POPCARD_BANK_IBAN`, `POPCARD_BANK_SWIFT` : informations du virement.
- `POPCARD_SHIPPING_MA`, `POPCARD_SHIPPING_INT` : frais en DH entiers (défaut 0, à valider).
- Tarifs repris de la version précédente : première carte + mini-site 400 DH ; exemplaires suivants 250 DH, 225 DH à partir de 50, 200 DH à partir de 100. Recommande : prix unitaire sans première création.
- `POPCARD_INVOICE_ENABLED=true`, `POPCARD_COMPANY_ADDRESS`, `POPCARD_COMPANY_ICE` : activent le document imprimable en PDF. Faites valider numérotation, TVA et mentions fiscales avant un usage comptable réel. Le document actuel reprend la référence de commande et le total payé ; il ne constitue pas un module comptable fiscal complet.
- SMTP : `MAIL_MODE=smtp`, `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `MAIL_FROM=contact@sali-digicom.com`. Port 465 TLS immédiat ; 587 STARTTLS. Il faut les informations du fournisseur réel de cette boîte mail. Les emails sont envoyés directement, sans worker séparé. Les échecs apparaissent dans le journal ; renvoyez les liens depuis le compte ou retentez après correction SMTP.

## Parcours et règles

- Landing, inscription avec confirmation du mot de passe, connexion, récupération, vérification.
- Vue d’ensemble, Mes PopCards, commandes, profil/facturation, compte, aide.
- Création en quatre étapes, trois modèles, polices locales, logo et aperçu React du recto/verso/mini-site avec filigrane. Enregistrement explicite du brouillon.
- Commande → virement attendu → justificatif → vérification bancaire et droits → paiement validé → production → expédition → livraison.
- **Le mini-site devient public lors de l’expédition, qui marque la fin de production. Le paiement seul ne publie rien.** Les coordonnées restent modifiables après publication ; le modèle, les couleurs, les polices et le logo sont verrouillés dès la première commande.
- Le reçu ne confirme pas automatiquement le paiement. L’administrateur doit comparer le reçu au relevé bancaire, puis cocher les confirmations.
- Justificatifs privés et contrôlés par propriétaire/administrateur ; seuls les logos de cartes publiées sont publics. Les fichiers sont limités à 3 Mo par fichier.
- Les commandes stockent une copie de la carte, de la facturation et de la livraison au moment de la commande. Les événements gardent l’historique des changements.
- Pas de transfert automatique des données MariaDB ou des anciens mots de passe Laravel. Cette livraison démarre avec une base PostgreSQL neuve. Si des comptes réels existent, planifier un import séparé.

## Recette avant ouverture

1. Inscription, lien email, connexion, déconnexion, réinitialisation du mot de passe.
2. Création des trois modèles, aperçu mobile, logo, brouillon, modification.
3. Deux clients distincts : aucun accès aux cartes/reçus/commandes de l’autre.
4. Commande, prix et quantité, facturation entreprise (ICE), livraison.
5. Reçu PDF/image, validation/refus administrateur, remplacement du reçu.
6. Vérifier que la page publique répond 404 avant expédition, puis fonctionne après expédition. Suspension/réactivation.
7. Emails SMTP réellement reçus, vérification du numéro de suivi, validation des textes et mentions légales.

## Vérifications livrées

- `npm test` : prix, transitions, publication après production, sécurité des liens.
- `npm run build` : compilation Next.js et TypeScript.
- `npm run test:integration` : lancement d’un PostgreSQL de test WebAssembly (PGlite) et de Next.js, puis parcours HTTP complet. Ce test ne remplace pas une recette sur votre PostgreSQL distant et votre SMTP.
- `npm run test:ui` : screenshots et navigation desktop/mobile, navigateur installé via Playwright (`npx playwright install chromium`).

Les réglages SMTP, banque, livraison, mentions légales, conditions de vente et sauvegardes PostgreSQL relèvent de la configuration avant ouverture. Aucun secret n’est livré. L’hébergement Vercel et les quotas de la base restent à vérifier selon l’offre choisie.

## Corrections des références — 13 octobre 2026

Les compositions des modèles A (Logo), B (Carte de visite) et C (Épuré) proviennent du prototype original `SALI Pop Card.html` : proportions 85,6 × 54 mm, zones recto/verso, colonne d’icônes du B, hiérarchie du C et mini-site à grille de boutons. Les SVG fournis sont conservés dans `public/assets/reference`. Les coordonnées des exemples de la landing sont fictives.

Un seul import de logo accepte PNG/JPEG/WebP/SVG/PDF. Un PDF multipage propose un sélecteur de page. Le logo est normalisé en PNG (dimension maximale 1400 px), et une copie normalisée avant traitement est conservée en base, privée. La suppression du fond est locale, par détection des pixels de fond connectés aux bords : adaptée aux fonds unis, réversible, sans service externe. Vérifier le résultat pour un logo complexe ; cette méthode ne promet pas un détourage sémantique de tout arrière-plan. Les zones blanches fermées sont conservées. Le fichier SVG est rasterisé après filtrage des références externes et du contenu actif. Les sources restent sur l’appareil ; les PNG normalisés sont enregistrés.

Quatre palettes proposent ensemble couleur principale, fond et accent. Les couleurs très claires sont ajustées dans les palettes pour préserver la lisibilité. Les couleurs manuelles restent disponibles. Les QR codes conservent un contraste suffisant et un petit logo central ; vérifier aussi une épreuve physique avant fabrication.

L’aperçu par email utilise un lien aléatoire de 256 bits, stocké sous forme de hash, valable sept jours. Un nouvel envoi révoque le lien précédent. Ce lien donne accès aux aperçus avec filigrane, sans rendre le mini-site public. Le destinataire est l’adresse du compte connecté. Les logos sont inclus dans la réponse privée ; les justificatifs ne le sont jamais. L’envoi renvoie le résultat réel `sent`, `log` ou `failed`.

La landing comporte douze sections et le logo du footer est borné en taille.

## Vérifications automatisées

- `npm test` : tarifs, publication, transitions, liens, palettes et transparence.
- `node tests/designs.mjs` : six faces, structure du mini-site, décodage de QR personnalisés à deux tailles et avec deux jeux de couleurs.
- `npm run test:integration` : API sur PostgreSQL de test (PGlite via protocole PostgreSQL), comptes, vérification, commandes, reçu privé, permissions, production, publication, suspension, verrouillage, liens d’aperçu et expiration, réinitialisation, CSRF.
- `npm run test:smtp` : même parcours avec un SMTP de test local, contrôle du statut d’envoi.
- `npm run test:ui` : navigateur Playwright, mobile 390 px et desktop 1440 px, douze sections, inscription, imports, palettes, transparence, brouillon et email d’aperçu. `USE_SPARTICUZ=true` permet le navigateur livré par ce paquet de test.

Ces tests ne remplacent pas la recette sur la base PostgreSQL, le domaine et la boîte mail réels d’Infomaniak, ni un test de charge ou une certification fiscale de factures.

## Livraison 2.2 — 14 octobre 2026

Les exemples de la landing utilisent VE pour Votre entreprise, quatre actions et cinq rubriques avec des coordonnées fictives. Les aperçus de création utilisent Nom complet et un cercle Logo ; les emplacements vides ne sont jamais enregistrés comme données du client. Les boutons sans destination restent désactivés et s’activent à la saisie. La signature Créé par SALI DigiCom est un lien vers le site de l’agence. La fonction et l’entreprise du modèle Épuré sont sur deux lignes. Le modèle Logo est centré avec une pastille contrastée. La landing ajoute des visuels de scan, recto-verso, palettes et suivi de commande et un footer en quatre colonnes avec logo couleur.

Le build complet se prépare avec `npm run build:dist`. Le dossier dist contient le serveur Node.js autonome, ses dépendances, public et les assets Next.js. Le ZIP dist fourni se lance avec `node server.js` dans son dossier après configuration de PostgreSQL et du SMTP. Ce build n’est pas un export statique Apache/PHP. Le lien ChatGPT reste un aperçu statique séparé.
