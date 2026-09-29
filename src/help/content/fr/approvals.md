---
id: approvals
title: Faire approuver une action par un responsable
category: Caisse
order: 210
routes: []
keywords: [approbation, approuver, gérant, responsable, autorisation, identifiants, deuxième personne, refusé]
related: [getting-started-roles, pos-discounts, pos-price-change, faq-till, expenses-approve]
---
Quand une personne tente une action qu'elle n'a pas le droit de faire seule, la fenêtre **Approbation du gérant requise** s'ouvre. Elle indique l'autorisation qui manque. Un responsable présent peut approuver sans que personne ne se déconnecte.


1. Le responsable tape son **E-mail du gérant** et son **Mot de passe**.
2. S'il a activé la double authentification, il tape aussi le **Code à deux facteurs**.
3. Il clique sur **Approuver**. L'action continue normalement.
4. S'il y a plusieurs actions à approuver (un prix et une remise, par exemple), la fenêtre revient pour chacune.

Pour renoncer, cliquez sur **Annuler**.

## Actions qui demandent souvent une approbation

| Action | Qui la demande |
| --- | --- |
| Modifier un prix, remise au-delà de la limite | Caissier, à l'encaissement |
| Vente **En compte** (à crédit), dépassement de la limite de crédit | Caissier |
| Entrée, sortie d'espèces, dépôt au coffre, écart de caisse | Caissier (voir [Sessions](topic:shifts-cash-movements)) |
| Retour hors délai, remboursement sur un autre moyen, annulation | Personne sans le droit |
| Approuver sa propre dépense, son propre bon de commande | Tout le monde, même le propriétaire |
| Gros ajout sur une carte cadeau ou un avoir | Deuxième personne obligatoire |

## Règles

- Le responsable doit avoir lui-même le droit demandé.
- Il doit être une autre personne que celle qui fait l'action.
- L'approbation sert une seule fois, pour cette action seulement, et vaut 2 minutes.
- Chaque approbation est inscrite au [journal d'audit](topic:audit-log), avec le nom du responsable (**Approuvé par**).

> **Attention :** le responsable ne donne jamais son mot de passe : il le tape lui-même dans la fenêtre.
