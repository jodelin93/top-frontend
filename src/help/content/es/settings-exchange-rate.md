---
id: settings-exchange-rate
title: El tipo de cambio USD / HTG
category: Configuración
order: 1302
routes: [/admin/settings, /admin/dashboard]
keywords: [tasa de venta, tasa de compra, tipo de cambio, tasa de cambio, moneda, divisa, dólar, gourde, USD, HTG, conversión, actualizar el tipo de cambio, historial de tipos de cambio]
related: [pos-payment-cash-change, dashboard, settings-general]
---
La tienda tiene dos tasas entre el dólar y el gourde. La tarjeta **Tipos de cambio** está arriba en el **Panel** y en la pestaña **General** de la configuración. Muestra las dos tasas.

![La tarjeta Tipos de cambio](shot:settings-exchange-rate)

| Tasa | Sirve para | Ejemplo |
| --- | --- | --- |
| **Tasa de venta** | Convertir **gourdes en dólares**: un cliente que paga en HTG (el monto pedido y el valor recibido), una entrada o una diferencia en HTG. | 1 USD = 135 HTG: un artículo de 10 USD cuesta 1.350 HTG. |
| **Tasa de compra** | Convertir **dólares en gourdes**: el cambio entregado en HTG cuando el cliente pagó en dólares. | 1 USD = 130 HTG: 10 USD de cambio son 1.300 HTG. |

Cuando el cliente paga en gourdes y recibe el cambio en gourdes, el cambio se calcula directamente en gourdes, sin diferencia de tasa: 2.000 HTG entregados por 1.350 HTG debidos, se devuelven 650 HTG.

## Cuando la tienda trabaja en gourdes

Las tasas siempre se escriben con la moneda de la tienda primero:

| Moneda de la tienda | La tasa se escribe | Pago en la otra moneda |
| --- | --- | --- |
| Dólares (USD) | 1 USD = 135 HTG | Un cliente que paga en HTG: **tasa de venta**. Cambio entregado en HTG: **tasa de compra**. |
| Gourdes (HTG) | 135 HTG = 1 USD | Un cliente que paga en USD: **tasa de compra**. Cambio entregado en USD: **tasa de venta**. |

Los nombres no cambian: la tasa de venta cambia gourdes a dólares, la tasa de compra cambia dólares a gourdes. En una tienda en gourdes, un cliente que paga 10 USD a la tasa de compra de 130 HTG = 1 USD ha pagado 1.300 HTG.

## Cambiar las tasas

1. En la tarjeta **Tipos de cambio**, haga clic en **Actualizar tipo de cambio**.
2. Escriba la **Tasa de venta** y la **Tasa de compra**, por ejemplo 135 y 130: la cantidad de gourdes por un dólar, sea cual sea la moneda de la tienda. Deje una vacía para usar la misma tasa para ambas.
3. Para aceptar otra moneda, haga clic en **Otra moneda** (o **Agregar una moneda** si solo se acepta una moneda).
4. Haga clic en **Guardar tipos de cambio** (o **Cancelar**).

Las nuevas tasas se aplican de inmediato a las ventas nuevas. Las ventas ya hechas conservan sus tasas; una devolución sigue la tasa de la venta original.

> **Atención:** revise las tasas cada mañana antes de abrir las cajas. Una tasa equivocada falsea los montos pedidos y el cambio entregado en HTG.

> **Consejo:** **Historial** muestra las tasas de venta y de compra anteriores, con la fecha y quién las cambió.
