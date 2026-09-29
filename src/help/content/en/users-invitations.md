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
5. Type a starting **Password**.
6. Click **Add user**.

![The Add user form](shot:user-form)

| Case | What happens |
| --- | --- |
| The email does not have an account yet | The account is created with the password you entered. The person can sign in right away. |
| The email already has an account (in another store) | The password you entered is not used. The person gets an **invitation**; their status is "Invited — waiting for acceptance". |

An invited person gets access to the store only after accepting the invitation, in **Account security** or on the dashboard (see [Invitations and switching stores](topic:account-invitations)).

> **Warning:** no one can give more permissions than they have themselves. Only an owner can make someone else an owner.

> **Tip:** tell the person their starting password in person and ask them to change it the first time they sign in ([Account security](topic:account-security)).
