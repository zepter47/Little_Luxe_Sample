# Discount pricing

Selling prices use whole Uganda shillings (UGX). Discounts are whole percentages from 0 through 100, defaulting to zero. A 100% discount is free; markups and negative charges are prohibited.

Calculate `round(original_sale_price * (100 - discount) / 100)`, rounding half up to a whole shilling at unit-price level before multiplying by quantity. The frontend uses integer arithmetic to match PostgreSQL numeric calculations.

Online discounts come from `item.item_discount`, configured in the admin item form. Item cards and details display an exact discount badge, struck-through original price and final price when the percentage is positive. Staff orders use the entered percentage against the original catalogue price. Staff discounts replace online promotions and do not stack. The final price input stays read-only.

The server derives original prices and online discounts from locked item rows. It checks submitted pricing context before creating orders or reserving inventory. Price refreshes require a new order confirmation. Existing staff identity, permissions, inventory lifecycle and request idempotency remain in use.

New order lines retain immutable `original_sale_price`, `order_discount` and the actual charged `sale_price`. Order summaries use these historical values. Legacy lines keep their charged price, with NULL original price because that snapshot was not recorded. All new inserts require the original-price snapshot.

Item and staff drafts persist discounts. Old item drafts default to zero; old staff drafts without the field behave as zero-discount drafts. Carts retain the displayed discounted price and pricing context. Old carts still submit their saved price for server validation. Identical confirmed retries reuse their request key; changed payloads get a new key.

For backwards compatibility, `save_item` preserves an existing item's discount when callers omit its optional `p_item_discount` argument. New items default to zero.

## Validation

Run `npm run build`, `npm run lint`, `npm test`, and `npm run test:orders`. The database suite uses isolated PGlite, never hosted business data. Browser checks are `python tests/orderForms.browser.py` and `python tests/cart.browser.py`; their headers describe mocked API build/preview setup.
