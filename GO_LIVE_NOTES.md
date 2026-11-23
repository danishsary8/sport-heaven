# Sport Castle Cambodia — Go-Live Secrets & Configuration Notes

Keep these environment keys ready for when you connect live production providers in **Settings → Secrets** (placeholders are also saved in `.env.example`).

## 1. Payment Gateway Webhooks
- `ABA_WEBHOOK_SECRET` — HMAC-SHA256 signing secret from ABA PayWay / KHQR merchant portal.
  - Webhook URL: `POST /api/webhooks/payments/aba-khqr`
- `STRIPE_WEBHOOK_SECRET` — Signing secret (`whsec_...`) from Stripe Developers → Webhooks.
  - Webhook URL: `POST /api/webhooks/payments/stripe`

## 2. Automated Order & Ops Notifications
- `TELEGRAM_BOT_TOKEN` — Bot token from `@BotFather`.
- `TELEGRAM_CHAT_ID` — Target ops group/channel chat ID (e.g., `-100...`).
- `RESEND_API_KEY` — Server API key from Resend (`re_...`).
- `NOTIFICATION_FROM_EMAIL` — Verified sender address (e.g., `Sport Castle Orders <orders@sportcastle.kh>`).

## 3. Store Administrator Access
- Default owner admin is already bootstrapped (`danishsary3@gmail.com`).
- `ADMIN_EMAILS` — Optional comma-separated list of additional staff emails granted `/api/admin/*` access.
