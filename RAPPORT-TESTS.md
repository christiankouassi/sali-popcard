# Recette PopCard — version 2.5.0

23 octobre 2026. Contrôles réalisés sur le serveur Next.js compilé et dans Chrome, avec une base isolée et des identités fictives.

## Résultats automatisés

| Contrôle | Résultat |
| --- | --- |
| Construction Next.js, TypeScript et serveur autonome | Réussis ; manifestes JSON vérifiés |
| Tests unitaires | 30 réussis, aucun échec |
| Modèles | 12 rendus, versions historiques et nouvelles, recto et verso |
| QR codes | 24 décodages réussis : trois palettes, deux tailles, deux longueurs d’URL, avec et sans logo |
| Parcours API complet | Inscription, connexion, vérification, brouillon, aperçu privé, commande, justificatif, production, expédition, publication, suspension et mots de passe : réussis |
| Sécurité | 24 contrôles réussis : accès, isolation, CSRF, injections, limites, fichiers, sessions, tarifs et transitions |
| Polices et commande | 17 scénarios complémentaires réussis |
| SMTP | Même recette réussie avec le serveur SMTP local ; liens de vérification et de réinitialisation reçus et utilisables |
| Bibliothèque | 80 familles, présence et signature de chaque fichier WOFF2 local, licences individuelles vérifiées |

Les scénarios complémentaires couvrent notamment les imports TTF, OTF, WOFF et WOFF2 ; les fichiers déguisés, vides et trop lourds ; les doublons ; les accès entre comptes ; les métadonnées falsifiées ; les polices d’aperçus privés ; les aperçus périmés ; deux confirmations concurrentes produisant une seule commande et un seul email ; le verrouillage de l’identité ; le suivi obligatoire et la publication à l’expédition.

## Recette dans le navigateur

- Création vide en HTTP, avec repli cryptographique lorsque `crypto.randomUUID` n’est pas disponible.
- Saut direct vers l’aperçu bloqué et guidage vers l’information manquante. Focus vérifié sur le champ concerné.
- Logo obligatoire pour Essentiel ; les autres modèles peuvent afficher des initiales.
- E-mail et URL invalides bloqués avant l’aperçu. Une saisie dépassant la limite de 100 caractères est également signalée.
- Départ immédiat vers la liste, reprise du brouillon, conservation des coordonnées et du logo.
- Une sauvegarde volontairement mise en échec puis reprise : texte conservé, nouvelle tentative réussie et un seul brouillon créé.
- Recherche de police, filtre arabe, résultat vide, choix séparé des titres et textes et import personnel appliqué.
- Lecture du nom Poppins dans un SVG ; script contenu dans le fichier supprimé avant affichage.
- Logo opaque simple rendu en blanc et centré sur Essentiel. Aucun panneau de tolérance n’est ajouté.
- Signature sans le libellé « Carte de visite » ; noms longs adaptés sur Signature et Studio. Contrôle des limites des blocs dans la carte.
- Quantité décimale refusée ; ICE entreprise incomplet refusé ; retour à l’éditeur et reprise de quantité, pays, facturation et adresse. Les confirmations sont redemandées.
- Commande fictive de trois cartes, 900 DH ; dépôt de justificatif ; refus avec note ; remplacement par le client ; vérification bancaire et droits obligatoires ; passage en production, expédition et livraison.
- Recto et verso de production contrôlés. Mini-site publié et quatre actions principales présentes : appel, WhatsApp, enregistrement du contact et site web.
- Menu testé à 390 × 480 : déconnexion visible en bas, dernier lien Aide cliquable et fermeture avec Échap.

## Écrans contrôlés

| Écran | Tailles de fenêtre testées | Résultat |
| --- | --- | --- |
| Éditeur, identité et informations | 320 × 640 ; 360 × 740 ; 390 × 844 ; 768 × 1024 ; 844 × 480 ; 1024 × 768 ; 1440 × 900 ; 1920 × 1080 | Pas de défilement horizontal ; labels d’étapes visibles ; champs affichés sur leur hauteur complète |
| Paiement | Largeurs 320, 768 et 1440 | Champs et récapitulatif contenus ; retour à la carte accessible |
| Accueil | Largeurs 320, 390, 768 et 1440 | Pas de débordement horizontal |
| Dashboard et menu | 390 × 480 et ordinateur | Navigation et actions du bas accessibles |

Les tailles ont été reproduites avec des cadres de navigateur de dimensions contrôlées. Le défilement principal de la page reste actif ; les champs et le mini-site ne sont plus enfermés dans un panneau à défilement interne.

## Limites de cette recette

Cette recette ne constitue pas une garantie sur toutes les combinaisons de fichiers, de polices, de navigateurs et d’appareils. Aucun virement, email externe, accès à la base de production ou lancement d’impression physique n’a été effectué. Les contrôles SQL utilisent PGlite avec une connexion exclusive ; ils ne constituent pas un test de charge PostgreSQL natif. Safari, Firefox et de vrais téléphones n’ont pas été utilisés dans cette session.

L’extraction d’un nom de police dépend des métadonnées présentes dans le logo. Une image ou un lettrage converti en tracés ne permet pas cette extraction exacte. Les polices absentes d’un SVG/PDF non autonome peuvent être substituées au rendu ; une version vectorisée ou un PNG fidèle doit alors être fourni. Le rendu blanc des logos complexes doit être confirmé dans l’aperçu et sur une épreuve avant fabrication.

La version préparée est une livraison source et serveur autonome, accompagnée d’une prévisualisation. La configuration et les services de production existants sont réutilisés au déploiement.
