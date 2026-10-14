import { createFileRoute } from "@tanstack/react-router";
import ItemCollection from "../../features/items/components/itemCollection";

export const Route = createFileRoute("/products/")({component: ItemCollection});
