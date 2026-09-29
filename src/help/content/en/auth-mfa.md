---
id: auth-mfa
title: Enter the two-factor authentication code
category: Getting started
order: 102
public: true
routes: [/auth/mfa-verify]
keywords: [two-factor authentication, 2FA, MFA, code, verification, verification code, authenticator, phone, 6 digits, one-time code]
related: [account-2fa, auth-login, faq-account]
---
Two-factor authentication protects an account with a 6-digit code. This code changes every 30 seconds in an app on your phone (Google Authenticator, Microsoft Authenticator, 1Password…).

If it is turned on for your account, the **Two-Factor Authentication** screen appears after the password:

1. Open the authenticator app on your phone.
2. Read the 6-digit code shown for your account.
3. Enter it in the **Verification Code** field.
4. Click **Verify**.
5. If something goes wrong, click **Back to Login** to start over.

> **Tip:** if the message **Invalid verification code** appears, check that the phone's time is correct: a phone that is running late produces wrong codes. A code works only once: wait for the next one if you just used it.

> **Warning:** wrong codes count as login attempts. After 5 errors in a row, the account is locked for 15 minutes.

The store can require two-factor authentication for people who manage users, roles, settings, or the audit log. In that case, the app sends you to **Account security** to turn it on before doing anything else (see [Turn on two-factor authentication](topic:account-2fa)).
