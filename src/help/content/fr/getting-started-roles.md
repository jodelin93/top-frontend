---
id: getting-started-roles
title: Comprendre les rôles
category: Premiers pas
order: 104
routes: []
keywords: [rôle, droits, permissions, caissier, gérant, propriétaire, administrateur, comptable, magasinier, accès]
related: [roles-permissions, approvals, users-manage]
---
Chaque utilisateur reçoit un rôle. Le rôle décide des menus visibles et des actions permises. Les rôles se consultent dans **Administration** > **Rôles et autorisations** (propriétaire et administrateur).

| Rôle | Pour qui | Ce qu'il peut faire | Ce qu'il ne peut pas faire |
| --- | --- | --- | --- |
| **Propriétaire** | Le patron du magasin | Tout, y compris gérer les autres propriétaires. Ce rôle ne se modifie pas. | — |
| **Administration** | Le bras droit du propriétaire | Tout gérer : ventes, stock, paramètres, comptes du personnel, rôles, appareils. | Modifier ou retirer un propriétaire. |
| **Gérant** | Le chef de magasin au quotidien | Vendre, annuler, rembourser, gérer toutes les sessions de caisse, approuver écarts, remises et prix, gérer produits, stock, achats, clients, rapports, paramètres. | Gérer les comptes du personnel, les rôles, les appareils et la surveillance système. |
| **Caissier** | Le personnel de caisse | Vendre, remiser jusqu'à la limite du magasin, mettre en attente, ouvrir et clôturer sa session, enregistrer des dépenses, chercher et créer des clients, faire des devis, voir le stock, réimprimer un reçu. | Changer un prix, dépasser la limite de remise, vendre à crédit, faire des mouvements d'espèces, rembourser, annuler. Ces actions demandent l'[approbation d'un gérant](topic:approvals). |
| **Inventory clerk** (magasinier) | La personne du stock | Réceptionner, ajuster, compter, transférer le stock, gérer fournisseurs, bons de commande et produits. | Vendre : il n'a pas accès à la caisse. |
| **Accountant** (comptable) | Le comptable | Tableau de bord, rapports et exports, ventes (lecture), dépenses, règlements par carte, journal d'audit. | Vendre ou modifier les ventes. |

> **Astuce :** quand un caissier tente une action réservée, la fenêtre **Approbation du gérant requise** s'ouvre. Un responsable saisit ses identifiants sur place ; l'approbation ne vaut qu'une fois, pour cette action.

> **Astuce :** si une page vous manque dans le menu, ce n'est pas une panne : votre rôle n'y donne pas accès. Demandez à l'administrateur.
