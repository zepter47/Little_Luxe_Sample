Stock Management owns navigation only. It selects Orders, Purchases, or Item returns.

Purchases and orders own their API, query configuration, types, validation,
forms, lists, detail views, and styles. Returns currently contains UI only.
Do not add purchase/order/return database calls, field mappings, or form logic
here, or import UI from admin.

Purchases are created atomically through the existing create_purchase RPC.
Their lines remain read-only after creation. Orders continue to use their
dedicated creation and status RPCs. Returns has only a placeholder screen and
disabled Add button, with no data access, form submission, or edit workflow.
