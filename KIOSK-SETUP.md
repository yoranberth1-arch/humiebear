# Hummie Bear self-order kiosk

This is the isolated self-service kiosk on branch `self-ordering-kiosk`. It does not modify the live storefront files. The current Preview is the pilot URL, separate from the public production website. The kiosk uses the existing Vercel project conventions and a separate set of Supabase tables.

## Features
- iPad customer ordering page: `/self-order.html`
- Smartphone kitchen screen: `/self-order.html?team=1`
- Seven-step guided customer flow: name, lollywafel, chocolate, sauce, toppings, quantity and review/payment
- Product photo cards, selectable ingredients, price total and order confirmation
- Naturel lollywafel at €4.00 when no chocolate, sauce or toppings are selected; decorated base price defaults to €5.00, and each selected topping adds €0.50
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
- The hero, waffle selection, quantity and review use the local Hummie Bear asset `/images/waffle-lollipop-closeup.png`. Ingredient-option photos still use external URLs and fall back to emoji icons if loading fails; before wider production use, replace them with Hummie Bear-owned or licensed images.
- Admin token is a simple shared secret suitable for a controlled pilot. Before broad production use, replace it with Supabase Auth staff accounts and role-based policies.
- Earlier pilot checks recorded that the seven-step flow and test-mode Mollie payment returned through the test webhook. In the latest audit, guest access to the Vercel Preview was blocked by Vercel deployment protection, so a fresh independent end-to-end guest test could not be repeated.
- A successful paid Mollie **test-mode** checkout was completed end-to-end: the test payment returned to the receipt page and the verified webhook marked the order paid. The test order was removed afterward. No live charge was made. Failed/canceled payments and the refund workflow still need dedicated test-mode verification before production.
- Refund creation now sends a stable Mollie `Idempotency-Key` based on the order UUID, and staff status updates require a paid/included order. Order-creation still needs durable idempotency/rate limiting and abandoned-order cleanup before wider production use.

## Launch blockers (do not skip)
- The customer page is not currently published on `www.hummiebear.be`; `/self-order.html` on that live domain returns 404. The live site remains unchanged by this branch.
- The Vercel Preview is protected by SSO. The current Preview URL is not a suitable public `KIOSK_PUBLIC_URL` for customer checkout/webhooks until public reachability is configured and tested.
- Before launch, configure a public kiosk URL (for example a dedicated subdomain), point it to the kiosk deployment, set the production kiosk environment variables, and verify that Mollie can reach the webhook and that the customer can return to the receipt page. Keep Mollie in test mode until that full public route is proven.
- The natural price (€4.00) is currently defined in kiosk API/UI code; the staff settings screen controls the decorated base price (default €5.00) and topping extra (€0.50), but does not yet edit the natural price. If prices change, update the natural-price definition in both `api/kiosk-config.js` and `api/kiosk-create-payment.js` and test the price calculation end to end.
- This remains an ordering/payment MVP, not a certified fiscal cash register or tax-compliant receipt system. Confirm the BVBA's applicable fiscal obligations and required receipt/invoice content with the accountant before relying on it for commercial sales.
