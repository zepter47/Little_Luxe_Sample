Stock Management uses the admin panel's `AdminRecordManager`, `AdminResponsiveList`, and `LabeledTextField`. Both management areas use `NavigationStrip` for a single horizontally scrollable row.

The route and primary navigation follow the existing staff/admin access rules. Supabase RLS remains authoritative for reads and writes. Parent records show author email through `stock_author_emails`, rather than exposing Auth admin APIs or privileged keys in the browser. The SQL migration is already applied to the connected project; its version matches Supabase migration history.

Select opens details filtered by the selected parent ID. Save keeps that parent ID fixed, including when editing. Purchases display `invoice_number`; `purchase_id` remains the internal relationship key. Returns use `return_details`; bulk creation generates its IDs in the RPC, and the individual detail form generates IDs in the client because the table has no default. Quantities must be positive integers and prices nonnegative.

React Query keeps each entity and parent detail list in separate cache entries. Errors retain form values for retry; successful writes invalidate the relevant list. New parent records use the authenticated user's ID for audit data. No service key or Auth admin access is used.

Add opens `StockDocumentForm`, with parent information once at the top and repeatable, editable item lines underneath. Every line has quantity, price (cost for purchases, sale for orders), batch and expiry fields, plus a calculated total. A summary shows total quantity and document value. The form uses full-screen cards on narrow screens and a wider document/summary layout on desktop.

`create_stock_document` saves the parent and every child in one transaction, under the caller's existing RLS permissions (`SECURITY INVOKER`). At least one valid line is required. A failed child rolls back the whole document. A stable draft document UUID prevents duplicate parents if the same request is resubmitted. Errors preserve the whole draft. Parent-only saves are restricted to editing existing records.

Returns select items from the chosen original order; batch/expiry and displayed price come from that order line. Quantities within the draft cannot exceed that original line's sold quantity. Return value is calculated for display from original sale prices; no price column is invented in `return_details`.

Run `npm test` for validation, totals and payload checks. `tests/stockDocument.integration.sql` verifies multi-line writes and complete rollback using the existing admin role and item; it rolls back all test data. Browser verification uses mocked Supabase requests so UI tests do not write business records.
