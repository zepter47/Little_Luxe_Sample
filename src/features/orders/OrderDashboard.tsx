import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Alert, Button, CircularProgress, Stack, Typography } from "@mui/material";
import { useAuth } from "../auth/auth";
import { getOrdersQueryOption } from "./order.query";
import OrderView from "./components/OrderView";
import StaffOrderForm from "./components/StaffOrderForm";
import OrderList from "./components/OrderList";
export default function OrderDashboard({
  staff,
  deliveredOnly = false,
}: {
  staff: boolean;
  deliveredOnly?: boolean;
}) {
  const { user } = useAuth();
  const [history, setHistory] = useState(deliveredOnly);
  const [selected, setSelected] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const query = useQuery(getOrdersQueryOption(user?.id || "", history, staff));
  const rows = (query.data || []).filter(
    (o) => !deliveredOnly || o.order_status === "delivered",
  );
  return (
    <Stack spacing={2}>
      <Typography component="h1" variant="h4">
        {deliveredOnly ? "Delivered orders" : "Dashboard / Notifications"}
      </Typography>
      <Stack direction="row" spacing={1}>
        {!deliveredOnly && (
          <Button
            onClick={() => {
              setHistory(!history);
              setSelected(null);
            }}
          >
            {history ? "Active orders" : "Order history"}
          </Button>
        )}
        <Button onClick={() => void query.refetch()}>Refresh</Button>
        {staff && (
          <Button variant="contained" onClick={() => setCreating(true)}>
            New staff order
          </Button>
        )}
      </Stack>
      {query.isPending && <CircularProgress aria-label="Loading orders" />}
      {query.error && <Alert severity="error">{query.error.message}</Alert>}
      {query.isSuccess && !rows.length && (
        <Alert severity="info">
          No {history ? "completed or declined" : "active"} orders.
        </Alert>
      )}
      <OrderList rows={rows} onSelect={setSelected} />
      {selected && (
        <OrderView
          order={rows.find((o) => o.order_id === selected)}
          orderId={selected}
          staff={staff}
          onClose={() => setSelected(null)}
        />
      )}
      {creating && <StaffOrderForm onClose={() => setCreating(false)} />}
    </Stack>
  );
}
