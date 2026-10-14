import { createFileRoute } from "@tanstack/react-router";
import UnitDatagrid from "../../features/units/components/unitDatagrid";

export const Route = createFileRoute("/admin/units")({component: UnitDatagrid});
