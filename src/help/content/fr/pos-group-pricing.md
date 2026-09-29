---
id: pos-group-pricing
title: Prix et remise de groupe du client
category: Caisse
order: 208
routes: [/pos]
keywords: [groupe, remise de groupe, liste de prix, grossiste, VIP, membre, prix de groupe, tarif]
related: [customers-groups, price-lists, pos-customer, pos-discounts]
---
Un client peut appartenir à un **groupe** (par exemple Grossistes ou VIP). Le groupe peut avoir une **liste de prix par défaut** et une **remise %** (voir [Groupes de clients](topic:customers-groups)).

À la caisse, tout est automatique :

1. [Choisissez le client](topic:pos-customer) (F4).
2. Le panier est recalculé avec les prix de la liste du groupe. Un message le confirme, par exemple « Groupe Grossistes : prix du groupe et remise de groupe de 5 % appliqués. »
3. La remise apparaît dans les totaux sur la ligne **Remise de groupe (Grossistes, 5 %)**, puis sur le reçu.

Aucune approbation n'est demandée : ces prix ont été décidés par le magasin pour ce groupe. Il n'y a pas de liste de prix à choisir à la main.

> **Astuce :** retirer le client (revenir au client de passage) remet aussitôt les prix normaux.

> **Attention :** un panier chargé depuis un devis garde les prix négociés du devis (voir [Devis](topic:estimates)).

> **Astuce :** les produits absents de la liste du groupe gardent leur prix normal ; la remise % du groupe s'applique quand même à eux.
