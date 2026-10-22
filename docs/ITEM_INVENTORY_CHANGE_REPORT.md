# Item inventory and RLS change report

## Target and scope

- Repository branch: `feature-branch`, based on remote commit `35445c7`.
- Supabase project: `ektotdjoefpbzjygvgus` (`Stridell_Games`), matched to the repository configuration.
- Applied migration: `20261022192422_secure_item_commands_and_admin_inventory`.
- No Supabase log queries were made. No column-level permissions were added.
- The supplied checkout was older than the remote feature branch. Initial scratch edits were discarded; the final changes preserve the feature branch's authentication, responsive lists, cart, and image-upload/retry flow.

## Application behavior

- Admin Items displays **Quantity on hand** on desktop and mobile. The database sums `stock.quantity_at_hand`, grouped only by `item_id`, across every batch and expiry date. Null quantities contribute nothing; an item without stock returns zero. There is no expiry-date exclusion or conversion between units.
- Added numeric quantity sorting, active-state display, **Show inactive products**, and **Refresh inventory**. Active items are shown by default. Staff can edit an inactive item and reactivate it.
- Added an **Active product** checkbox to the existing item form. New items default to active.
- Item saves call `save_item` and receive a UUID. Profile/gallery uploads still happen afterward, with the existing retry behavior. The current profile path is passed on saves, so retries preserve uploaded images.
- Storefront collection and detail reads use `get_storefront_items`. They include only active products and return a boolean availability indicator, never a quantity. Separate query keys prevent admin inventory responses from being reused as storefront responses; admin keys include user identity and inactive-filter state.
- Out-of-stock products remain visible with an **Out of stock** label. Both add-to-cart button variants are disabled. The client cart entry point also rejects inactive/out-of-stock product snapshots. These checks improve the UI; they do not replace authoritative checkout validation.

## Database functions for inspection

| Function | Security and behavior |
| --- | --- |
| `public.save_item(text,numeric,uuid,uuid,text,text,uuid,boolean)` | SECURITY INVOKER; execution granted to authenticated callers. Checks `auth.uid()` and `products.create` or `products.update`; table RLS also applies. Validates name/price, writes allowed item fields, attributes writes to the current user, returns UUID. Omitted/null active flag defaults true on creation and preserves the current value on update. |
| `public.get_admin_items_with_stock(boolean)` | SECURITY INVOKER; authenticated execution only. Requires `products.read` and `stock.read`, then applies item/stock RLS. Returns item fields and summed `quantity_on_hand`. Inactive rows still require the item policy's `products.update` permission. |
| `public.get_storefront_items()` | SECURITY INVOKER; executable by anon/authenticated. Applies item RLS and an explicit active filter. Returns item presentation fields and boolean availability, without stock quantities. |
| `private.item_has_available_stock(uuid)` | SECURITY DEFINER, fixed empty search path, outside the configured exposed schemas. Returns only a boolean, and checks that the item is active or the caller has `products.update`. It reads stock internally because customers cannot read stock rows. Schema usage and function execution are granted to anon/authenticated so the invoker storefront function can call it. |

The three public functions have a fixed empty search path. Broad PUBLIC execution was revoked. Existing service-role grants remain where supplied by the project's defaults. There was no prior `save_item` overload in the inspected database; exactly one signature was created.

Execution of the obsolete `public.add_item_with_category_name(varchar,numeric,numeric,integer,integer,varchar,varchar,varchar,varchar,varchar)` was revoked from PUBLIC, anon, and authenticated. Its definition was retained for inspection; ordinary API callers can no longer use it.

## RLS policies for inspection

| Table | Policy | Effect |
| --- | --- | --- |
| item | `items_public_read_active` | anon/authenticated can SELECT active rows. Replaces unrestricted `All can view items`. |
| item | `items_staff_read_inactive` | authenticated callers with `products.update` can SELECT all item rows. |
| item | `items_authorized_create` | Renamed existing INSERT policy; requires `products.create`. |
| item | `items_authorized_update` | Renamed existing UPDATE policy; both USING and WITH CHECK require `products.update`. |
| stock | `stock_authorized_read_quantities` | Renamed existing SELECT policy; requires `stock.read`. |

Existing stock mutation policies are unchanged: `admin and staff can add stock`, `admin and staff can update stock`, and `only admin can delete stock`.

RLS is enabled on both tables. Item SELECT is granted to anon/authenticated, item INSERT/UPDATE to authenticated, stock SELECT to authenticated. Anonymous stock privileges were revoked. Item DELETE was revoked from ordinary API roles, and `only admin can delete item` was removed: use deactivation for logical deletion. Authorized direct item writes remain possible under RLS; `save_item` is not an exclusive privileged write boundary. Other visible columns on permitted item rows remain accessible under the existing table grants, as requested.

## Other schema/data changes

- Backfilled the existing item with null `is_active` to true, preserving its previous storefront visibility.
- Set `item.is_active` default true and NOT NULL.
- Set `item.is_stocked` default false. Existing values were not rewritten.
- Added `item_sale_price_nonnegative` CHECK constraint (also rejects numeric NaN).
- Added `stock_item_id_inventory_idx` on `stock(item_id)` for aggregation/availability lookups.
- Created the `private` schema if absent.
- Added a comment marking stored `item.is_stocked` as a legacy cache. The two read RPCs compute availability from authoritative stock and do not trust this cache. No stock-sync trigger or stock-write business logic was introduced. Read-time computation avoids cached-boolean concurrency races.

## Complete committed file inventory

| File | Change |
| --- | --- |
| `src/database.types.ts` | Updated item table and added generated declarations for the new RPCs, using live generated output. Preserved unrelated branch declarations, including checkout. |
| `src/features/admin/components/AdminItemList.tsx` | Quantity/active desktop columns, mobile labels, and sorting. |
| `src/features/admin/components/adminItems.tsx` | Admin-specific query, inactive toggle, refresh, and corrected save message. |
| `src/features/items/components/itemForm.tsx` | Active checkbox; RPC argument mapping/UUID response; preserved image workflow. |
| `src/features/items/components/itemCard.tsx` | Narrow storefront type and out-of-stock label; no quantity display. |
| `src/features/items/item.api.ts` | Separate public/admin reads, RPC saves, and active-only detail reads. |
| `src/features/items/item.query.ts` | Separate storefront/admin query keys and authenticated admin query. |
| `src/features/items/item.schema.ts` | Active boolean form validation. |
| `src/features/items/item.types.ts` | Narrow public/admin/cart types and save input type. |
| `src/features/cart/AddToCartButton.tsx` | Disable unavailable-item actions and show out-of-stock state. |
| `src/features/cart/cart.api.ts` | Reject unavailable product snapshots before adding to the local cart. |
| `tests/adminResponsiveList.test.mjs` | Assert mobile quantity labels, zero quantities, and inactive state. |
| `supabase/migrations/20261022192422_secure_item_commands_and_admin_inventory.sql` | Exact applied database migration. |
| `supabase/tests/item_inventory.sql` | Repeatable rollback-only database verification. |
| `docs/ITEM_INVENTORY_CHANGE_REPORT.md` | This report. |

Scratch work and build output are not committed. No supplier changes remain in the final diff. No dependencies, image service, checkout logic, stock-writing functions, or hosting workflow were changed.

## Verification

- Production TypeScript/Vite build passed. Vite reports its existing large-chunk warning.
- ESLint passed.
- `npm test` passed all three test files, including the updated responsive-list assertions.
- Ran the committed SQL test against Supabase: passed aggregation across distinct batches/expiry dates; null/zero stock; default/inactive staff filtering; save/update/active preservation/audit attribution; invalid-price rejection; customer write/inventory denial; anonymous visibility/availability/stock denial; public response shape and execution restrictions. Test records were rolled back.
- Catalog checks confirmed RLS enabled, intended function modes/grants, one save signature, and zero column-specific grants for these tables/roles.
- No interactive authenticated browser session was used for this task.

## Existing gaps and limits

- The connected database does **not** have `public.cart_checkout(jsonb,uuid,boolean)`, although this branch already contains its caller, migration, and types. That pre-existing deployment gap was verified through the catalog, not logs. The checkout migration was not applied as part of this item/inventory change. The cart-button checks do not repair it.
- Quantity on hand deliberately includes all batches, including expired batches. Boolean availability uses the same sum; the existing checkout migration separately excludes expired stock. Thus positive on-hand availability does not guarantee a successful checkout.
- Admin quantities refresh on query refetch or the new refresh button; no Realtime subscription was introduced. Existing API row limits still apply to list results.
- Direct table reads of the legacy stored `is_stocked` column are not authoritative; use the new read functions for current availability.
- The security advisor still reports existing mutable-search-path functions (`add_item_with_category_name`, `process_secure_purchase`, `custom_access_token_hook`), exposed privileged functions (`authorize`, `handle_new_user_role`, `process_secure_purchase`), RLS tables without policies (`cart`, `games`), and disabled leaked-password protection. These broader issues were not rewritten here. The old item-creation function is now inaccessible to ordinary callers, but its retained definition can still be flagged.
- Advisor references: https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable ; https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable ; https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable ; https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy ; https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection
