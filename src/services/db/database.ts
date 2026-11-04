import { Dexie, type Table, type EntityTable } from "dexie";

import type { CheckoutResult } from "../../features/cart/cart.types";
import type { CartItem } from "../../features/cart/cart.types";

import type { PurchaseDraft } from '../../features/purchases/purchase.draft.schema';
import type { StaffOrderDraft } from '../../features/orders/staffOrder.draft.schema';
import type { ItemDraft } from '../../features/items/item.draft.schema';

interface Product {
  id?: number;
  name: string;
  price: number;
  description: string;
}

//creating the database
export const db = new Dexie("ProductsDatabase") as Dexie & {
    purchaseDraft: Table<PurchaseDraft, string>;
    staffOrderDraft: Table<StaffOrderDraft, string>;
    itemsDraft: Table<ItemDraft, string>;
    productsStore:EntityTable<Product, "id">;
    cartItems: Table<CartItem, [string, string]>;
    checkoutAttempts: EntityTable<{ userId: string; items: CartItem[]; quote: CheckoutResult; requestId: string }, "userId">
};

//schema declaration
db.version(1).stores({
    productsStore: "++id, name, price"
});


// A product is unique within each authenticated account.
db.version(2).stores({ cartItems: "[userId+itemId], userId" });

db.version(3).stores({ checkoutAttempts: "userId" });


// One unfinished creation form of each kind per authenticated account.
// Existing cart and checkout stores remain intact during this upgrade.
db.version(4).stores({
    purchaseDraft: 'userId, updatedAt',
    staffOrderDraft: 'userId, updatedAt',
    itemsDraft: 'userId, updatedAt',
});
