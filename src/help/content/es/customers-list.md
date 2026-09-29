---
id: customers-list
title: Buscar y crear un cliente
category: Clientes
order: 1101
routes: [/admin/customers, /admin/customers?tab=customers]
keywords: [cliente, clientes, nuevo cliente, persona física, particular, empresa, consentimiento de marketing, correo electrónico, SMS, límite de crédito, duplicado, repetido]
related: [customers-profile, customers-groups, customers-privacy, pos-customer]
---
La página **Administración** > **Clientes** está reservada a las personas que pueden modificar clientes (propietario, administrador, gerente). Los cajeros buscan y agregan clientes desde la caja. Las pestañas son **Clientes**, **Posibles duplicados**, **Grupos** y **Campos personalizados**.

![La lista de clientes](shot:admin-customers)

## Buscar

1. Escriba un nombre, un código, un correo electrónico o un teléfono en la búsqueda.
2. Si es necesario, filtre por estado (**Activo**, **Inactivo**, **Bloqueado**) o por grupo.
3. La tabla muestra el grupo, los **Puntos** y la fecha de la **Última compra**.
4. Haga clic en el ojo para abrir la [ficha](topic:customers-profile), o en el lápiz para modificarla.

## Crear un cliente

1. Haga clic en **Nuevo cliente**.
2. Elija el **Tipo**: **Persona física** o **Empresa**. Deje el **Código** vacío: se creará automáticamente.
3. Escriba **Nombre**, **Apellido** (o el nombre de la empresa), **Correo electrónico** y **Teléfono**. La fecha de nacimiento, opcional, no puede ser futura ni anterior a 1900.
4. Para un cliente con crédito, escriba el **Límite de crédito** y las **Condiciones de pago (días)**.
5. Elija el **Grupo** del cliente (sus precios de grupo se aplicarán en la caja).
6. En **Consentimiento de marketing**, marque **Acepta correos electrónicos de marketing** y/o **Acepta SMS de marketing** solo si el cliente está de acuerdo, y luego indique **¿Cómo se otorgó el consentimiento?**.
7. Haga clic en **Crear cliente**.

![El formulario Nuevo cliente](shot:customer-form)

> **Atención:** nunca envíe mensajes publicitarios a un cliente que no haya dado su consentimiento. Cada cambio de consentimiento queda fechado y guardado en el **Historial** del consentimiento.

> **Consejo:** si ya existe un cliente con el mismo correo electrónico o teléfono, la aplicación le avisa antes de crearlo.
