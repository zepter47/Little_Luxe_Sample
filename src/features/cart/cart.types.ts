export interface CartItem {
  userId: string;
  itemId: string;
  itemName: string;
  salePrice: number;
  quantity: number;
  imagePath: string | null;
}
export interface CheckoutLine { itemId: string; itemName: string; quantity: number; salePrice: number; }
export interface CheckoutResult { orderId?: string; total: number; lines: CheckoutLine[]; }
