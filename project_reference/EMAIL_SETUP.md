# cramBIT email setup

Two emails go to students:

1. **Sign-in link** — sent by **Supabase Auth**. By default it's branded "Supabase"
   from `noreply@mail.app.supabase.io` and rate-limited to ~3/hour. Fix = custom SMTP.
2. **Payment activation** — sent by the cramBIT app (`src/lib/notify.ts`).

Both should come from **cramBIT**. Point them at the same mailbox.

---

## Zero-cost option: a dedicated Gmail (recommended for launch)

1. Create a new Google account, e.g. `crambit.noida@gmail.com`.
2. Turn on 2-Step Verification (myaccount.google.com → Security).
3. Create an **App password**: Security → App passwords → app "Mail", device "Other:
   cramBIT" → copy the 16-char password.
4. Put it in `.env.local`:
   ```
   SMTP_HOST=smtp.gmail.com
   SMTP_PORT=465
   SMTP_USER=crambit.noida@gmail.com
   SMTP_PASS=<the 16-char app password, no spaces>
   SMTP_FROM="cramBIT <crambit.noida@gmail.com>"
   ```
   Gmail sends up to ~500/day — fine for launch.

### Wire it into Supabase Auth (so the sign-in email is branded too)
Dashboard → your project → **Authentication → Emails → SMTP Settings** → enable custom SMTP:

| Field | Value |
|---|---|
| Sender email | `crambit.noida@gmail.com` |
| Sender name | `cramBIT` |
| Host | `smtp.gmail.com` |
| Port | `465` |
| Username | `crambit.noida@gmail.com` |
| Password | the app password |

Then **Authentication → Emails → Templates → Magic Link** — replace the body with:

```html
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f3f0;font-family:-apple-system,Segoe UI,Roboto,sans-serif">
<tr><td align="center" style="padding:40px 16px">
  <table role="presentation" width="100%" style="max-width:440px;background:#fff;border:1px solid #e7e5e0;border-radius:14px">
    <tr><td style="padding:28px 28px 0">
      <div style="font-family:ui-monospace,Menlo,monospace;font-weight:600;font-size:18px;color:#191a1f">cram<span style="color:#4a45d4">BIT</span></div>
    </td></tr>
    <tr><td style="padding:18px 28px 4px">
      <h1 style="margin:0;font-size:20px;font-weight:600;color:#191a1f">Your sign-in link</h1>
      <p style="margin:12px 0 0;font-size:15px;line-height:1.6;color:#5c5d68">Tap the button to sign in to cramBIT. This link works once and expires shortly.</p>
    </td></tr>
    <tr><td style="padding:20px 28px 28px">
      <a href="{{ .ConfirmationURL }}" style="display:inline-block;background:#4a45d4;color:#fff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 22px;border-radius:9999px">Sign in to cramBIT →</a>
      <p style="margin:16px 0 0;font-size:12px;color:#9a9aa4">If you didn't request this, ignore this email.</p>
    </td></tr>
  </table>
</td></tr></table>
```

Do the same for **Confirm signup** (change the heading to "Confirm your email" and the
button text to "Confirm →"). Subject lines: `Your cramBIT sign-in link` /
`Confirm your cramBIT account`.

---

## Later: your own domain (better deliverability)

If you buy `crambit.app` / `crambit.in`:
- Sign up at **resend.com** (free 3k/month), add the domain, set the SPF/DKIM DNS
  records they give you.
- Set `RESEND_API_KEY` and `SMTP_FROM="cramBIT <hello@crambit.app>"`, or use Resend's
  SMTP creds for the Supabase config above.
- Emails then send from your domain and rarely land in spam.
