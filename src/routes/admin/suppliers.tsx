import { createFileRoute } from "@tanstack/react-router";
import Suppliers from "../../features/suppliers/Suppliers";
export const Route = createFileRoute("/admin/suppliers")({component: Suppliers});
