---
id: settings-exchange-rate
title: Le taux de change USD / HTG
category: Paramètres
order: 1302
routes: [/admin/settings, /admin/dashboard]
keywords: [taux de vente, taux d'achat, taux de change, devise, dollar, gourde, USD, HTG, conversion, mettre à jour le taux, historique des taux]
related: [pos-payment-cash-change, dashboard, settings-general]
---
Le magasin a deux taux entre le dollar et la gourde. La carte **Taux de change** se trouve en haut du **Tableau de bord** et dans l'onglet **Général** des paramètres. Elle affiche les deux taux.

![La carte Taux de change](shot:settings-exchange-rate)

| Taux | Sert à | Exemple |
| --- | --- | --- |
| **Taux de vente** | Convertir des **gourdes en dollars** : un client qui paie en HTG (le montant demandé et la valeur reçue), une entrée ou un écart en HTG. | 1 USD = 135 HTG : un article à 10 $US coûte 1 350 HTG. |
| **Taux d'achat** | Convertir des **dollars en gourdes** : la monnaie rendue en HTG quand le client a payé en dollars. | 1 USD = 130 HTG : 10 $US de monnaie font 1 300 HTG. |

Quand le client paie en gourdes et reçoit sa monnaie en gourdes, la monnaie se calcule directement en gourdes, sans écart de taux : 2 000 HTG donnés pour 1 350 HTG dus, on rend 650 HTG.

## Changer les taux

1. Sur la carte **Taux de change**, cliquez sur **Mettre à jour le taux**.
2. Tapez le **Taux de vente** et le **Taux d'achat**, par exemple 135 et 130. Laissez le taux d'achat vide pour utiliser le taux de vente.
3. Pour accepter une autre devise, cliquez sur **Autre devise** (ou **Ajouter une devise** si une seule devise est acceptée).
4. Cliquez sur **Enregistrer les taux** (ou **Annuler**).

Les nouveaux taux s'appliquent tout de suite aux nouvelles ventes. Les ventes déjà faites gardent leurs taux ; un retour suit le taux de la vente d'origine.

> **Attention :** vérifiez les taux chaque matin avant d'ouvrir les caisses. Un mauvais taux fausse les montants demandés et la monnaie rendue en HTG.

> **Astuce :** **Historique** montre les anciens taux de vente et d'achat, avec la date et l'auteur de chaque changement.
