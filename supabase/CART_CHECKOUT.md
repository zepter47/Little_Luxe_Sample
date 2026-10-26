# Order workflow

The previous `cart_checkout` / `checkout.api.ts` implementation is retired. The
replacement is installed in hosted Supabase, including customer provisioning,
reservations, order lifecycle, history, and scheduled expiry.

See [the implementation and deployment report](../docs/ORDER_IMPLEMENTATION.md).
Orders reserve stock; delivery with cash receipt deducts physical stock.
