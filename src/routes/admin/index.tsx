import { createFileRoute } from "@tanstack/react-router";
import AdminItems from "../../features/admin/components/adminItems";
export const Route = createFileRoute("/admin/")({component: AdminItems});

