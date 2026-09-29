---
id: pos-payment-card
title: Payer par carte, MonCash ou virement
category: Caisse
order: 213
routes: [/pos]
keywords: [carte, carte bancaire, terminal, TPE, MonCash, paiement mobile, virement, référence, code d'autorisation]
related: [pos-payment, card-settlements, settings-payment-methods]
---
1. Cliquez sur **Card**, **MonCash** ou **Bank transfer**.
2. Vérifiez le montant (ces modes prennent le montant exact).
3. Si le champ **Référence** apparaît, tapez le code d'autorisation du terminal ou le numéro de transaction MonCash.
4. Cliquez sur **Ajouter**, puis sur **Finaliser la vente**.

> **Attention :** vérifiez toujours sur le téléphone du client ou sur le terminal que le paiement est accepté avant de cliquer sur **Ajouter**. Sans référence, l'application refuse le paiement (« MonCash nécessite une référence »).

## Avec un terminal de carte relié

Si le magasin a relié un terminal de paiement, vous ne tapez pas de code : la carte est débitée quand vous finalisez la vente. La fenêtre **Paiement par carte** suit l'opération :

- attendez que le client présente sa carte ;
- si la réponse tarde, cliquez sur **Vérifier maintenant** ;
- en cas d'échec, cliquez sur **Réessayer** ou choisissez **Annuler la vente**.

Si le client annule sur le terminal, la vente n'est pas enregistrée mais le panier reste : prenez un autre paiement.

> **Astuce :** les paiements par carte sont ensuite rapprochés des relevés de la banque dans [Règlements par carte](topic:card-settlements).
