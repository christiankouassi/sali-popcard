# Ressources visuelles et typographiques

## Police Moontime (2.4.1)

`public/assets/moontime-400.ttf` est le fichier `MoonTime-Regular.ttf` fourni par l’utilisateur dans `Moontime-Font.zip`. Le fichier `.woff` est une conversion sans changement de glyphes ou de métriques. Ces fichiers sont servis par le site et le WOFF est incorporé à la planche de présentation. Le jeu de caractères fourni ne comprend pas les lettres accentuées françaises ; Montserrat est utilisée pour les blocs concernés.

## Photographie (version 2.3)

`public/assets/popcard-rencontre-v3.webp` est une photographie générée avec l’outil intégré imagegen pour cette présentation, puis convertie en WebP pour le site. Elle montre un échange de carte en situation ; la carte et le mini-site exacts sont rendus séparément en React. Aucun QR, texte commercial ou logo n’a été inventé dans la photographie.

Prompt utilisé :

> Use case: photorealistic-natural. Asset type: photographic panel for the French SALI PopCard professional business-card website. Create one editorial close-up photograph, landscape 3:2 composition. Two business professionals at a bright contemporary Casablanca coworking café, only their natural hands and partial dark and cream suit sleeves in the frame, exchanging one ordinary PVC business card. The card is a deep forest green matte plastic rectangle, realistic credit-card size and softly rounded corners, held naturally between two fingers, no chip and no metallic material. The lower right background includes a softly out-of-focus smartphone resting on a warm ivory stone table. Shallow depth of field, natural side light, warm skin tones and tactile paper and stone details, sophisticated but candid, physically believable hands and card proportions. Dark green and warm ivory color harmony, clean light background, subject concentrated near the center and right so the image crops elegantly. No readable text, no lettering, no QR code, no invented logos, no watermark, no illustration, no UI drawn into the image. This is a lifestyle photo rather than an infographic; the app displays its exact card artwork separately.

## Bibliothèque clients — version 2.5

80 familles au total, dont les deux familles SALI déjà fournies. Les 78 autres sont les fichiers WOFF2 des paquets officiels Fontsource, avec leurs versions indiquées dans `lib/font-catalog.mjs` et leurs licences individuelles dans `public/fonts/<famille>/LICENSE.txt`. Sources : https://github.com/fontsource/fontsource et https://github.com/google/fonts. Les sous-ensembles latin, latin étendu et arabe disponibles ainsi que les graisses 400/700 sont inclus. Le script `scripts/prepare-font-library.mjs` reconstruit ces fichiers. Aucun appel à un fournisseur de polices externe n’est nécessaire dans le navigateur.
