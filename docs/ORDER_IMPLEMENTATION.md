# Little Luxe order implementation and deployment

The order workflow is installed in hosted Supabase and the frontend source is committed
on `feature-branch`. The database migration filenames now match Supabase's recorded
migration versions. Previous inspection-only instructions have been superseded.

## Customer identity and the order foreign key

- `order.customer_id` is a real, validated foreign key to `customer.customer_id`, with
  deletion restricted while orders reference the customer.
- Every permanent Auth account has a customer row with `customer_id = auth.users.id`.
  Four existing accounts were backfilled; verification found zero missing account records.
- An Auth trigger provisions new permanent accounts and accounts converted from anonymous
  sign-ins. Email, phone, and supplied first/last names synchronize when Auth data changes.
  Auth metadata supplies display/contact information only; it never authorizes staff actions.
- Email-only accounts can have null names. No fictional names were inserted. Staff registration
  and staff editing still require first and last names through `save_customer`.
- Customers registered by staff receive a database-generated random UUID. No Auth account is
  created for them. Customer creation is a separate admin operation, never part of order creation.
- `customer_origin` distinguishes `account` and `staff` records and is controlled by the database.
- Online orders set both `added_by` and `customer_id` from `auth.uid()`. Staff orders use the
  staff/admin Auth UUID for `added_by` and the selected existing customer UUID for `customer_id`.
- Staff can select any existing active customer, including a registered account. Online checkout
  accepts neither a customer ID nor customer details and rejects inactive/unavailable accounts.
- No customer snapshots, item-name snapshots, invoices, account matching by email, or additional
  local checkout stores were introduced. The existing order-line sale-price column is reused.

## UI

The Customers tab uses the existing admin record manager for listing, search, and add/edit.
All new order inputs and selects now use `LabeledTextField`, which is already used by item,
category, unit, supplier, authentication, and stock forms. This provides separate labels,
shared spacing, rounded borders, and the existing application field styles rather than MUI's
floating-label defaults. Customer selectors also show email when an account has no names yet.

The cart opens a Yes/No confirmation before making an order request. Price/stock discrepancies
leave the cart intact and identify affected lines. Price changes require explicit refresh and
another confirmation. Staff order creation selects an existing customer and confirms before
submitting. Status actions have individual Yes/No dialogs, including cash-receipt confirmation
and a required reason for manual decline.

## Inventory and lifecycle

- `create_online_order` and `create_staff_order` have separate authorization/customer rules.
- Both validate current prices and availability, then create order lines and batch reservations.
  Physical stock is unchanged at creation; available quantity is physical minus reserved.
- Allocation uses earliest expiry first, then undated stock; expired batches are excluded.
- Online: received → processed → shipped → delivered. Decline is allowed from all three active
  statuses, including shipped. Staff: received → delivered/declined.
- Delivery confirms goods and cash exchanged, reduces physical/reserved stock, and fulfils
  reservations. Decline releases reservations without changing physical stock or requiring returns.
- Delivered/declined orders are terminal. Repeating the current status does not change inventory.
- Received orders expire after 12 hours. Processed/shipped reservations remain until staff act.
- Private per-order and batch expiry functions support Cron and on-demand cleanup. Creation
  drains relevant overdue batches before allocating stock. Failed checkout rolls back everything,
  including cleanup, as requested. A staff action that discovers expiry returns an `expired`
  outcome so its decline/release can commit.
- One transaction advisory lock serializes order inventory operations at the current small-shop
  scale. It ends when the transaction ends; persistent reservation rows hold stock afterward.
- Active dashboards show received/processed/shipped orders. Customer access is restricted to
  their own online orders. Terminal records remain in history; stock management shows delivered
  orders only. Order lines and notes cannot be edited through the old stock panel paths.
- Each actual status transition writes an immutable history row in the same transaction with
  previous/new status, actor, source, reason, and database time. Customer timeline projections
  exclude staff UUIDs and internal notes.

## Permissions and retry handling

Public RPC functions are restricted `SECURITY INVOKER` wrappers. Privileged implementations
live in the non-exposed `order_private` schema, retain their own authentication/role/permission
checks, and grant authenticated callers execution only on the specific entry functions.
Stock-allocation and expiry helpers are not granted to clients. Direct client order/line
writes are revoked. Explicit deny policies protect reservation/request tables; a trigger
blocks direct client edits of reserved counters without breaking the purchase workflow.

Read policies cache Auth lookups and combine customer/staff access without multiple permissive
policies on the new workflow tables. Duplicate indexes introduced by the first order migration
were removed where equivalent existing indexes already covered the same columns.

The server request ledger deduplicates identical request IDs/payloads. The current cart retains
its request ID in component memory for retries. Reloading loses an uncertain in-memory ID:
inspect order history before repeating an order after a lost response and reload. Durable
browser retry recovery is not claimed.

`checkoutAttempts`, `CheckoutLine`, and `CheckoutResult` remain unchanged pending an explicit
user deletion decision. The new order workflow does not use them. The old checkout API and
its obsolete SQL migration/tests have been retired.

## Applied migrations

| Version | Name | Change |
| --- | --- | --- |
| 20261026225410 | order_reservations | Customers, reservations, lifecycle RPCs, expiry, history, stock guards |
| 20261026225418 | customer_auth_accounts | Auth provisioning/backfill, order/customer FK, supporting indexes |
| 20261026225430 | order_expiry_schedule | Named minutely Cron job |
| 20261026225728 | order_access_review | Private privileged implementations, read policies, index cleanup |

Cron job `little-luxe-expire-orders` runs `order_private.expire_received_orders()` every minute.
The standalone schedule script is retained only for changing that named job's frequency.
The implementation refuses to guess how to migrate pre-existing legacy orders; none existed
in the hosted project at deployment. Four account customer records are the only persistent
business records created by provisioning/backfill.

## Verification

- Production TypeScript/Vite build and targeted frontend lint.
- Three existing admin/image/stock-document test suites.
- Thirteen isolated PostgreSQL/PGlite scenarios: stock, rollback, expiry, audit, permissions,
  idempotency, signup/backfill, anonymous conversion, customer FK, and inactive accounts.
- Both mocked Chromium browser suites: cart/account isolation, price review/retry, customer
  registration, staff order/status confirmation, customer tracking, and shared field labels.
- A hosted transactional smoke test used real roles/permissions to create/retry an online
  order, reject a direct order update, process/ship/deliver it, and verify single deduction and
  four audit events. The entire smoke transaction was rolled back: zero test orders remained
  and reservation counters remained consistent.
- Hosted checks verified four linked accounts, zero missing customer records, the validated
  foreign key, installed Auth trigger, and enabled Cron job. Types were regenerated from the
  actual hosted schema instead of retaining the earlier handwritten additions.

PGlite does not reproduce independent production sessions; a separate multi-session/load
exercise remains future verification. Browser suites intercept the API and do not submit
real orders. No email/invoice work or indefinite-reservation reminder logic was added.

## Advisor results

No new order/customer security warnings remain after the access review. Existing findings
remain outside this change: mutable search paths on three old functions, public execution
of the existing authorization/role trigger functions, and disabled leaked-password protection.
Performance notices concern existing item/return policies, older unindexed foreign keys, and
an existing stock-index duplicate. New unused-index notices are expected on empty tables.

Reference remediation:
- [Mutable function search paths](https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable)
- [Public definer execution](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable)
- [Password protection](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection)
- [RLS query planning](https://supabase.com/docs/guides/database/database-linter?lint=0003_auth_rls_initplan)
- [Duplicate indexes](https://supabase.com/docs/guides/database/database-linter?lint=0009_duplicate_index)

The Supabase CLI cannot initialize its config in this environment's read-only home directory.
Migrations were applied through the Supabase connector, and repository filenames were aligned
with the versions recorded by that service. Schema and migration history were verified afterward.
