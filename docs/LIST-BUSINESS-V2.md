# /list-your-business redesign (V2)

From the Business Page pack (4 Oct 2026). Off by default: visitors see the
current page until `LIST_BUSINESS_LIVE` in `lib/siteConfig.ts` is set to `"v2"`
(or `LIST_BUSINESS_DESIGN=v2` in the Cloudflare build variables).

## Preview
Sign in to `/admin`, then open `/list-your-business?design=v2` (add `&ref=CODE`
to try a referral link). Admin-only, never cached, `noindex`. The signup on it
is the real one, so only test with an address you control.

## Signup: one form, two steps
The redesign does not have its own signup. It uses the existing
`MerchantSignupForm` with `twoStep`, so every check and request is unchanged:
reCAPTCHA (invisible, then the checkbox if Wix asks), the honeypot, the
signed-in guard, Wix registration and email verification, the resend
cooldown, attribution (first touch, fbp/fbc), Meta and GA events, and
`/api/merchants/apply`.

| Field | Step | Sent as |
|---|---|---|
| Your name | 1 | `contactName` |
| Email | 1 | Wix account |
| Password, confirm | 1 | Wix account (confirm is checked in the browser only) |
| Legal / registered business name | 2 | `businessName`, `legalBusinessName`, Wix nickname |
| Contact phone (private) | 2 | `contactPhone` |
| Business phone + "Same as my contact phone" (unticked) | 2 | `phone` |
| Promo code (pre-filled with the current offer) | 2 | `couponCode` |
| Referral code (pre-filled from `?ref=`) | 2 | `referredByCode` |
| Terms and privacy (unticked) | 2 | `agreedToTerms` |
| Honeypot | hidden | `mg_contact_ref` |

Continue only runs the browser's checks on step 1 (plus password length and
match): no account, no request. Both steps stay mounted, so Back keeps every
value, and the final button reads the whole form exactly as the one-page form
does. Wix email/password errors send the visitor back to step 1. Passwords live
only in memory, never in storage or the URL. Credits, approval and the promo
are decided on the server at approval, never by the form.

## Copy
`lib/businessPageContent.ts`, word for word from the pack before launch. After
launch (`SITE_LAUNCHED`) the 6-month offer, its qualifier and its FAQs are
replaced by the launch offer the site already uses (`lib/promo.ts`).

## Roll back
Set `LIST_BUSINESS_LIVE` back to `"legacy"` and push, or `git revert` the
commit. Accounts, applications and credits are not affected either way.
