# Local form drafts

Creation forms for items, purchases, and staff-originated orders recover unfinished
work through Dexie/IndexedDB. The components still mount/unmount normally, and
React Hook Form manages editing and submission validation.

## Storage and ownership

`src/services/db/database.ts` upgrades `ProductsDatabase` from version 3 to 4,
adding exactly three stores:

| Store | Record contents |
| --- | --- |
| `purchaseDraft` | Purchase header and nested `values.lines` |
| `staffOrderDraft` | Customer, notes, nested `values.items`, submission retry identity |
| `itemsDraft` | Item fields, selected File objects, and partial-upload recovery state |

Each store's primary key is `userId`: one unfinished creation draft per form kind
per authenticated user. Forms use the existing cart authentication source and
key their editor by authenticated user ID. They never look up a global "latest"
draft. Changing accounts remounts the editor without displaying the previous
account's values. Existing cart and checkout stores are retained.

Line objects carry a local `lineId`, separate from React Hook Form's row key and
server record IDs. Adding, changing, removing, and reordering lines is ordinary
form-array editing followed by an atomic put of the complete parent record.
Local line IDs are excluded from staff-order RPC line payloads. Purchase payloads
continue explicitly mapping their existing server fields.

## File responsibilities

| File | Responsibility |
| --- | --- |
| `src/services/drafts/draft.types.ts` | Shared draft envelope and repository contract |
| `src/services/drafts/draft.schema.ts` | Envelope and unfinished-number validation |
| `src/services/drafts/draftRepository.ts` | Ordered, owner-keyed reads/writes/deletes |
| `src/services/drafts/draftAutosaver.ts` | Debounce, maximum wait, write queue, flush, stop |
| `src/services/drafts/useFormDraft.ts` | Restore gate, RHF subscription, lifecycle, discard and completion |
| `src/features/purchases/purchase.draft.schema.ts` | Purchase recovery shape, accepting incomplete fields |
| `src/features/purchases/purchase.draft.ts` | Purchase repository bound to its own store |
| `src/features/orders/staffOrder.draft.schema.ts` | Staff-order recovery shape and retry metadata |
| `src/features/orders/staffOrder.draft.ts` | Staff-order repository |
| `src/features/items/item.draft.schema.ts` | Item recovery shape, File attachments, partial save metadata |
| `src/features/items/item.draft.ts` | Item repository |
| Each feature's `components/*DraftStatus.tsx` | Feature-owned recovery status, errors and discard/cleanup actions |

Feature UI remains independently owned. Shared services contain no feature UI.
The existing confirmation dialogs still gate server writes; automatic local
draft saving does not submit anything to Supabase.

## Saving and recovery

- Changes save after a 500 ms typing pause, with a 3 second maximum wait during
  continuous input. Writes are serialized and use detached structured clones.
- Field blur and line addition/removal flush immediately. Close and keep draft
  waits for a successful write before closing; failures keep the editor open.
- Restoration happens before editing/autosaving is enabled. Unsupported versions
  or malformed records show an error and remain untouched until explicit discard.
- Discard requires confirmation, stops pending saves, drains active writes, and
  deletes only the current user's corresponding record.
- Successful submission stops autosaving, writes a completed marker, and deletes
  the record. If deletion fails, the completed record will not restore as a new
  transaction. The current form disables resubmission and offers cleanup retry.
- Pending writes are drained across component remounts within the same page so a
  rapid reopen waits for the previous instance's closing save.
- Visibility/pagehide flushes and unexpected component cleanup are best effort.

Draft shape validation is deliberately less strict than submission validation.
Empty strings and NaN in unfinished numeric inputs survive restoration. Dates,
UUIDs, quantities, stock, and prices still receive existing submission/server
validation. Stored drafts have an explicit `formatVersion` for future changes.

## Item and staff-order details

Only **item creation** uses `itemsDraft`; edits of existing records continue their
existing behavior. Selected profile/gallery images are stored as File objects,
not object URLs or base64. Object URLs are recreated for previews and revoked
when the preview unmounts.

After item creation succeeds, its returned ID is persisted before uploading
images. Reopening a partial save updates the same item. Successful uploads are
removed from the pending files; failed files remain available for retry.
Discarding a partial draft does not delete an item already saved on the server.

Staff orders persist their confirmed payload identity and request ID before
sending the RPC. Unchanged confirmed retries reuse that ID after reload; changed
payloads get a new ID. Restored values still require the existing Yes/No approval.
Server price/stock validation and the existing Refresh current prices action
remain in place; opening a draft does not silently change its prices.

## Limits

Drafts stay in this browser/device and origin. Browser data clearing, quota,
eviction, or abrupt termination can lose data. In particular, a browser close or
reload immediately after typing can interrupt the last asynchronous write;
`pagehide` is not a durability guarantee. Successful transaction completion is
the point at which a snapshot has been stored locally.

Use one active editor per user and form kind. Ordering is enforced within a page;
this version does not coordinate simultaneous editing of the same draft across
multiple tabs. Local user keys prevent accidental mixing, not access by other
scripts running on the same origin. If all local writes fail after the server
accepts a transaction, even its completed marker cannot be guaranteed; the form
reports that cleanup failure and prevents another submission in that editor.

## Verification

- `npm test`: existing regressions plus debouncing/max-wait, ordered writes,
  failed-save retry, cancellation, owner isolation, incomplete-value/File recovery,
  completed-marker behavior, and malformed-record handling.
- `npm run lint` and `npm run build`.
- `python tests/draftPersistence.browser.py`: real browser IndexedDB upgrade from
  v3, debounce, nested line editing/removal, stable IDs, navigation/close/reload
  recovery, account isolation, image recovery, partial uploads, request-ID retry,
  quota failure/retry, cleanup failure/retry, and incompatible-draft protection.
- Existing `tests/adminForms.browser.py`, `tests/stockFeatures.browser.py`, and
  `tests/orderForms.browser.py` cover unchanged confirmation/submission workflows.

Browser suites use mocked remote APIs only. Build/preview settings are documented
in `tests/cart.browser.py`; no real purchases, items, orders, or image uploads
are created by these tests.
