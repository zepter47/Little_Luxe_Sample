import { createFileRoute } from "@tanstack/react-router";
import Returns from "../../features/returns/Returns";

export const Route = createFileRoute("/stock-management/returns")({component: Returns});
