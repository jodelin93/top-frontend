---
id: auth-forgot-password
title: Forgot your password
category: Getting started
order: 109
public: true
routes: [/auth/forgot-password, /auth/reset-password]
keywords: [forgot password, forgotten password, reset password, new password, reset link, email link, lost password, password reset email]
related: [auth-login, faq-account, users-manage]
---
If you no longer know your password, choose a new one yourself with a link sent to your email address.

![The Forgot your password page](shot:auth-forgot-password)

1. On the sign-in page, click **Forgot password?** (next to **Password**).
2. Enter the email of your account in **Email**.
3. Click **Send the link**. The page confirms that a link is on its way.
4. Open the email **Reset your password** and click **Choose a new password**. Check the spam folder if it is not in your inbox.
5. Enter your new password twice (at least 8 characters): **New password** and **Confirm the new password**.
6. Click **Save the new password**, then **Sign in** with the new password.

![Choosing the new password](shot:auth-reset-password)

## Good to know

- The link works **once** and expires after **30 minutes**. A new request replaces the previous link.
- The email is written in the language shown on the page when you asked for it.
- For security, the page shows the same message whether the address has an account or not.
- Saving the new password **signs out every device** signed in to your account, and unlocks an account locked after too many wrong tries.
- If two-factor authentication is on, the app still asks for your 6-digit code at sign-in.
- At most 3 links per hour per account.

## Error messages

- **This link is invalid or has expired. Ask for a new one.**: the link was already used, is more than 30 minutes old, or was replaced by a newer one. Click **Ask for a new link**.
- **The two passwords are different**: type the same password in both fields.

> **Tip:** no email after a few minutes? Check the address you typed. A manager can also set a new password for you in **Users** (see [Reset the password](topic:users-manage)).
