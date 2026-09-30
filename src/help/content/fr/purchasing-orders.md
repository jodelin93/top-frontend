---
id: purchasing-orders
title: Créer et faire approuver un bon de commande
category: Achats
order: 1002
routes: [/admin/purchasing, /admin/purchasing?tab=orders]
keywords: [bon de commande, commande fournisseur, achat, soumettre, approuver, seuil, émis, livraison prévue, imprimer]
related: [purchasing-receive, purchasing-suppliers, approvals]
---
![L'onglet Bons de commande](shot:purchasing-orders)

## Créer le brouillon

1. Dans **Bons de commande**, cliquez sur **Nouvelle commande**.
2. Choisissez le **Fournisseur** et l'emplacement **Livrer à**.
3. Vérifiez la **Livraison prévue** (calculée avec le délai du fournisseur ; elle ne peut pas être dans le passé).
4. Cherchez chaque produit et cliquez sur **Ajouter**. Saisissez la **Quantité** et le **Coût unitaire**, et si besoin une remise (**Rem. %**) ou une **Taxe**.
5. Complétez la **Taxe de commande**, la **Livraison** (frais de transport) et la **Référence fournisseur**.
6. Ajoutez des **Notes (imprimées sur la commande)**.
7. Cliquez sur **Enregistrer le brouillon**.

## Soumettre et faire approuver

1. Ouvrez le bon en cliquant sur sa ligne, puis cliquez sur **Soumettre**.
2. Sous le seuil d'approbation du magasin, la commande est approuvée automatiquement. Au-dessus, elle passe **À approuver**.

> **Attention :** une commande au-dessus du seuil doit être approuvée par une autre personne que son créateur, avec la permission **Approuver les bons de commande**. Même le propriétaire ne peut pas approuver sa propre commande.

Pour approuver : le gérant ouvre la commande depuis son compte et clique sur **Approuver** ; ou, s'il est présent, le créateur clique sur **Approuver** et le gérant saisit ses identifiants dans la fenêtre **Approbation du gérant requise**.

> **Astuce :** **Renvoyer** remet la commande en brouillon avec une raison. Après l'approbation, cliquez sur **Marquer comme émis** quand la commande est envoyée au fournisseur. **Imprimer** produit la commande en PDF ou sur papier.

> **Astuce :** une commande est dans la devise du fournisseur (par exemple HTG). À la réception, les coûts en gourdes entrent dans le stock convertis en dollars au taux de vente.
