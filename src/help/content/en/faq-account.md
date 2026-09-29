---
id: faq-account
title: Account locked, forgotten password, access denied
category: FAQ
order: 1603
public: true
routes: [/auth/login]
keywords: [locked, locked out, blocked, forgot password, forgotten password, reset password, too many attempts, can't sign in, cannot log in, invited, suspended, role, access, permission]
related: [auth-login, users-manage, account-invitations]
---
## My account is locked

After 5 wrong passwords (or 2FA codes) in a row, the account is locked for 15 minutes. The sign-in page shows: "Too many failed attempts. This account is locked for a few minutes."

1. Wait 15 minutes without trying again: each new wrong attempt extends the lock.
2. Check that Caps Lock is not on.
3. Try again with the correct password.

> **Warning:** if your account locks when you did not try to sign in, someone may have tried to get in. Tell the owner and change your password.

## I forgot my password

Ask the owner or an administrator: they click the key icon on your row in **Users** and give you a new password (see [Reset the password](topic:users-manage)). Then change it yourself in **Account security**.

## A new employee cannot sign in

Check in **Users**:

- their **Status**: **Suspended** blocks access;
- the note "Invited — waiting for acceptance": the person already had an account and must accept the invitation in **Account security** (see [Invitations](topic:account-invitations));
- their email: a typo prevents sign-in.

## The role change does not apply

A change of role or permissions applies the next time the page loads. The person is also signed out when their role changes: they just need to sign in again.

## A page or button is missing

Your role does not give access to that page or action. Ask the administrator to check your permissions (see [Understanding roles](topic:getting-started-roles)).
