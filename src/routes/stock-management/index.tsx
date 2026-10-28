import { createFileRoute } from "@tanstack/react-router";
import OrderDashboard from "../../features/orders/OrderDashboard";

export const Route = createFileRoute("/stock-management/")({component: StockOrders});
function StockOrders() {return <OrderDashboard staff deliveredOnly />;}
