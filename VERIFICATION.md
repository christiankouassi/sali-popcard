# Vérification de PopCard — version 2.2.0

Corrections du 14 octobre 2026, à partir du prototype HTML et du dossier de référence fournis.

| Contrôle exécuté | Résultat |
|---|---|
| Build de production Next.js et contrôle TypeScript | Réussi |
| 8 tests unitaires : tarifs, transitions, publication, liens, palettes et transparence | Réussis |
| Six faces des trois modèles et structure du mini-site | Réussis |
| 16 décodages de QR personnalisés : deux URLs, deux tailles, couleurs normales/claires, avec/sans logo | Réussis |
| API : inscription, connexion, vérification, réinitialisation, changement de mot de passe et révocation des autres sessions | Réussi |
| Profil : ICE invalide, changement d’email protégé par mot de passe, nouvelle vérification | Réussi |
| Isolation de deux clients, accès administrateur, reçu et logo original privés | Réussi |
| Commande, quantité/prix, paiement manuel, production, expédition, publication, suspension | Réussi |
| Verrouillage du modèle et des couleurs après commande | Réussi |
| Aperçu privé : envoi, expiration, refus des liens invalides, filigrane, absence de publication | Réussi |
| Envoi via SMTP de test local et statuts enregistrés en base | Réussi |
| Navigateur : inscription, imports PNG/JPEG/SVG/PDF, page du PDF, palette complète, suppression/restauration du fond, sauvegarde | Réussi |
| Affichage à 320, 390, 768 et 1440 px, absence de débordement, bouton contact lisible | Réussi |
| Format d’impression : 85,6 × 54 mm, marge nulle | Réussi |
| Audit des dépendances de production | 0 vulnérabilité signalée lors du contrôle |

Les tests du build autonome Node.js utilisent dist/server.js, y compris les tests SMTP. Le contact vCard a été contrôlé, ainsi que l’absence d’enregistrement des coordonnées fictives affichées dans les champs vides.

La vérification visuelle a permis de corriger un conflit CSS qui tronquait le bouton d’enregistrement du contact. Les tests ont aussi détecté puis permis de corriger la lisibilité du QR code et un conflit entre traitements d’image successifs.

## Ce qui doit être vérifié sur l’hébergement réel

- Connexion à PostgreSQL de production : les tests utilisent PGlite, moteur PostgreSQL de test accessible via le pilote `pg`.
- SMTP réel et réception des messages sur les boîtes des clients : le SMTP local ne prouve pas la délivrabilité de `contact@sali-digicom.com`.
- Domaine, HTTPS, paramètres Node.js et sauvegardes sur Infomaniak.
- Épreuve imprimée : lisibilité des textes et scan depuis une carte physique.
- Charges élevées et comportement concurrent : aucun test de charge complet n’a été exécuté.

La suppression du fond traite les fonds unis connectés aux bords ; elle ne garantit pas un détourage automatique de toutes les images complexes. Le résultat reste réversible et le PNG normalisé avant traitement est conservé.

L’aperçu hébergé dans ChatGPT reste un aperçu visuel avec données locales de démonstration. Le projet Next.js fourni contient l’API Node.js, le schéma PostgreSQL et l’envoi SMTP : les données de cet aperçu ne sont pas une base de production.

## Corrections de cette livraison

- VE reste uniquement dans les exemples de Votre entreprise ; cercle Logo dans une création vierge.
- Cercle blanc centré sur le modèle Logo, fonction puis entreprise sur le modèle Épuré, ville et site dans le modèle Carte de visite.
- Quatre actions, cinq rubriques, saisie répercutée immédiatement et destinations vides désactivées.
- Recommandation de contraste selon un logo clair ou sombre, sans recolorer le logo.
- Illustrations du scan, du recto-verso, des palettes et du suivi ; footer à quatre colonnes avec logo couleur et lien Créé par SALI DigiCom.
- Le ZIP dist contient le vrai build Node.js et son frontend. Le lien ChatGPT reste distinct de ce build.

Un débordement de l’illustration de scan à 320 px a été détecté puis corrigé. Les tests navigateur portent sur le build Node.js local (Chromium), pas directement sur l’URL ChatGPT.
