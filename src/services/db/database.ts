import { Dexie, type Table, type EntityTable } from "dexie";

import type { CheckoutResult } from "../../features/cart/cart.types";
import type { CartItem } from "../../features/cart/cart.types";

interface Product {
  id?: number;
  name: string;
  price: number;
  description: string;
}

//creating the database
export const db = new Dexie("ProductsDatabase") as Dexie & {
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
