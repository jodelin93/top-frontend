---
id: auth-login
title: Iniciar sesión
category: Primeros pasos
order: 101
public: true
routes: [/auth/login, /]
keywords: [inicio de sesión, iniciar sesión, entrar, ingresar, login, usuario, contraseña, clave, correo electrónico, cuenta, bloqueada, credenciales no válidas]
related: [auth-mfa, faq-account, language, getting-started-roles]
---
Cada empleado tiene su propia cuenta: un correo electrónico y una contraseña. Nunca comparta su cuenta: cada venta, cada descuento y cada apertura de cajón queda registrada a su nombre.

![Página de inicio de sesión](shot:auth-login)

1. Abra la dirección de la aplicación en el navegador (de preferencia Chrome).
2. Arriba a la derecha, haga clic en **ES** para mostrar la aplicación en español.
3. Escriba su dirección en el campo **Correo electrónico**.
4. Escriba su contraseña en el campo **Contraseña**.
5. Haga clic en **Iniciar sesión**.

Si la autenticación de dos factores está activada en su cuenta, la aplicación le pide después un código de 6 dígitos (vea [Ingresar el código de autenticación de dos factores](topic:auth-mfa)).

## ¿A dónde se llega después de iniciar sesión?

| Rol | Página de llegada |
| --- | --- |
| Cajero, gerente, administrador, propietario | La pantalla de caja. El botón **Administración** lleva a la gestión de la tienda. |
| Contador | El **Panel** de la administración (no vende). |
| Almacenista | El **Inventario** de la administración (no vende). |

La sesión permanece activa en este dispositivo gracias a una cookie segura: no necesita volver a iniciar sesión cada vez que abre la aplicación. Haga clic en **Cerrar sesión** antes de dejar el dispositivo a un compañero.

## Mensajes de error

- **Credenciales no válidas**: el correo o la contraseña son incorrectos. Revise lo que escribió (tecla Mayúsculas) y vuelva a intentarlo.
- **Demasiados intentos fallidos. Esta cuenta está bloqueada durante unos minutos.**: después de 5 intentos fallidos seguidos, la cuenta queda bloqueada 15 minutos. Vea [Cuenta bloqueada o contraseña olvidada](topic:faq-account).
- **Demasiados intentos. Espere unos minutos e inténtelo de nuevo.**: demasiados inicios de sesión desde este dispositivo en poco tiempo. Espere un momento.

> **Atención:** cada nuevo intento fallido durante el bloqueo lo prolonga. Espere sin volver a intentarlo.

> **Consejo:** si el enlace **¿Es nuevo? Crear una tienda** aparece debajo del formulario, este servidor permite crear una tienda nueva (vea [Crear su tienda](topic:auth-signup)).
