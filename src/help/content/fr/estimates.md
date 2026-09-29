---
id: estimates
title: Créer un devis et le convertir en vente
category: Ventes et dépenses
order: 603
routes: [/admin/estimates]
keywords: [devis, pro forma, estimation, offre de prix, valable jusqu'au, accepté, refusé, vendre en caisse, dupliquer]
related: [pos-group-pricing, sales-history, customers-list]
---
Un devis présente des prix à un client avant l'achat. Il ne réserve pas de stock. La page **Devis** montre chaque devis avec son statut : **Brouillon**, **Envoyé**, **Accepté**, **Refusé** ou **Vendu**.

![La liste des devis](shot:admin-estimates)

## Créer un devis

1. Cliquez sur **Nouveau devis**.
2. Dans **Client**, tapez le nom, le téléphone ou l'e-mail et choisissez le client. Pour une personne absente de vos clients, tapez simplement son nom.
3. Vérifiez **Valable jusqu'au** (30 jours par défaut). Cette date ne peut pas être dans le passé.
4. Dans **Ajouter des produits**, cherchez chaque produit et cliquez sur **Ajouter**.
5. Pour chaque ligne, réglez la **Qté**, le **Prix unitaire** si vous faites un prix spécial, la remise (**Rem. %**) et une **Note**.
6. Ajoutez si besoin une remise sur l'ensemble du devis, des **Notes** et des **Conditions générales** (acompte…).
7. Cliquez sur **Enregistrer le devis**. Les totaux exacts (taxes comprises) sont calculés à l'enregistrement.

## Envoyer le devis et noter la réponse

1. Cliquez sur **Imprimer** (ou enregistrez en PDF), ou sur **Imprimer la pro forma** si le client demande une facture pro forma.
2. Remettez-le au client, puis cliquez sur **Marquer comme envoyé**.
3. Quand le client répond, cliquez sur **Accepté** ou **Refusé**.

> **Astuce :** **Dupliquer** crée un nouveau devis à partir de celui-ci. **Modifier** permet par exemple de prolonger la date de validité.

## Convertir en vente

1. Ouvrez le devis accepté et cliquez sur **Vendre en caisse**.
2. La caisse s'ouvre avec le client et les articles, aux prix du devis. Un bandeau rappelle « Devis … — vendu aux prix du devis ; finaliser la vente le convertit. »
3. Encaissez normalement. Le devis passe au statut **Vendu**.

> **Attention :** un devis expiré ne peut pas être vendu : modifiez-le d'abord pour prolonger **Valable jusqu'au**. Les prix du devis valent une seule fois, pour son client et ses quantités ; des unités en plus sont facturées au prix normal. Si le panier contient déjà des articles, l'application demande de les remplacer.
