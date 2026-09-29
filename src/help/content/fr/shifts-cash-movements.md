---
id: shifts-cash-movements
title: Entrées, sorties, dépôts au coffre et ouverture du tiroir
category: Sessions de caisse
order: 302
routes: [/pos]
keywords: [entrée d'espèces, sortie d'espèces, dépôt au coffre, coffre, tiroir, ouvrir le tiroir, sans vente, mouvement, petite caisse]
related: [shifts-open, shifts-close, approvals]
---
Tout mouvement d'espèces hors vente doit être enregistré ; sinon le tiroir sera faux à la clôture.

## Consulter la session en cours

Cliquez sur le bouton de session (par exemple **SH-000004 · Ouverte**). La fenêtre **Session et tiroir-caisse** montre le calcul du tiroir :

![La session en cours](shot:shift-panel)

| Ligne | Signification |
| --- | --- |
| **Fonds de caisse** | Montant compté à l'ouverture. |
| **Ventes en espèces (monnaie déduite)** | Espèces encaissées, moins la monnaie rendue. |
| **Entrée d'espèces** | Espèces ajoutées en cours de journée. |
| **Sortie d'espèces** | Espèces retirées pour une petite dépense. |
| **Dépôts au coffre** | Espèces transférées du tiroir vers le coffre. |
| **Paiements de dépenses** | Dépenses payées avec l'argent du tiroir. |
| **Attendu dans le tiroir** | Ce qui devrait se trouver dans le tiroir maintenant. |

## Enregistrer un mouvement

1. Dans la fenêtre de la session, cliquez sur **Entrée d'espèces**, **Sortie d'espèces** ou **Dépôt au coffre**.
2. Saisissez le **Montant** et le **Motif** (au moins 2 caractères).
3. Si vous avez un numéro de sac ou de reçu, saisissez-le dans **Référence (facultatif)**.
4. Cliquez sur **Enregistrer**.

> **Attention :** le caissier n'a pas le droit de faire ces mouvements seul : la fenêtre **Approbation du gérant requise** s'ouvre après **Enregistrer**. Le gérant saisit ses identifiants et clique sur **Approuver** (voir [Faire approuver par un responsable](topic:approvals)).

## Ouvrir le tiroir sans vente

Pour faire de la monnaie à un client, par exemple. Chaque ouverture est enregistrée avec votre nom et un motif.

1. Cliquez sur **Ouvrir le tiroir** dans la barre du haut (sur téléphone : **⋯** puis **Ouvrir le tiroir**).
2. Saisissez le **Motif**, par exemple « Monnaie pour un client ».
3. Cliquez sur **Enregistrer et ouvrir**, lisez le message, puis cliquez sur **Terminé**.

- **Enregistré. Le tiroir est ouvert.** : le tiroir branché s'est ouvert.
- **Enregistré. Aucun matériel connecté : ouvrez le tiroir avec sa clé.** : aucun tiroir n'est relié à ce poste.

> **Astuce :** le bouton **Ouvrir le tiroir** n'apparaît que lorsque la session est ouverte. Si le tiroir n'a pas répondu, l'ouverture est quand même enregistrée.
