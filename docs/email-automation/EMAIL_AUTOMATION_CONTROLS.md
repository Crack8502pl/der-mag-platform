# Email Automation Controls

## Overview

The platform now supports two admin controls for automated email delivery:

1. **Global toggle** — available in `/admin/email-automation`
2. **Per-user pause** — available in `/admin/users`

Automated emails are sent only when both conditions are true:

1. Global setting `email_automation_enabled` is `true`
2. The target user does **not** have an active per-user pause

Decision order is always:

`global toggle → user pause`

## Manual testing checklist

1. Open `/admin/email-automation` as an admin and switch the global toggle OFF.
2. Trigger any automated notification flow (for example task assignment or scheduled notification) and confirm no automated email is sent.
3. Switch the global toggle back ON and confirm the same automated flow sends email again.
4. Open `/admin/users`, pause email automation for a selected user, then trigger an automated flow targeting that user and confirm delivery is skipped only for that account.
5. Resume the paused user and confirm automated delivery works again for that user.

## Known limitations

- Per-user pause applies only to recipients that can be resolved to a platform user account.
- System or external mailbox recipients that are not mapped to a user are controlled only by the global toggle.
- Credential emails and SMTP test operations are not treated as automated notifications.

## Support runbook

1. Verify the global status in `/admin/email-automation`.
2. If the global toggle is ON, check the user row in `/admin/users` for `Automat e-mail`.
3. Review the pause reason shown in the admin users table before resuming delivery.
4. Resume the user only after confirming the blocker is no longer valid.
5. Re-trigger the business flow or wait for the next scheduled notification and verify delivery.
