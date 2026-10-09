import { createFileRoute } from "@tanstack/react-router";
import CategoryDatagrid from "../../features/Categories/Components/categoryDatagrid";
export const Route = createFileRoute("/admin/categories")({component: CategoryDatagrid});

