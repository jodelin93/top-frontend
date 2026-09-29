---
id: sales-void
title: Annuler une vente
category: Retours et annulations
order: 405
routes: [/admin/sales]
keywords: [annuler, annulation, vente annulée, erreur de saisie, void, supprimer une vente]
related: [returns-pos, sales-history, faq-sales]
---
L'annulation corrige une vente saisie par erreur : le stock est réintégré, les points gagnés sont retirés et les paiements sont annulés. Elle se fait dans l'administration.

1. Ouvrez **Administration** > **Ventes**.
2. Cherchez la vente par son numéro, puis cliquez dessus.
3. Cliquez sur **Annuler la vente**.
4. Lisez l'avertissement : l'action est irréversible.
5. Tapez le **Motif**, par exemple « Saisie par erreur ».
6. Cliquez sur le bouton rouge **Annuler la vente**. Pour renoncer, cliquez sur **Conserver la vente**.

![La confirmation d'annulation](shot:sale-void)

La vente passe au statut **Annulée**. Les paiements en compte, en carte cadeau ou en avoir sont rendus au client ; une carte cadeau vendue dans cette vente est annulée.

| Situation | Annulation possible ? | Que faire |
| --- | --- | --- |
| Vente **Terminée**, session de caisse encore ouverte | Oui | Annulez la vente. |
| La session de la vente est clôturée | Non | Faites un [retour](topic:returns-pos). |
| La vente a déjà eu un retour ou un remboursement | Non (le bouton n'apparaît plus) | Faites un retour pour le reste. |
| Vente sans session, faite il y a plus de 24 heures | Non | Faites un retour. |
| Vente payée par un terminal de carte relié | Non | Faites un retour pour rembourser la carte. |

Si l'annulation est refusée, la raison s'affiche en rouge sous le champ **Motif**.

> **Astuce :** sans le droit d'annuler, la fenêtre **Approbation du gérant requise** s'ouvre : un gérant autorise l'annulation avec ses identifiants.
