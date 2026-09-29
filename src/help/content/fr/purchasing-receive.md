---
id: purchasing-receive
title: Réceptionner une livraison fournisseur
category: Achats
order: 1003
routes: [/admin/purchasing]
keywords: [réception, livraison, réceptionner la marchandise, partiellement reçu, GRN, bon de livraison, endommagé, clôture partielle, réception hors commande]
related: [purchasing-orders, purchasing-invoices, inventory-receive]
---
1. Ouvrez le bon de commande au statut **Émis** ou **Partiellement reçu**.
2. Cliquez sur **Réceptionner la marchandise**.
3. Dans **Reçu maintenant**, saisissez les unités arrivées en bon état.
4. Dans **Endommagé**, saisissez les unités abîmées. Cochez **Accepter en stock** seulement si vous les gardez.
5. Vérifiez le **Coût unitaire** et saisissez le **Numéro de bon de livraison / facture**.
6. Cliquez sur **Réceptionner**.

Si tout n'est pas arrivé, la commande passe **Partiellement reçu** : le reste sera réceptionné à la prochaine livraison. Chaque réception reçoit un numéro (GRN-…) visible dans **Réceptions de marchandises**.

> **Attention :** recevoir plus que la quantité commandée n'est accepté que dans la tolérance du magasin. Au-delà, une personne avec la permission **Approuver les bons de commande** doit l'autoriser.

> **Astuce :** si le fournisseur ne livrera jamais le reste, cliquez sur **Clôture partielle** et indiquez la raison. Pour une livraison sans bon de commande, utilisez **Réception hors commande** dans l'onglet **Bons de commande** (permission spécifique).
