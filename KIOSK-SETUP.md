# Hummie Bear self-order kiosk

This is an isolated first implementation on branch `self-ordering-kiosk`. It does not modify the live storefront files. The kiosk uses the existing Vercel project conventions and a separate set of Supabase tables.

## Features
- iPad customer ordering page: `/self-order.html`
- Smartphone kitchen screen: `/self-order.html?team=1`
- Waffle/chocolate/sauce/topping selection, customer name and multi-waffle cart
- Server-side price calculation (default €5.00 per waffle; each topping €0.50)
- Paid public mode or included/private-event mode with prices hidden
- Mollie hosted checkout; order becomes paid only after server retrieves the payment status in the webhook
- Kitchen status changes, sound alert, sales/order overview, refund request
- Stock availability controls directly on the kitchen screen (toggle chocolate, sauces and toppings on/off)

## Database
The additive migration `supabase/migrations/202610260001_kiosk.sql` has been applied to the active Supabase project `hummie bear new` (`yrcajvpstbyupohjbavm`). It created only `kiosk_*` tables and seeded the waffle options. If you later use a different project, run the migration there too.

## Vercel environment variables
Set these in the Vercel project, for Preview first:
- `SUPABASE_URL`: project URL, e.g. `https://YOUR_PROJECT.supabase.co`
- `SUPABASE_SERVICE_ROLE_KEY`: service-role key; server only, never expose to browser
- `MOLLIE_API_KEY`: use a Mollie test key first; never commit the key
- `KIOSK_ADMIN_TOKEN`: long random secret (at least 32 random characters)
- `KIOSK_PUBLIC_URL`: canonical public URL for the kiosk, e.g. `https://www.hummiebear.be`

The existing `vercel.json` already routes `api/*.js` to Vercel Node functions. This code uses the same pattern.

## Test sequence
1. Deploy this branch to a Preview deployment.
2. Apply the migration to the intended Supabase project.
3. Add Preview environment variables with the Mollie **test** API key.
4. Open `/self-order.html`; place a test order and complete a Mollie test payment.
5. Verify that the webhook updates the order and that it appears on `/self-order.html?team=1`.
6. Test failed/canceled payments, duplicate webhook delivery, status changes and a test refund.
7. Test included mode and confirm no price/payment checkout is shown.
8. Review RLS, logs, admin token and secrets before production.
9. Only then add the live Mollie key and deploy production.

## Important implementation notes
- The browser never receives the Mollie API key or Supabase service-role key.
- The return URL is not treated as proof of payment; only the webhook's server-side Mollie lookup can mark an order paid.
- This is an MVP, not yet a certified fiscal cash register or VAT receipt system. The “receipt” in this version is the order confirmation screen and kitchen order record; tax-compliant receipts/invoices require a separate decision and implementation.
- The kitchen screen polls every four seconds for simplicity. This is near-real-time; Supabase Realtime subscriptions can replace polling in a later hardening pass.
- Admin token is a simple shared secret suitable for a controlled pilot. Before broad production use, replace it with Supabase Auth staff accounts and role-based policies.
- For production, add rate limiting, idempotency handling for payment creation, cleanup for abandoned pending orders, and tests for webhook retries and refunds.
