---
id: faq-till
title: "Questions fréquentes : à la caisse"
category: Questions fréquentes
order: 1601
routes: [/pos]
keywords: [problème, remise refusée, approbation refusée, stock insuffisant, stock négatif, produit introuvable, caisse ne vend pas, session]
related: [approvals, pos-discounts, inventory-adjust, shifts-open]
---
## Le caissier ne peut pas appliquer une remise

Un caissier peut accorder une remise jusqu'à la limite du magasin ; au-delà, il doit écrire un motif, et la fenêtre **Approbation du gérant requise** s'ouvre au moment d'encaisser. Un gérant présent tape son e-mail et son mot de passe, puis clique sur **Approuver** (voir [Faire approuver](topic:approvals)). Si aucun responsable n'est là, réduisez la remise ou mettez le panier en attente.

## La fenêtre d'approbation refuse le responsable

- Le responsable doit avoir lui-même le droit demandé : un autre caissier ne peut pas approuver.
- Il ne doit pas être la personne connectée : on ne s'approuve pas soi-même.
- S'il a la double authentification, il doit taper le code à 6 chiffres.
- L'approbation vaut 2 minutes et une seule action : recommencez si le délai est dépassé.

## « Stock insuffisant » ou « Seulement … en stock »

La caisse refuse de vendre plus que le stock disponible. Vérifiez le rayon et la réserve. Si le stock réel est plus élevé, un responsable [ajuste le stock](topic:inventory-adjust), puis la vente peut continuer. Hors ligne, la vente est acceptée mais un dossier s'ouvre dans la [File de contrôle](topic:review-queue).

## La caisse refuse de vendre

- La session n'est pas ouverte et le magasin l'exige : [ouvrez la session](topic:shifts-open).
- La session est en **Comptage en cours** : cliquez sur **Reprendre les ventes** ou terminez la clôture.
- L'écran **La vente hors ligne est suspendue** : voir [Vendre hors ligne](topic:offline-mode).

## « Aucun produit trouvé pour … »

Le code-barres scanné n'est rattaché à aucun produit. Cherchez l'article par son nom ; un responsable peut ajouter ce code à la variante (voir [Codes-barres](topic:products-variants)).
