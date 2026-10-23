# SALI PopCard — livraison 2.3.0 et rapport de recette

Date : 22 octobre 2026 (Africa/Casablanca).

## Résultat

La compilation de production et le démarrage du serveur autonome ont réussi. La recette a été exécutée dans Chromium sur le dossier `dist`, avec une base PostgreSQL de test PGlite jetable et un serveur SMTP local. Les commandes et uploads réussis des tests navigateur utilisent la véritable API locale ; les pannes sont injectées au niveau du transport.

| Vérification | Résultat |
|---|---|
| Installation reproductible avec `npm ci` et lockfile | Réussie |
| Compilation Next.js / TypeScript | Réussie |
| Vérification des manifestes du serveur compilé | Réussie |
| Tests unitaires métier, palettes, transparence et liens | 8 réussis |
| Recette du navigateur | 32 scénarios réussis |
| Parcours utilisateur, administrateur et visiteur | 32 étapes réussies |
| Sécurité et isolation des comptes via l’API | 24 contrôles réussis |
| QR codes : tailles, couleurs et logo central | 16 décodages réussis |
| Modèles physiques : versions 1 et 2, recto et verso | 12 rendus vérifiés |
| Emails via SMTP local : émission et réception des liens | Réussis |
| Flux API complet : droits, paiement, publication, suspension et récupération | Réussi |

## Modifications livrées

- Page d’accueil en cinq sections, textes réécrits, photographie de rencontre, apparition de la carte et du titre, effet de reflet sur les boutons, survols, démonstration au défilement et galerie interactive.
- Mesure indicative dans le même navigateur à 1 440 pixels de large : page précédente 4780 pixels de haut ; page livrée 3920 pixels, soit environ 18 % de hauteur en moins.
- Dashboard enrichi et navigation conservant sa barre latérale et son en-tête.
- Navigation latérale défilante, compte et déconnexion accessibles sur les écrans courts, fermeture du menu mobile avec Échap.
- Sauvegarde continue avec écritures sérialisées, récupération locale des dernières saisies, sauvegarde des logos et reprise visible des brouillons non synchronisés.
- Protection contre les doublons lors d’une réponse de création perdue ; conflits entre onglets signalés avec choix de la version à conserver.
- Nouveau modèle Signature pour les nouvelles créations ; rendu historique conservé pour les cartes sans version explicite. Les commandes existantes gardent leurs règles de verrouillage.
- Analyse de couleurs sur un échantillon réduit pour conserver une page réactive ; aucun contrôle de détourage ou de tolérance dans l’éditeur.
- Construction repartant d’un dossier généré propre et validation des manifestes afin d’éviter une archive compilée incomplète.

## Recette navigateur détaillée

| N° | Scénario | Résultat |
|---|---|---|
| 1 | Page publique : cinq sections, photo chargée, aucune promesse NFC ou chiffre inventé | Réussi |
| 2 | Démonstration : changement au scroll, clic et clavier | Réussi |
| 3 | Galerie : trois modèles, deux faces et trois couleurs interactives | Réussi |
| 4 | Affichage public : 320, 390, 768, 1024, 1440 et 1920 px sans débordement | Réussi |
| 5 | Mouvements réduits : contenu visible et animations désactivées | Réussi |
| 6 | Captures de contrôle : page et dashboard desktop/mobile | Réussi |
| 7 | Navigation rapide : le menu reste monté, aucun écran Chargement | Réussi |
| 8 | Menu : bas toujours accessible sur écrans de faible hauteur | Réussi |
| 9 | Menu mobile : ouverture, fermeture par Échap et arrière-plan bloqué | Réussi |
| 10 | Création : une visite vide ne crée aucun brouillon parasite | Réussi |
| 11 | Dernière saisie puis départ immédiat : brouillon réellement enregistré | Réussi |
| 12 | Rechargement avant le délai de sauvegarde : dernière saisie récupérée | Réussi |
| 13 | Échec serveur puis rechargement : récupération locale et reprise | Réussi |
| 14 | Coupure hors ligne puis retour du réseau : resynchronisation | Réussi |
| 15 | Réseau lent et saisies pendant l’envoi : la plus récente gagne | Réussi |
| 16 | Réponse de création perdue : la relance ne crée aucun doublon | Réussi |
| 17 | Brouillon jamais envoyé : reprise visible depuis la liste | Réussi |
| 18 | Deux onglets : conflit visible, aucune écriture silencieuse par-dessus | Réussi |
| 19 | Email incomplet : erreur explicite, correction puis reprise de sauvegarde | Réussi |
| 20 | Imports réels PNG, JPEG et PDF multipage ; détourage et tolérance absents | Réussi |
| 21 | SVG actif : nettoyage du script et des références externes | Réussi |
| 22 | Fichier trop volumineux et format invalide : rejet sans bloquer la page | Réussi |
| 23 | Aperçu email privé : lien généré par le vrai backend local | Réussi |
| 24 | Mini-site : quatre actions, fiche vCard et liens issus des saisies | Réussi |
| 25 | Éditeur responsive : mobile et tablette sans débordement | Réussi |
| 26 | Stockage local saturé : avertissement et sauvegarde serveur maintenue | Réussi |
| 27 | Brouillon local corrompu : création toujours utilisable | Réussi |
| 28 | Grand logo : analyse fluide sans longue tâche bloquante | Réussi |
| 29 | Impression : deux faces Signature aux dimensions exactes | Réussi |
| 30 | Version du modèle préservée pour une carte ancienne | Réussi |
| 31 | Isolation : un autre compte ne lit ni carte ni récupération locale | Réussi |
| 32 | Aucune erreur JavaScript ni violation CSP dans les parcours | Réussi |

## Parcours complet

- Landing → bouton d’inscription (694 ms)
- Inscription : formulaire vide bloqué par le navigateur (88 ms)
- Inscription : mots de passe différents (179 ms)
- Inscription : mot de passe sans chiffre → message explicite (91 ms)
- Inscription valide → espace client + bandeau de vérification (897 ms)
- Renvoyer le lien de vérification (372 ms)
- Déconnexion puis retour arrière : l’espace reste fermé (181 ms)
- Connexion : mauvais mot de passe (911 ms)
- Mot de passe oublié → lien → nouveau mot de passe (1350 ms)
- Lien de réinitialisation réutilisé → refusé (1008 ms)
- Ancien mot de passe refusé, nouveau accepté (1499 ms)
- Vérification d’e-mail par le lien, puis lien réutilisé (467 ms)
- Éditeur : modèle Épuré, champs avec HTML et lien javascript: (406 ms)
- Enregistrer le brouillon puis commander (case de confirmation obligatoire) (1031 ms)
- Commande : quantité invalide, ICE invalide, puis commande valide (1117 ms)
- Dépôt du justificatif : mauvais format puis PDF valide (847 ms)
- Client : /app/admin n’ouvre pas l’administration, /production refusée (93 ms)
- Admin : connexion et accès au cockpit (958 ms)
- Admin : validation refusée sans les deux confirmations (292 ms)
- Admin : paiement validé → production (1833 ms)
- Admin : expédition refusée sans numéro de suivi, puis acceptée (1953 ms)
- Client : suivi « Expédiée » avec numéro, mini-site publié (478 ms)
- Visiteur anonyme : mini-site public sans lien dangereux ni script exécuté (190 ms)
- Admin : suspension → mini-site indisponible → réactivation (563 ms)
- Admin : journal des e-mails et liste des clients (114 ms)
- Client : identité verrouillée après commande (265 ms)
- Client : coordonnées toujours modifiables après publication (419 ms)
- Profil : changer d’e-mail exige le mot de passe, ICE invalide refusé (790 ms)
- Compte : mauvais mot de passe actuel refusé (969 ms)
- Liens cassés : mini-site inconnu, aperçu invalide (140 ms)
- Mobile : menu ouvert, navigation, menu refermé (394 ms)
- Aucune erreur JavaScript ni violation CSP pendant tout le parcours (1 ms)

## Préserver l’installation existante

1. Conserver vos variables d’environnement et votre fichier `.env.local` actuel : PostgreSQL, SMTP, APP_URL, banque, livraison et informations de société. Les ZIP n’incluent pas ces secrets.
2. Le ZIP source contient le projet modifiable et les scripts de tests. Pour le reconstruire : `npm ci` puis `npm run build:dist`.
3. Le ZIP compilé contient `dist/server.js`, ses dépendances et les ressources frontend. Dans `dist` : `node server.js`, ou `node --env-file=.env.local server.js` si les variables sont dans ce fichier. Utiliser Node.js 22 LTS ou 24, Linux x64, et le port de votre hébergement.
4. Aucune migration supplémentaire de la base PopCard existante n’est nécessaire pour cette version. Les informations de version du design sont stockées dans les données JSON des cartes.
5. La mise à jour réutilise les endpoints, la base et le fournisseur d’emails déjà configurés. Aucun déploiement ni modification des données de production n’a été effectué pendant cette recette.

## Limites précises

La recette couvre Chromium, les tailles d’écran indiquées, les pannes simulées et les services locaux de test. Elle n’est pas une validation de Safari/Firefox, de la délivrabilité de votre fournisseur SMTP, d’une charge de production ou de votre installation distante. Une épreuve physique reste utile pour vérifier couleurs, marges et lecture du QR sur la carte fabriquée. Les essais automatisés n’épuisent pas toutes les combinaisons possibles.

## Visuels

La photographie intégrée se trouve dans `public/assets/popcard-rencontre-v3.webp`. Elle a été générée avec l’outil intégré imagegen. Le prompt et les contraintes sont conservés dans `ASSETS.md`. Les illustrations de carte, mini-site et interface sont rendues en React/CSS.
