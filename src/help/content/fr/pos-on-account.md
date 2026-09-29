---
id: pos-on-account
title: Vente à crédit (en compte) et avoir du client
category: Caisse
order: 216
routes: [/pos]
keywords: [crédit, en compte, compte client, limite de crédit, avoir, crédit magasin, store credit, crédit bloqué]
related: [customers-accounts, pos-customer, returns-pos, approvals]
---
## Vendre en compte

La vente **En compte** est portée sur le compte du client, qui paiera plus tard. Elle est réservée aux clients qui ont un compte et une limite de crédit.

1. [Choisissez le client](topic:pos-customer) avant d'encaisser.
2. Dans **Paiement**, cliquez sur **En compte**.
3. Le message « Porté au compte de … » s'affiche. Vérifiez le montant, puis cliquez sur **Ajouter**.
4. Cliquez sur **Finaliser la vente**.


> **Attention :** le caissier doit obtenir l'approbation d'un gérant pour une vente en compte. Au-delà de la limite de crédit, une autorisation supplémentaire est nécessaire. Un client en **Crédit bloqué** ne peut plus acheter en compte.

> **Astuce :** sans client choisi, le bouton **En compte** affiche **Ajoutez d'abord un client**.

## Payer avec l'avoir du client

Un avoir est un crédit gardé par le magasin, par exemple après un [retour remboursé en avoir](topic:returns-pos).

1. Choisissez le client.
2. Dans **Paiement**, cliquez sur **Avoir** : le bouton affiche le montant disponible.
3. Cliquez sur **Ajouter**, puis complétez avec un autre paiement si besoin.

> **Astuce :** le bouton **Avoir** n'apparaît que si le client choisi a un avoir. Les deux modes demandent une connexion.

Les soldes et versements se suivent dans [Comptes clients](topic:customers-accounts).
