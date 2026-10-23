# PopCard — parcours client et traitement SALI

Version 2.5.0 · 23 octobre 2026

| Étape | Côté client | Côté SALI et contrôle de l’application |
| --- | --- | --- |
| 1. Compte | Le client s’inscrit et confirme son adresse e-mail. Il peut préparer un brouillon avant cette confirmation. | Une adresse confirmée est obligatoire pour enregistrer une commande. |
| 2. Modèle | Il choisit Essentiel, Signature ou Studio. | Le format physique reste de 85,6 × 54 mm. Le logo est obligatoire pour Essentiel. |
| 3. Identité visuelle | Il importe son logo, choisit ses couleurs et ses polices. La bibliothèque contient 80 familles avec recherche, filtres et aperçus. Il peut importer sa propre police. | L’identité du site SALI conserve Montserrat et Moontime. Les polices personnelles sont vérifiées et rattachées au compte du client. |
| 4. Informations | Il renseigne un nom ou une société et au moins un moyen de contact valide et visible. Les autres renseignements restent facultatifs. | L’application bloque l’avancée si une information obligatoire manque ou si un numéro, un e-mail ou un lien renseigné est invalide. Elle indique le champ à corriger. Les brouillons incomplets restent sauvegardés. |
| 5. Aperçu | Il regarde le recto, le verso et le mini-site, puis confirme leur vérification. | Les aperçus restent privés. Le QR code définitif ne publie pas la fiche à ce stade. Un aperçu peut être envoyé par e-mail avec un lien valable sept jours. |
| 6. Commande | Il indique quantité, facturation et livraison, confirme ses droits et accepte les conditions. Il peut revenir à la carte ; ses informations de livraison restent conservées dans l’onglet. | Le serveur revalide la carte, son état de modification, les données de commande et le prix. Une commande en attente est retrouvée au lieu d’en créer une seconde. L’identité graphique commandée et l’instantané d’impression sont figés. |
| 7. Virement | Il retrouve les coordonnées bancaires, réalise le virement auprès de sa banque et dépose son justificatif dans la commande. | Le dépôt du justificatif fait passer la commande à « Paiement à vérifier ». Il ne vaut pas confirmation bancaire. Le document reste privé. |
| 8. Validation | Le client consulte le statut et les éventuelles remarques dans son espace. Si son justificatif est refusé, il peut en déposer un nouveau. | SALI ouvre Administration → Commandes → Traiter, vérifie le versement dans sa banque, le montant et les droits/informations. Pour valider, l’administrateur confirme réception bancaire et droits. |
| 9. Production | Le client voit « En production ». | Après validation du paiement, SALI ouvre le recto-verso de production correspondant à la commande et lance l’impression auprès de son prestataire. L’application garde l’instantané commandé, même si des coordonnées évoluent ensuite. |
| 10. Expédition | Le client consulte son numéro de suivi et peut utiliser son mini-site public. | SALI passe la commande à « Expédiée » avec un numéro de suivi obligatoire. C’est à cette étape que le mini-site devient public. Le seul paiement ne le publie pas. |
| 11. Livraison et suivi | Le client reçoit sa carte, partage son QR et peut actualiser ses coordonnées. Il peut commander de nouveaux exemplaires. | SALI confirme « Livrée ». Modèle, couleurs, polices et logo de l’identité commandée restent verrouillés. Une fiche publiée peut être suspendue puis réactivée par SALI. |

## Points pratiques

- Première carte et mini-site : 400 DH. Les exemplaires supplémentaires suivent les paliers existants. Le serveur calcule les frais de livraison configurés et le montant final.
- Avant l’enregistrement de la commande, le retour vers l’éditeur permet de corriger la carte. Après cet enregistrement, une modification des coordonnées ne remplace pas l’instantané déjà commandé ; une correction d’impression doit être revue avec SALI avant production.
- L’impression physique, le virement bancaire et la remise au transporteur restent des opérations réalisées par le client ou votre équipe. L’application enregistre les validations, les fichiers et le suivi.
- Un SVG ou un PDF peut conserver le nom de sa police. Si le logo est une image ou si les lettres ont été converties en tracés, ce nom n’est pas extractible exactement : l’interface permet la comparaison et le choix d’une alternative.
- Les écrans de recette utilisent des données fictives et un journal local d’emails. Aucun virement réel n’y est demandé.

Les logos SVG/PDF dont les polices ne sont pas intégrées peuvent dépendre d’une substitution de police lors du rendu. Un logo au lettrage converti en tracés, ou une image fidèle fournie par le client, préserve son apparence. Un tracé ne conserve généralement plus le nom de la police à extraire.
