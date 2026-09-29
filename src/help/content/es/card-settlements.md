---
id: card-settlements
title: Conciliar las liquidaciones de tarjeta
category: Ventas y gastos
order: 606
routes: [/admin/payments]
keywords: [liquidaciones de tarjeta, conciliación, conciliar, estado de cuenta, informe, banco, proveedor, adquirente, CSV, lote, comisiones, resolver, terminal de pago, POS de tarjeta]
related: [pos-payment-card, reports-reconciliation]
---
La página **Liquidaciones de tarjeta** compara los informes de su banco o de su proveedor con los pagos con tarjeta cobrados en caja.

![La página Liquidaciones de tarjeta](shot:admin-payments)

## Importar un informe

1. En el menú, haga clic en **Liquidaciones de tarjeta**.
2. En **Importar un informe de liquidación**, elija el **Proveedor**.
3. Agregue una **Referencia del lote (opcional)**, por ejemplo «depósito 2026-09-21».
4. Elija el **Archivo CSV** recibido del proveedor (columnas de referencia, monto, comisiones y fecha).
5. Haga clic en **Importar**. Las líneas se concilian con los pagos por referencia y por monto.

## Resolver lo que queda «Por conciliar»

- **Líneas de liquidación sin pago**: líneas del informe que ningún pago cubre. Elija el pago correspondiente y haga clic en **Conciliar y resolver**, o explique por qué no hay ninguno.
- **Pagos con tarjeta aún no liquidados**: pagos cobrados que todavía no cubre ningún informe. Haga clic en **Resolver**, escriba una **Nota** (por ejemplo «Lote del terminal cerrado con retraso») y luego confirme.

> **Consejo:** al final de la página, **Lotes importados** muestra los informes ya importados, con el número de líneas conciliadas, el bruto y las comisiones. **Terminal de pago por método de pago** indica qué terminal está vinculado a cada método.
