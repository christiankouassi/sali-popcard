# SALI PopCard — intégration Moontime 2.4.1

Date : 23 octobre 2026 (Africa/Casablanca).

## Intégration

Le fichier `MoonTime-Regular.ttf` transmis dans `Moontime-Font.zip` est fourni dans `public/assets/moontime-400.ttf`, sans modification. Sa conversion WOFF conserve la table des caractères et toutes les métriques. Le site sert ces fichiers depuis son propre domaine ; aucune installation locale de la police n’est nécessaire. Le WOFF de 29 004 octets est préchargé et déclaré avec un TTF de secours. La planche autonome incorpore la police en WOFF.

Les tailles, l’interlettrage et les interlignes des phrases graphiques ont été adaptés à Moontime. Montserrat reste utilisée pour l’interface et les textes courants. Le fichier fourni ne possède pas les lettres accentuées françaises : les textes concernés utilisent Montserrat sur tout leur bloc, sans supprimer les accents ni remplacer une seule lettre au milieu d’un mot.

## Vérifications exécutées

| Contrôle | Résultat |
| --- | --- |
| Identité et validité du TTF fourni | MoonTime Regular, lecture des tables réussie |
| Égalité du TTF livré avec le fichier original du ZIP | Identique octet pour octet |
| Conversion WOFF : caractères et métriques comparés avec le TTF | Identiques |
| Compilation de production, TypeScript et manifestes standalone | Réussis |
| Tests unitaires, dont couverture des caractères et choix de police | 11 réussis |
| QR : trois palettes, deux URL, deux tailles, avec/sans logo | 24 décodages réussis |
| Modèles : trois modèles, deux faces, versions 1 et 2 | 12 rendus réussis |
| Accueil de l’application compilée dans Chromium | Moontime visible sur « En un scan. », Montserrat sur « À vous de jouer. » |
| Verso Signature dans la galerie compilée | Moontime visible sur « le contact ? », sans débordement |
| Journal du navigateur : erreurs et avertissements liés aux polices | Aucun |
| Planche autonome : six faces, police intégrée | Vérifiée dans Chromium |
| Planche dans un cadre mobile de 320 px | Six cartes de 265 px sans débordement horizontal |
| Planche dans un cadre mobile de 390 px | Six faces et phrase Moontime vérifiées |

Les contrôles complets API/sécurité de la version précédente n’ont pas été relancés pour ce changement de police : l’API et le schéma n’ont pas changé. Leurs résultats sont conservés dans `RAPPORT-TESTS-v2.4.md`, et la recette antérieure dans `RAPPORT-TESTS-v2.3.md`.

Les archives ont été reconstruites. Aucun déploiement ni accès à une base de production n’a été effectué.
