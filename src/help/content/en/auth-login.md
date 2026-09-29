---
id: auth-login
title: Sign in
category: Getting started
order: 101
public: true
routes: [/auth/login, /]
keywords: [sign in, log in, login, username, password, email, account, locked, locked out, invalid credentials]
related: [auth-mfa, faq-account, language, getting-started-roles]
---
Each employee has their own account: an email address and a password. Never share your account: every sale, every discount and every drawer opening is recorded under your name.

![Sign-in page in English](shot:auth-login)

1. Open the app's address in the browser (Chrome is best).
2. At the top right, click **EN** to show the app in English.
3. Enter your address in the **Email** field.
4. Enter your password in the **Password** field.
5. Click **Sign in**.

If two-factor authentication is turned on for your account, the app then asks for a 6-digit code (see [Enter the two-factor authentication code](topic:auth-mfa)).

## Where do you land after signing in?

| Role | Landing page |
| --- | --- |
| Cashier, manager, administrator, owner | The till screen. The **Admin** button opens store management. |
| Accountant | The admin **Dashboard** (accountants do not sell). |
| Stock clerk | The admin **Inventory** (stock clerks do not sell). |

You stay signed in on this device thanks to a secure cookie: you do not need to sign in again each time you open the app. Click **Sign out** before handing the device to a coworker.

## Error messages

- **Invalid credentials**: the address or the password is wrong. Check what you typed (Caps Lock key) and try again.
- **Too many failed attempts. This account is locked for a few minutes.**: after 5 wrong tries in a row, the account is locked for 15 minutes. See [Account locked or forgotten password](topic:faq-account).
- **Too many attempts. Wait a few minutes and try again.**: too many sign-ins from this device in a short time. Wait a little.

> **Warning:** each new wrong try during the lock extends it. Wait without trying again.

> **Tip:** if the link **New here? Create a store** appears under the form, this server lets you create a new store (see [Create your store](topic:auth-signup)).
