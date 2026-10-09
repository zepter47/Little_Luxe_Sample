import { createFileRoute } from "@tanstack/react-router";
import SupplierDatagrid from "../../features/suppliers/components/supplierDatagrid";
export const Route = createFileRoute("/admin/suppliers")({component: SupplierDatagrid});

