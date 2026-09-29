---
id: expenses-approve
title: Approuver, rejeter et payer une dépense
category: Ventes et dépenses
order: 605
routes: [/admin/expenses]
keywords: [approuver, rejeter, dépense soumise, payer, marquer comme payée, deuxième personne, approbation, seuil]
related: [expenses-create, approvals, shifts-cash-movements]
---
Statuts d'une dépense : **brouillon**, **soumise**, **approuvée**, **rejetée**, **payée**.

## Approuver ou rejeter

1. La personne chargée des approbations (gérant ou comptable) ouvre **Dépenses** et repère les lignes **soumise**.
2. Elle clique sur **Approuver**, ou sur **Rejeter** en indiquant le **Motif**.

> **Attention :** une dépense doit être approuvée par une autre personne que celle qui l'a enregistrée ou soumise, même s'il s'agit du propriétaire. Si c'est votre dépense, cliquez quand même sur **Approuver** : la fenêtre **Approbation du gérant requise** s'ouvre et une autre personne autorisée y saisit son **E-mail du gérant**, son **Mot de passe** (et son code à deux facteurs si besoin), puis clique sur **Approuver**. C'est elle qui est enregistrée comme approbatrice.


Une dépense rejetée peut être modifiée et soumise de nouveau par la personne qui l'a enregistrée.

## Payer

1. Sur la ligne de la dépense **approuvée**, cliquez sur **Payer**.
2. Dans **Payé depuis la caisse**, choisissez la caisse dont sort l'argent, ou **Hors caisse (petite caisse)**.
3. Saisissez une **Référence du paiement (facultatif)**.
4. Cliquez sur **Marquer comme payée**. La dépense passe au statut **payée**.

> **Attention :** les espèces payées depuis une caisse sont enregistrées comme une sortie dans la session ouverte de cette caisse ; sans session ouverte, le paiement est refusé. La sortie apparaîtra au comptage de fin de session.
