---
id: products-import
title: Enpòte pwodui (CSV)
category: Katalòg
order: 806
routes: [/admin/import]
keywords: [enpòte, enpote, enpòtasyon, CSV, fichye, tablo, modèl, model, mizajou an mas, kolòn, kolon, import, importer, fichier, tableur, modèle, mise à jour en masse, colonnes]
related: [products-list, categories]
---
Enpòtasyon an kreye oswa mete ajou anpil pwodui apati yon fichye CSV. Ou toujou wè chanjman yo anvan yo anrejistre. Ou bezwen pèmisyon **Enpòte pwodui apati yon CSV**.

![Paj Enpòte pwodui a](shot:admin-import)

1. Nan meni an, klike sou **Enpòte**.
2. Klike sou **Telechaje modèl la** pou jwenn yon fichye ak bon kolòn yo.
3. Ranpli fichye a nan yon tablo (tableur), epi anrejistre l an CSV UTF-8 (5 000 liy ak 2 Mo pou pi plis).
4. Chwazi sa ki pral rive **Pwodui ki egziste (menm SKU)** yo: **Mete enfòmasyon yo ajou** oswa **Kite yo jan yo ye**.
5. Koche **Ranplase pri ak pri revyen yo tou** sèlman si fichye a gen nouvo pri yo.
6. Klike sou **Chwazi fichye** epi chwazi CSV ou a.
7. Verifye rezime a: **Nouvo pwodui**, **Mizajou**, **Pa gen chanjman** ak **Liy ki gen erè**.
8. Korije liy ki gen erè yo si sa nesesè, epi klike sou **Enpòte N pwodui**.

Kolòn prensipal yo:

- **sku** (obligatwa): rekonèt pwodui ki egziste deja yo;
- **name**: obligatwa pou yon nouvo pwodui;
- **category_code** ak **tax_category_code**: kòd ki egziste deja;
- **price** ak **cost**: pwodui senp sèlman, ak yon pwen desimal (egz. 4.50);
- **product_type**: simple, variable oswa composite;
- **status**: active, inactive oswa discontinued.

> **Konsèy:** yon selil ki vid kite valè ki la deja a jan l ye.

> **Atansyon:** aplikasyon an pa pran kolòn allow_backorder la an kont: li pa janm otorize vann lè stòk la anba zewo.
