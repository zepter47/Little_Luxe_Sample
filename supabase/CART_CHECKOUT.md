# Cart checkout deployment

The cart uses account-scoped IndexedDB (`ProductsDatabase`, version 3). Repeated
add clicks leave the existing quantity unchanged. Quantities are edited in the
cart. TanStack Query persistence is independent and has not been added.

Configure `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` for the frontend.
The existing passwordless email sign-in/signup flow is preserved. Anonymous Supabase accounts are excluded.
Product image paths use the public `Fashion` bucket; existing HTTP URLs continue
to work. Image requests depend on the browser HTTP cache.

## Database prerequisite

Review and apply `migrations/20261021010000_secure_cart_checkout.sql` before using
checkout. It targets the connected project's current `item`, `stock`, `order`,
and `order_details` tables. Those tables must already exist. The repository types include the new RPC signature.

The migration installs an authenticated checkout RPC, a private implementation,
and private idempotency receipts. It replaces the two existing customer insert
policies with staff-only policies, so customer order writes must go through the
RPC. Review other policies if your schema differs. Apply through the normal
Supabase deployment workflow; no migration has been applied by this change.
The SQL file was created manually because the installed CLI fails while trying
to create its configuration directory on the read-only home filesystem.

Checkout first quotes current prices and stock. Confirmation checks them again,
locks product/stock rows, allocates unexpired batches by earliest expiry, writes
an order and its lines, and decrements stock in one transaction. A repeated
user/request ID returns the original result. Client prices are compared against
server prices, never used as authoritative values. Network failures retain the
local request ID for retry. Local cart cleanup and request removal are atomic.

This places a `received` order. It does not capture a payment: the repository has
no payment provider, currency, shipping, or delivery configuration. Browser carts
are local to the device and may be cleared or evicted by the browser.

## Validation

- `npm run build`
- `npm run lint`
- `git diff --check`
- Mocked browser integration: with Python Playwright and Chromium installed,
  build with `VITE_SUPABASE_URL=https://checkout-test.supabase.co` and
  `VITE_SUPABASE_PUBLISHABLE_KEY=test-publishable-key`, start `npm run preview -- --base /Little_Luxe_Sample/`
  on port 4173, then run `python3 tests/cart.browser.py`. The script uses
  `/usr/bin/chromium`; adjust that executable path for other machines. These
  checks passed, including account isolation, badge counts, and recovering a
  lost confirmation response after reload.
- SQL regression script: on an isolated database with the existing application
  schema and an auth user, run the migration followed by
  `tests/cart_checkout.sql` inside `BEGIN` / `ROLLBACK`. The SQL tests have not
  been executed: automatic approval review blocked testing the migration on the
  live connected project, even with rollback. No local Postgres is available.
