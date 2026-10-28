import { createFileRoute } from "@tanstack/react-router";
import Units from "../../features/units/Units";
export const Route = createFileRoute("/admin/units")({component: Units});
