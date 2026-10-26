import { createFileRoute, redirect } from "@tanstack/react-router";
import { canManageStore } from "../features/auth/auth.types";
import OrderDashboard from "../features/orders/OrderDashboard";
export const Route = createFileRoute("/dashboard")({
  beforeLoad: ({ context }) => {
    if (!context.auth.isAuthenticated) throw redirect({ to: "/login" });
  },
  component: Dashboard,
});
function Dashboard() {
  const { auth } = Route.useRouteContext();
  return <OrderDashboard key={auth.userId} staff={canManageStore(auth)} />;
}
