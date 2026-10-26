import { createFileRoute } from "@tanstack/react-router";
import Customers from "../../features/customers/Customers";
export const Route = createFileRoute("/admin/customers")({
  component: Customers,
});
