# Admin two-factor sign-in

Handoff pack, FINAL-SPEC §9 (admin MFA). After the password, admin sign-in asks for a 6-digit code
from an authenticator app (Google Authenticator, Microsoft Authenticator, 1Password…).

## Turning it on

1. Sign in to admin → **Two-factor sign-in** (top right) → `/admin/two-factor`.
2. Add MegaDeal to the app (tap the link on your phone, or type the setup key).
3. Enter the app's current code to check it.
4. Cloudflare → Workers & Pages → megadeal → Settings → Variables and Secrets → add a **Secret**
   named `ADMIN_TOTP_SECRET` with that key. From then on, sign-in asks for a code.

Nothing changes until step 4: the setup page stores nothing.

## Lost the phone

Delete `ADMIN_TOTP_SECRET` in Cloudflare. Sign-in goes back to the password alone; set it up again
with the new phone.

## How it works

- `lib/totp.ts`: RFC 6238 codes (SHA-1, 30 seconds, 6 digits), checked with one step either side
  for clock drift. Tested against the RFC's own test values.
- `app/api/admin/login`: a correct password with no code gets "enter the code" (not counted as a
  failed attempt); a wrong code counts towards the existing lockout. Each code works once (the
  last used step is kept in Workers KV), so a seen or replayed code is refused.
- A wrong password is refused before the code is asked for, exactly as before.
