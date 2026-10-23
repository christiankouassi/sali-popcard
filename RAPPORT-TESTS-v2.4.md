# SALI PopCard — corrections 2.4.0

Date : 23 octobre 2026 (Africa/Casablanca).

## Changements

- Signature : répartition 40 % / 60 % du recto, identité centrée dans sa colonne, coordonnées plus lisibles et séparateur sur la largeur utile. Ratio physique conservé : 85,6 × 54 mm.
- Essentiel : logo complet blanc monochrome, réduit, centré horizontalement et verticalement, sans débordement. La pastille n’est pas utilisée sur ce recto.
- Studio : phrase sous le QR supprimée. Les trois noms Essentiel, Signature et Studio sont cohérents entre galerie et éditeur.
- QR : principale et accent conservés sur les palettes normales, sans fusion automatique de l’accent dans la principale. Le cœur sombre des points préserve leur lecture. Un accent presque blanc est réservé au médaillon ; une principale trop claire est assombrie pour permettre le scan.
- Polices : Montserrat et Moontime uniquement dans le rendu et dans les choix de l’éditeur. Les autres fichiers de police ont été retirés. Les anciennes valeurs restent acceptées par l’API pour ne pas bloquer les cartes historiques verrouillées ; leur rendu utilise Montserrat.

## Contrôles exécutés pour cette correction

| Vérification | Résultat |
| --- | --- |
| Installation `npm ci` à partir du lockfile | Réussie |
| Compilation Next.js et contrôle TypeScript | Réussis |
| Assemblage du serveur autonome et validation de ses manifestes | Réussis |
| Tests unitaires métier / couleurs | 8 réussis |
| Décodage QR : 3 palettes × 2 URL × 2 tailles × avec/sans logo | 24 réussis |
| Rendu statique des trois modèles, deux faces et deux versions | 12 réussis |
| Parcours API avec base de test jetable, dont sauvegarde et relecture Moontime / Montserrat | Réussi |
| Sécurité et isolation des comptes par l’API | 24 contrôles réussis |
| Inspection Chromium de la planche utilisant le composant et les styles réels | 6 faces vérifiées |
| Galerie de l’application compilée : Essentiel, Signature, verso Signature et verso Studio | Changements interactifs vérifiés ; partage 40/60, logo centré, QR bicolore et légende absente confirmés |
| Mesure responsive dans un cadre de 390 px | 6 faces sans débordement horizontal, cartes de 335 px de large |
| Logo Essentiel : décalage du centre du cadre image par rapport au centre de carte | Inférieur à 0,01 px sur les deux axes |

Le rapport de recette complète de la version précédente est conservé dans `RAPPORT-TESTS-v2.3.md`. Ses 32 scénarios navigateur et 32 étapes ne sont pas présentés comme une nouvelle exécution de cette correction. Cette correction a fait l’objet de contrôles ciblés sur les modèles, couleurs, polices, API et compilation.

## Fichier Moontime attendu

Le fichier binaire Moontime n’était pas fourni dans le projet. Aucune imitation n’a été ajoutée. Moontime utilise son installation locale lorsqu’elle existe ; sinon le rendu reste en Montserrat. Le fichier officiel `.woff2`, `.ttf` ou `.otf` est nécessaire pour fournir cette police à tous les visiteurs et vérifier son rendu définitif. Les captures et la planche livrées ont été vérifiées en Montserrat.

## Proposition visuelle

`node scripts/preview-models.mjs chemin/sortie.html` génère une planche autonome avec les six faces, les vrais styles et des coordonnées fictives. Les QR de cette planche ouvrent une adresse d’exemple. Le générateur incorpore les fichiers Montserrat et les logos pour une lecture hors ligne.

Aucune base réelle, boîte email réelle ou publication en production n’a été utilisée pour ces contrôles.
