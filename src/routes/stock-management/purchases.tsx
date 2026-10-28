import { createFileRoute } from "@tanstack/react-router";
import Purchases from "../../features/purchases/Purchases";

export const Route = createFileRoute("/stock-management/purchases")({component: Purchases});
