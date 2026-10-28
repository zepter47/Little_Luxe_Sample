# Feature ownership

Admin (`src/routes/admin.tsx`) and Stock Management
(`src/features/stock/StockManagement.tsx`) own navigation and select their child
screens through TanStack Router links and an Outlet. They do not define child
forms, database operations, or queries. Stock Management follows the admin
layout: a guarded parent route plus index, purchases, and returns child routes.

Each feature owns its application UI, field markup, responsive list behavior,
and styles. The similar implementations are intentionally independent: changing
category presentation must not change units, purchases, or orders. Using MUI
and React Query as libraries does not create a shared application component.

| Feature | Entry screen | Data and validation |
| --- | --- | --- |
| Items | `items/Items.tsx` | `item.api.ts`, `item.query.ts`, `item.schema.ts`, `item.types.ts` |
| Categories | `Categories/Categories.tsx` | `category.api.ts`, `category.query.ts`, `category.schema.ts`, `category.types.ts` |
| Units | `units/Units.tsx` | `unit.api.ts`, `unit.query.ts`, `unit.schema.ts`, `unit.types.ts` |
| Suppliers | `suppliers/Suppliers.tsx` | `supplier.api.ts`, `supplier.query.ts`, `supplier.schema.ts`, `supplier.types.ts`; supplier categories have their own form/schema/query |
| Customers | `customers/Customers.tsx` | `customer.api.ts`, `customer.query.ts`, `customer.schema.ts`, `customer.types.ts` |
| Purchases | `purchases/Purchases.tsx` | `purchase.api.ts`, `purchase.query.ts`, `purchase.schema.ts`, `purchase.types.ts` |
| Orders | `orders/OrderDashboard.tsx` | `order.api.ts`, `order.query.ts`, `order.schema.ts`, `order.types.ts`, `order.model.ts`, `order.errors.ts` |
| Returns | `returns/Returns.tsx` | UI placeholder only; no data access or workflow |

All paths in the table are relative to `src/features`. Feature components live
in their own `components` directory (`Components` for the existing categories
feature). Admin no longer exports a record manager, item screen, or list UI.

## Form and list responsibilities

Categories, units, customers, suppliers, and supplier categories use explicit,
feature-specific forms with React Hook Form and Zod. No `Records` manager or
runtime field configuration remains. Screens load data and open forms; lists
receive typed rows and edit callbacks; forms manage input and validation;
`*.query.ts` configures mutations and cache refreshes; `*.api.ts` owns database
operations. The learning `/category` and `/products` routes are removed.

## Approval before writes

Every create/update submission in Admin and Stock Management requires a Yes/No
dialog before its API write. Validation runs before approval. No dismisses the
approval without discarding the draft. Yes saves the validated draft; pending
writes disable inputs/actions and repeated Yes clicks are guarded. Failed saves
keep the form open and require fresh approval before a retry.

This covers categories, units, customers, suppliers, supplier categories, items
(including images saved with an item), purchase creation, purchase header edits,
staff orders, and order status changes. Opening a form or editing unsaved inputs
does not write data. Confirmation components are owned by their respective
features. Returns remains UI-only.

## Item navigation and person labels

Storefront cards link directly to `/items/$itemId`. The item-owned `ItemDetails`
component displays the selected item, profile/gallery images, and description.
Cards no longer expand or expose an extra title/gallery button. Their existing
cart icon remains separate from the card link.

Order summaries, staff history, purchase lists, and customer lists display
available first/last names, otherwise email. Missing details use a neutral label,
never a person UUID. Order and purchase references and internal relational IDs
remain unchanged. Each feature owns its display formatting and batched lookup.
Lookups select only ID/name/email columns from the existing public customer
records, use viewer-scoped query keys, and retain RLS. Customers only request
their order's customer identity; staff author/history details stay staff-only.
No new directory, auth.users browser access, policies, or migrations are added.

## Workflow boundaries

- Purchases own list/detail reads, header edits, item/supplier lookups, and the
  creation form. Creation still uses the existing atomic `create_purchase` RPC.
  Purchase lines remain read-only after creation.
- Orders own item/customer lookups, creation, status changes, details, timeline,
  and errors. Staff request IDs remain stable when retrying the same payload.
  Status rules live in `order.model.ts`; database enforcement is unchanged.
  `StaffOrderForm` uses React Hook Form and the Zod staff-order schema;
  `StaffOrderLines` uses `useFieldArray` with stable row IDs and field errors.
  `StaffOrderConfirmation` owns the Yes/No presentation. Unchanged confirmed
  retries reuse their request ID; changed payloads receive a new ID. Price
  refresh updates registered price fields without replacing line rows.
  `OrderView` coordinates detail/timeline queries and action selection;
  `OrderSummary` and `OrderTimeline` only render data. `OrderStatusForm` owns
  React Hook Form validation (including decline reasons), mutation/submission
  state, errors, and Yes/No approval. Customer presentation hides staff audit
  fields even if extra fields are present in supplied timeline data.
- Returns are UI-only: a placeholder screen and disabled Add button. There are
  no return APIs, queries, mutations, validation schemas, or edit/detail workflows.
- Stock Management has no generic entity API, record normalization, or form.
- Purchase and order mutations explicitly invalidate `itemKeys.all` because
  they affect inventory. This is a data dependency, with no import of item UI.
  Purchase and order queries have their own key namespaces.
- Existing auth checks, database functions, migrations, and RLS are unchanged.

## Verification

`npm test` includes feature import-boundary checks, purchase validation/API
checks, order rules/cache checks, and item responsive-list checks.

`tests/adminForms.browser.py` verifies add/edit approvals for every admin form,
No without writes, required-field/email validation, typed edit defaults, and
failed-save draft retention.

`tests/stockFeatures.browser.py` exercises purchase validation, draft retention
after a failed save, retry payloads, header edits, read-only details, responsive
search, purchase Yes/No approvals, and the UI-only returns boundary (no API requests or active actions).
It uses mocked APIs only.
`tests/orderForms.browser.py` verifies staff line validation and removal,
confirmation cancellation, failed-save retention, retry request IDs, price
refresh, decline reason validation, and fresh defaults for a new status action.
The existing `orders.browser.py` and `cart.browser.py` cover the retained order
and checkout workflows. Build/preview with the test settings documented there.

`tests/routesAndPeople.browser.py` verifies item URL selection, gallery changes,
reload/not-found behavior, stock deep links/back navigation, inherited auth
checks, and first/last-name or email rendering without person UUIDs.

`npm run test:orders` runs the existing local PGlite database workflow suite.
