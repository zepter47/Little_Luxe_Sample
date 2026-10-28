import { createFileRoute } from "@tanstack/react-router";
import Items from "../../features/items/Items";
export const Route = createFileRoute("/admin/")({component: Items});

