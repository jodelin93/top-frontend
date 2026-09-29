---
id: account-2fa
title: Turn on two-factor authentication (2FA)
category: My account
order: 1502
routes: [/account/security]
keywords: [two-factor authentication, 2FA, MFA, two-step verification, QR code, authenticator, authenticator app, 6-digit code, turn on, turn off, enable, disable, new phone, change phone]
related: [auth-mfa, settings-security, account-security]
---
Two-factor authentication adds a 6-digit code shown by an app on your phone. Even if someone steals your password, they cannot sign in without your phone.

First install an authenticator app, for example Google Authenticator, Microsoft Authenticator or 1Password.

1. In **Account security**, in the **Two-factor authentication** section, click **Turn on**.
2. Open the app on your phone and scan the QR code shown.
3. If you cannot scan, type into the app the key shown under **Can't scan? Enter this key manually:**.
4. Type the 6-digit code the app shows.
5. Click **Verify and turn on**.

The **Status** changes to **On**. Each time you sign in, the code is asked for after your password (see [Enter the code](topic:auth-mfa)).

> **Warning:** never show the QR code or the key to anyone else, and never take a photo of them.

> **Tip:** to stop before the end, click **Cancel**: nothing is turned on until you click **Verify and turn on**.

To turn it off, click **Turn off** and type a current code from the app. To change phones, turn it off with the old phone, then turn it on with the new one.

> **Warning:** if the store requires two-factor authentication for administrators (see [Offline and security](topic:settings-security)), those people land on this page when they sign in, with the message **Two-factor authentication is required**, and must turn it on before doing anything else.
