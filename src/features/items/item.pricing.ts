/** Whole-shilling UGX pricing. Round half up once, at unit-price level. */
export function discountedPrice(original: number, discount = 0): number {
  if (!Number.isSafeInteger(original) || original < 0 || !Number.isInteger(discount) || discount < 0 || discount > 100) {
    throw new Error("Enter a whole-shilling price and a whole discount from 0 to 100.");
  }
  return Number((BigInt(original) * BigInt(100 - discount) + 50n) / 100n);
}
export const formatUGX = (price: number) => `UGX ${price.toLocaleString('en-UG', {maximumFractionDigits: 0})}`;
