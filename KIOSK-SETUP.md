# Hummie Bear self-order kiosk

This is the isolated self-service kiosk on branch `self-ordering-kiosk`. It does not modify the live storefront files. The current Preview is the pilot URL, separate from the public production website. The kiosk uses the existing Vercel project conventions and a separate set of Supabase tables.

## Features
- iPad customer ordering page: `/self-order.html`
- Smartphone kitchen screen: `/self-order.html?team=1`
- Seven-step guided customer flow: name, lollywafel, chocolate, sauce, toppings, quantity and review/payment
- Product photo cards, selectable ingredients, price total and order confirmation
- Server-side price calculation (default €5.00 per waffle; each topping €0.50)
- Paid public mode or included/private-event mode with prices hidden
- Cash versus Mollie payment selection on the customer kiosk; cash stays pending until staff confirms the cash was received
- Mollie hosted checkout; order becomes paid only after the server verifies the Mollie status in the webhook. Cash orders are never treated as paid until a staff member taps “Cash ontvangen”.
- Kitchen status changes, sound alert, sales/order overview, refund request
- Stock availability controls directly on the kitchen screen (toggle chocolate, sauces and toppings on/off)

## Database
The additive migrations `supabase/migrations/202610260001_kiosk.sql` and `supabase/migrations/202610260002_kiosk-payment-method.sql` have been applied to the active Supabase project `hummie bear new` (`yrcajvpstbyupohjbavm`). They create only `kiosk_*` tables, seed the waffle options, and add cash/Mollie payment-method tracking. If you later use a different project, run both migrations there too.

## Vercel environment variables
Set these in the Vercel project, for Preview first:
- `SUPABASE_URL`: project URL, e.g. `https://YOUR_PROJECT.supabase.co`
- `SUPABASE_SERVICE_ROLE_KEY`: service-role key; server only, never expose to browser
- `MOLLIE_API_KEY`: use a Mollie test key first; never commit the key. The preview can also read the existing `mollie_api_test_key` environment variable.
- `KIOSK_ADMIN_TOKEN`: long random secret (at least 32 random characters)
- `KIOSK_PUBLIC_URL`: canonical public URL for the kiosk, e.g. `https://www.hummiebear.be`

The existing `vercel.json` already routes `api/*.js` to Vercel Node functions. This code uses the same pattern.

## Test sequence
1. Deploy this branch to a Preview deployment.
2. Apply the migration to the intended Supabase project.
3. Add Preview environment variables with the Mollie **test** API key.
4. Confirm that `/api/kiosk-config.js` returns the 10 active options and that images load in the browser.
5. Place a test order in Mollie test mode and verify that a checkout URL is returned; never use a live key while testing.
6. Place a cash test order and confirm it stays unpaid until staff presses “Cash ontvangen”.
7. Test the included/private-event mode and confirm no price or payment checkout is shown.
8. Before launch, complete an end-to-end successful test payment and verify the webhook, kitchen screen, return receipt, cancellation, duplicate webhook and refund.
9. Only after those checks should the live Mollie key be activated in a controlled production deployment.

## Important implementation notes
- The browser never receives the Mollie API key or Supabase service-role key.
- The return URL is not treated as proof of payment; only the webhook's server-side Mollie lookup can mark an order paid.
- This is an MVP, not yet a certified fiscal cash register or VAT receipt system. The “receipt” in this version is the order confirmation screen and kitchen order record; tax-compliant receipts/invoices require a separate decision and implementation.
- The kitchen screen polls every four seconds for simplicity. This is near-real-time; Supabase Realtime subscriptions can replace polling in a later hardening pass.
- The 10 ingredient/waffle photos currently load successfully in the Preview but are hosted by external image sources. For long-term stability and commercial rights certainty, replace them with Hummie Bear-owned photos or licensed local assets.
- Admin token is a simple shared secret suitable for a controlled pilot. Before broad production use, replace it with Supabase Auth staff accounts and role-based policies.
- The Preview was browser-tested on tablet and mobile widths: all 10 product photos loaded, the seven-step flow reached the review page, selection totals matched server pricing, and cash and Mollie order-creation paths returned the expected responses.
- A successful paid Mollie **test-mode** checkout was completed end-to-end: the test payment returned to the receipt page and the verified webhook marked the order paid. The test order was removed afterward. No live charge was made. Failed/canceled payments and the refund workflow still need dedicated test-mode verification before production.
- For production, add rate limiting, idempotency keys for order/payment creation, automated cleanup for abandoned pending orders, and staff accounts with role-based policies.
