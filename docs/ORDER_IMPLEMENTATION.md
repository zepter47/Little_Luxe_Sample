# Little Luxe order implementation

## Review scope

Prepared locally before committing to `feature-branch`. No migration, Cron job,
customer record, order, or stock update was applied to hosted Supabase.

### Implemented

- Customers tab uses the existing admin record manager: list/search/add/edit and active flag.
  Customers are registered separately; order creation never creates a customer.
- `create_online_order(p_items_json, p_request_id, p_order_notes)` authenticates the
  caller and uses `auth.uid()` for both `added_by` and `customer_id`. It does not
  read or populate `customer` or accept customer details/IDs from the browser.
- `create_staff_order(p_customer_id, p_items_json, p_request_id, p_order_notes)` requires
  staff/admin and `orders.create`; the customer must already exist and be active.
- Prices and availability are checked under locks, all discrepancies are returned in
  SQL exception details, and the entire failed transaction rolls back, including
  on-demand expiry cleanup. The UI identifies affected items and retains the cart/draft.
- The cart confirmation opens before any order request. Prices are never silently
  accepted after a mismatch; the customer can explicitly refresh prices and confirm again.
- Creation inserts order lines and batch reservations and increases the reserved counter.
  It never deducts physical stock. Earliest-expiring eligible stock is allocated first;
  undated batches follow dated batches. Expired batches are excluded.
- Online transitions: received → processed → shipped → delivered; decline is allowed
  from received, processed, or shipped. Staff transitions: received → delivered/declined.
  Delivered and declined are terminal. Repeating the current status has no inventory effect.
- Delivered means goods and cash exchanged. Both physical and reserved quantities decrease.
  Decline releases reservations only, including decline after shipping; no return procedure.
- Received orders expire after 12 hours, calculated on the server. Processed/shipped
  orders do not automatically expire. Every order has its own deadline.
- Private one-order and batch expiry functions support scheduled and on-demand cleanup.
  Checkout drains all relevant batches; staff actions check expiry after locking the order.
  A staff action finding an expired order returns `expired` normally to commit its decline.
- Dashboard shows active orders; customers see their own online orders, staff see actionable
  orders. Terminal orders leave that list and remain in history. Stock management's Orders
  view displays delivered orders only and offers no order/line editing.
- Every actual transition, including creation and expiry, writes an immutable history row
  in the same transaction. It records previous/new status, actor, source, reason, and time.
  Staff see the audit details; customer timeline responses exclude staff IDs/internal notes.
- Server request IDs deduplicate retries with an identical payload. The browser retains its
  request ID in component memory for a retry; the server owns the durable request ledger.
- Direct client order/line writes are revoked. Reservation writes are private. A stock trigger
  blocks clients changing the reserved counter while preserving the existing purchase flow.
- Storefront and admin availability subtract reservations; staff physical quantity remains visible.

### Identity and schema

`order.customer_id` is intentionally not a foreign key to `customer`: online IDs refer
solely to authenticated users; staff order IDs refer to the independent customer table.
Creation functions validate those separate cases. No auth-to-customer mapping, account
linking, customer snapshot, or item-name snapshot has been introduced. The existing sale
price column is reused. The existing `updated_by`/`updated_on` columns remain summary fields;
the new history table records the complete sequence.

New tables: `customer`, `stock_reservation`, `order_status_history`, and the private
`order_private.requests` ledger. New order fields: customer, origin, expiry, request ID.
New stock field: reserved quantity. Functions use explicit authentication/RBAC checks,
restricted execution grants, and an empty search path. `order_private` must remain outside
PostgREST's exposed schemas. Public definer entry points are restricted to authenticated
callers and perform their own authorization; private helpers are not granted to clients.
Customer administration uses existing staff `orders.create` permission; no new RBAC enum
values are needed for this change.

All lifecycle functions acquire the same transaction advisory lock before order/stock locks.
This intentionally serializes order inventory work at the current small-shop scale and
prevents cross-order cleanup lock inversions. The lock ends at transaction completion;
reservations are persisted, not long-running database locks. Other inventory workflows must
preserve `quantity_at_hand >= quantity_reserved`; the constraint enforces that boundary.

### Retired and retained legacy pieces

The old checkout SQL migration and SQL tests were removed because this project's inspected
migration ledger does not contain that migration and its functions are absent. The new
migration also drops those legacy objects if present on another installation. Cart browser
tests now exercise the new order RPC. The previously deleted `checkout.api.ts` stays deleted.

`checkoutAttempts`, `CheckoutLine`, and `CheckoutResult` remain unchanged pending the user's
explicit deletion decision. The new workflow does not use them. No new local checkout store
was added. A reload loses an uncertain in-memory request ID: inspect order history before
repeating an order after a lost response and reload. Durable browser retry recovery is not
claimed. The server ledger only deduplicates the same request ID.

## Local verification

- `npm run build`: TypeScript and production Vite build.
- `npm test`: existing admin list, image, and stock-document suites.
- `npm run test:orders`: isolated PGlite PostgreSQL tests using a schema fixture matching
  the inspected inventory columns and simulated Supabase auth/RBAC roles. This verifies SQL,
  RLS/grants, rollback, stock/reservations, transitions, expiry, audit, and idempotency.
- `python tests/cart.browser.py`: Chromium integration with mocked Supabase responses;
  confirmation sends no request until Yes, discrepancies retain the cart, explicit price
  refresh, same-screen network retry IDs, cleanup on success, and account isolation.
- `python tests/orders.browser.py`: customer and staff dashboard/customer-management flows
  with mocked Supabase responses.

PGlite is real embedded PostgreSQL, but it does not simulate independent production database
sessions. Multi-session contention/load tests and Supabase advisors remain a staging rollout
check. The fixture does not reproduce every production migration or the Auth service.
Nine database scenarios passed, alongside both browser suites and the three existing test suites.
The targeted frontend lint and production build also passed.
Browser tests use fake credentials and intercepted requests; they never contact the hosted API.

## Deployment after review

1. Inspect the migration and existing grants. It refuses to install if legacy orders exist:
   reconcile those explicitly instead of guessing origins or allocating inventory twice.
2. Apply `supabase/migrations/20261027000000_order_reservations.sql` to staging first, then
   verify with real Supabase users and run security/performance advisors there.
3. Apply `supabase/schedule_order_expiry.sql` as a trusted database operator after the migration.
   It installs one named minutely Cron job. Use `0 * * * *` for hourly housekeeping if desired.
4. Regenerate database types from the approved schema. This review includes matching types
   edited locally because the hosted schema intentionally remains unchanged.
5. Deploy the frontend alongside the migration. Before migration, new screens report missing
   tables/RPCs; this is not a claim that the feature is already live.
6. Monitor `cron.job_run_details`, expired received orders, and the invariant that each stock
   counter equals the sum of its active reservations.

The Supabase CLI was attempted for migration creation, but it cannot initialize its config
under the read-only home directory in this environment. The reviewed migration was therefore
written locally with an explicit filename. Live schema/migration history was not touched.

## Deliberately deferred

Invoices/emails, reminders or expiry for processed/shipped orders, snapshots, account linking,
and a separate failed-delivery return flow. Customer hard deletion is omitted to preserve
order references; inactive customers cannot be selected for new staff orders.
