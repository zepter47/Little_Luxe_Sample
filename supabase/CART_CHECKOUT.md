# Order workflow

The previous `cart_checkout` / `checkout.api.ts` implementation is retired. See
[the implementation report](../docs/ORDER_IMPLEMENTATION.md) for the replacement,
local verification, and deployment steps. Orders reserve stock; delivery with
cash receipt deducts physical stock. No hosted changes were made during implementation.
