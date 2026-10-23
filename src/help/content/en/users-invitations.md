---
id: users-invitations
title: Add or invite a user
category: Staff
order: 1203
routes: [/admin/users]
keywords: [user, add user, new user, account, access, login, invitation, invite, invited, starting password, temporary password, branches, role]
related: [users-manage, account-invitations, roles-permissions, employees]
---
The **Users** page requires the **Manage staff accounts** permission (owner and administrator by default). The list shows **Name**, **Email**, **Role**, **Branches**, **Status**, **MFA** and **Last login**; your row is marked **(you)**.

![The user list](shot:admin-users)

1. Click **Add user**.
2. Type the **Email**, then the **First name** and **Last name**.
3. Choose the **Role**, for example **Cashier**.
4. Under **Branch access**, choose **All branches** or **Only some branches** and check them.
5. Click **Add user**. You don't type a password: the person chooses their own.

![The Add user form](shot:user-form)

| Case | What happens |
| --- | --- |
| The email does not have an account yet | The person gets a **Choose my password** e-mail (the link works for 72 hours). Choosing their password confirms their e-mail address; then they can sign in. Until then their status is "Waiting for the password (e-mail not confirmed)". |
| The email already has an account (in another store) | The person gets an **invitation**; their status is "Invited — waiting for acceptance". |

An invited person gets access to the store only after accepting the invitation, in **Account security** or on the dashboard (see [Invitations and switching stores](topic:account-invitations)).

> **Warning:** no one can give more permissions than they have themselves. Only an owner can make someone else an owner.

> **Tip:** the e-mail did not arrive? Check the address and the spam folder, then click the send icon on their row (**Send the link to choose a password again**). A new link replaces the old one.
