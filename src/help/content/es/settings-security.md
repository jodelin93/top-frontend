---
id: settings-security
title: Sin conexión y seguridad
category: Configuración
order: 1310
routes: [/admin/settings?tab=security, /admin/settings]
keywords: [sin conexión, offline, duración sin conexión, límites sin conexión, seguridad, autenticación de dos factores obligatoria, 2FA, administradores, entra en vigor]
related: [offline-mode, account-2fa, settings-history]
---
1. Abra la pestaña **Sin conexión y seguridad**.
2. Configure el **Período de venta sin conexión (horas)**: después de ese tiempo sin conexión, la caja se bloquea.
3. Si lo necesita, configure **Venta sin conexión máxima**, **Ventas sin conexión por período** y **Total de ventas sin conexión por período** (0 = sin límite).
4. Marque **Exigir autenticación de dos factores a los administradores** si desea imponerla.
5. En **Entra en vigor**, déjelo vacío para aplicar de inmediato, o elija una fecha futura.
6. Agregue una **Nota (opcional)** y haga clic en **Guardar**.

![La pestaña Sin conexión y seguridad](shot:settings-security)

| Ajuste | Significado |
| --- | --- |
| **Período de venta sin conexión (horas)** | Cuánto tiempo puede vender una caja sin conexión. |
| **Venta sin conexión máxima** | Por encima de este monto, la venta se registra pero se envía a la [Cola de revisión](topic:review-queue). |
| **Ventas sin conexión por período** | Número máximo de ventas sin conexión antes de tener que volver a conectarse. |
| **Total de ventas sin conexión por período** | Monto total máximo vendido sin conexión. |

Cuando la autenticación de dos factores es obligatoria, las personas que administran los usuarios, los roles, la configuración o el registro de auditoría deben activarla: mientras no lo hagan, llegan a **Seguridad de la cuenta** al iniciar sesión.

> **Atención:** avise a los administradores antes de marcar esta casilla: cada uno debe tener una aplicación de autenticación en su teléfono (vea [Activar la autenticación de dos factores](topic:account-2fa)).
