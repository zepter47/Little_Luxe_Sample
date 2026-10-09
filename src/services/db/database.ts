import { Dexie, type EntityTable } from "dexie";

interface Product {
  id?: number;
  name: string;
  price: number;
  description: string;
}

//creating the database
export const db = new Dexie("ProductsDatabase") as Dexie & {
    productsStore:EntityTable<Product, "id">
};

//schema declaration
db.version(1).stores({
    productsStore: "++id, name, price"
});

