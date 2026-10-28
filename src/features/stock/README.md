Stock Management owns navigation only. Like admin, its guarded parent route
renders navigation and an Outlet for child routes:

- /stock-management: delivered orders (index)
- /stock-management/purchases: purchases
- /stock-management/returns: UI-only returns

Links preserve selection in the URL, including reloads and browser history.

Purchases and orders own their API, query configuration, types, validation,
forms, lists, detail views, and styles. Returns currently contains UI only.
Do not add purchase/order/return database calls, field mappings, or form logic
here, or import UI from admin.

Purchases are created atomically through the existing create_purchase RPC.
Their lines remain read-only after creation. Orders continue to use their
dedicated creation and status RPCs. Returns has only a placeholder screen and
disabled Add button, with no data access, form submission, or edit workflow.
