---
id: users-manage
title: Edit or suspend a user, or reset their password
category: Staff
order: 1204
routes: [/admin/users]
keywords: [reset 2FA, two-factor, locked account, lost phone, disconnect, signed in on another device, one device, session, suspend, suspended, role, branches, branch access, reset password, forgot password, sign out, deactivate user, remove access]
related: [users-invitations, roles-permissions, faq-account]
---
## Limit access to certain branches

A limited user only sees the sales, shifts, stock and reports of their branches; customers and the catalog stay shared.

1. Click the pencil on the person's row.
2. Under **Branch access**, choose **Only some branches** and check at least one branch.
3. Click **Save changes**.

> **Tip:** if the person has an employee record, **Use employee branches** copies the branches from their record. An owner always has access to everything.

## Change the role or suspend

1. Click the pencil on the row.
2. Change the **Role**, or choose **Suspended (no access)** in **Status**.
3. Click **Save changes**.

As soon as you save, the person is signed out of all their devices in this store: the change applies immediately. To restore access, set the **Status** back to **Active**.

> **Warning:** you cannot change your own role or your own status.

## Disconnect a user

An account can only be signed in on one device at a time. If someone left their session open on another device (browser closed without signing out, lost phone), disconnect them:

1. Click the **Disconnect** icon (an arrow leaving a door) on their row.
2. Confirm. They are signed out of every device and can sign in again where they are.

Work not yet saved on the other device is lost. You cannot disconnect yourself here: use **Sign out**.

## Reset a member's password

As long as a person has not chosen their password (status "Waiting for the password"), you cannot set it for them: send them the link again with the send icon on their row. That is how every e-mail address gets confirmed.

1. Click the key icon on the row.
2. Type the **New password**, then type it again in **Confirm password**.
3. Click **Reset password** and share it securely.

The person is immediately signed out everywhere and signs back in with the new password.

> **Warning:** you cannot reset your own password here: change it in [Account security](topic:account-security). If the account is also used in another store, the reset is refused: the person must change their password themselves.

To cut off someone's access everywhere (lost phone…), suspend them or reset their password: all their sessions in the store are closed.

## Reset two-factor authentication

If someone lost their phone, or their 6-digit codes are refused (the account locks after several tries), the **owner** clicks the **crossed-out shield** icon on their row (**Reset two-factor authentication**) and confirms.

- Their two-factor authentication is turned off and their account **unlocked**; they are signed out everywhere.
- They sign in with their password. If their role requires it, they are asked to set two-factor up again with a new QR code.
- The action is recorded in the [Audit log](topic:audit-log).

> **Warning:** only an owner can do it, and not for their own account (see [Two-factor authentication](topic:account-2fa)). An account used in another store must turn it off itself.
