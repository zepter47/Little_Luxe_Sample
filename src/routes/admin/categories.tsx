import { createFileRoute } from "@tanstack/react-router";
import Categories from "../../features/Categories/Categories";
export const Route = createFileRoute("/admin/categories")({component: Categories});
