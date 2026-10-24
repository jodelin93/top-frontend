---
id: orders
title: Suivre les commandes et leurs acomptes
category: Ventes et dépenses
order: 608
routes: [/admin/orders]
keywords: [commandes, acompte, avance, reste à payer, retrait, prête, annulée, rembourser acompte, conserver acompte, rapport acomptes]
related: [pos-orders, shifts-admin, reports-overview]
---
La page **Commandes** liste les services préparés pour des clients qui ont versé un acompte. Chaque commande montre son **Total**, ses **Acomptes versés**, le **Reste à payer**, la date **Prête pour le** et son statut : **En préparation**, **Prête**, **Retirée** ou **Annulée**.

1. Choisissez un statut (par défaut **En attente du client** : en préparation ou prête).
2. Cherchez par numéro de commande, nom ou téléphone du client.
3. Cliquez sur une commande pour voir ses lignes, chaque acompte (date, mode, qui l’a pris) et son historique.

Depuis une commande, vous pouvez **Imprimer** le reçu de commande, **Ajouter un acompte**, **Marquer prête** ou **Annuler la commande**. Le client la retire en caisse : **Commandes**, puis **Retirer : encaisser le reste**.

## Où apparaît l’argent

- **Session de caisse** : un acompte en espèces est une entrée d’espèces de la session qui l’a pris. Chaque acompte est listé sous **Acomptes sur commandes** dans la session et sur le rapport Z.
- **Rapports** : le rapport **Acomptes sur commandes** liste chaque acompte et remboursement. **Paiements par mode** compte les acomptes quand ils sont versés.
- **Ventes** : la vente est comptée au retrait, pour le total complet. Sa ligne **Acompte versé** n’est pas recomptée comme argent reçu.

## Annuler une commande

Cliquez sur **Annuler la commande**, tapez le motif et choisissez **Rembourser les acomptes** ou **Conserver les acomptes**. Un remboursement en espèces sort d’une session ouverte sur une caisse de la succursale de la commande. Annuler demande la permission « Annuler des commandes et rembourser ou conserver leurs acomptes », ou l’approbation d’un responsable.

> **Note :** le personnel d’une succursale ne voit que les commandes de ses succursales. Les commandes sont pour les articles non suivis en stock (services).
