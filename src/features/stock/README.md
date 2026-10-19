Stock Management uses the admin panel's `AdminRecordManager`, `AdminResponsiveList`, and `LabeledTextField`. Both management areas use `NavigationStrip` for a single horizontally scrollable row.

The route and primary navigation follow the existing staff/admin access rules. Supabase RLS remains authoritative for reads and writes. Parent records show author email through `stock_author_emails`, rather than exposing Auth admin APIs or privileged keys in the browser. The SQL migration is already applied to the connected project; its version matches Supabase migration history.

Select opens details filtered by the selected parent ID. Save keeps that parent ID fixed, including when editing. Purchases display `invoice_number`; `purchase_id` remains the internal relationship key. Returns use `return_details`, whose IDs must be generated in the client because the database has no default. Quantities must be positive integers and prices nonnegative.

React Query keeps each entity and parent detail list in separate cache entries. Errors retain form values for retry; successful writes invalidate the relevant list. New parent records use the authenticated user's ID for audit data. No service key or Auth admin access is used.
