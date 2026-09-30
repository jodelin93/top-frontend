---
id: pos-payment-cash-change
title: Espèces en dollars ou en gourdes et monnaie à rendre
category: Caisse
order: 212
routes: [/pos]
keywords: [espèces, cash, monnaie, rendre la monnaie, à rendre, gourdes, HTG, dollars, USD, taux, billets]
related: [pos-payment, settings-exchange-rate, pos-receipt, shifts-close]
---
1. Dans **Le client paie en**, choisissez **USD** ou **HTG**.
2. Cliquez sur **Cash**.
3. Cliquez sur l'un des montants proposés (montant exact ou billets ronds), ou tapez le montant reçu puis cliquez sur **Ajouter**.
4. Le cadre vert **À RENDRE AU CLIENT** apparaît. Il montre la monnaie en USD et en HTG.
5. Touchez la devise dans laquelle vous rendez la monnaie : elle s'affiche en grand.
6. Cliquez sur **Finaliser la vente · rendre …**.

![Paiement en espèces avec la monnaie à rendre](shot:pos-payment-cash)

Payer en gourdes affiche la conversion, par exemple « = 45,28 $US ». Après la vente, la fenêtre **Vente terminée** rappelle en grand la monnaie à rendre (**Encaissé**, **Total de la vente**, **À rendre**), ou « Montant exact : pas de monnaie à rendre ».

Deux taux s'appliquent. Le montant demandé en gourdes et la valeur des gourdes reçues utilisent le **taux de vente**. La monnaie rendue en gourdes pour des dollars utilise le **taux d'achat**. Si le client a payé en gourdes, la monnaie en gourdes se calcule directement (2 000 HTG donnés pour 1 350 HTG dus : on rend 650 HTG). Les deux taux s'affichent sous les totaux, par exemple « 1 USD = 135 HTG (vente) · 130 HTG (achat) ».

> **Attention :** vérifiez que le client paie bien dans la devise choisie. Le taux utilisé est celui du jour, fixé dans l'administration (voir [Taux de change](topic:settings-exchange-rate)). La monnaie rendue ne peut jamais dépasser les espèces reçues.

> **Astuce :** les espèces encaissées (moins la monnaie rendue) sont ajoutées à votre session de caisse et seront attendues au comptage de fin de session.
