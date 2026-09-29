---
id: pos-payment
title: "Encaisser : l'écran de paiement"
category: Caisse
order: 211
routes: [/pos]
keywords: [encaisser, paiement, payer, F12, finaliser la vente, mode de paiement, reste à payer, devise, USD, HTG]
related: [pos-payment-cash-change, pos-payment-card, pos-loyalty, pos-gift-cards, pos-on-account, pos-receipt]
---
1. Cliquez sur **Encaisser** (touche **F12**). Sur téléphone, touchez **Encaisser** dans la barre du bas.
2. La fenêtre **Paiement** affiche le **TOTAL**, l'**ENCAISSÉ** et le **RESTE À PAYER**, en dollars et en gourdes.
3. Sous ces cases, le taux du jour est rappelé, par exemple **1 USD = 132,5 HTG**.

![La fenêtre Paiement](shot:pos-payment)

Le principe est toujours le même :

1. Choisissez la devise dans **Le client paie en** : **USD** ou **HTG**.
2. Cliquez sur le mode de paiement.
3. Vérifiez ou tapez le montant, puis cliquez sur **Ajouter**.
4. Recommencez tant qu'il reste un montant à payer : une vente peut combiner plusieurs modes et plusieurs devises.
5. Cliquez sur **Finaliser la vente**.

| Bouton | Mode de paiement | À savoir |
| --- | --- | --- |
| **Cash** | Espèces | Seul mode qui peut dépasser le montant dû : la différence devient la monnaie. Voir [Espèces et monnaie](topic:pos-payment-cash-change). |
| **Card** | Carte bancaire | Montant exact. Voir [Carte, MonCash, virement](topic:pos-payment-card). |
| **MonCash** | Paiement mobile | Montant exact. La **Référence** est obligatoire. |
| **Bank transfer** | Virement | Montant exact. La **Référence** est obligatoire. |
| **Loyalty points** | [Points de fidélité](topic:pos-loyalty) | Apparaît si le client a des points. |
| **Carte cadeau** | [Carte cadeau](topic:pos-gift-cards) | Demande le code de la carte. |
| **En compte** | [Vente à crédit](topic:pos-on-account) | Demande un client avec un compte. |
| **Avoir** | [Crédit magasin](topic:pos-on-account) | Apparaît si le client a un avoir. |

Les noms des modes sont réglés par le magasin (voir [Modes de paiement](topic:settings-payment-methods)) ; ils peuvent donc différer.

> **Astuce :** pour retirer un paiement ajouté par erreur, cliquez sur sa corbeille dans la liste.

> **Attention :** si la fenêtre **Approbation du gérant requise** s'ouvre après **Encaisser**, le panier contient une action réservée (prix modifié, grosse remise…). Voir [Faire approuver par un responsable](topic:approvals).

Hors ligne, la fenêtre affiche en orange : « Hors ligne — la vente sera enregistrée sur cet appareil et envoyée plus tard. » Les espèces, la carte et MonCash restent possibles ; les points, cartes cadeaux, ventes en compte et avoirs demandent une connexion.
