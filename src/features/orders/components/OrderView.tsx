import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Alert, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Stack } from "@mui/material";
import { useAuth } from "../../auth/auth";
import type { OrderRow, OrderStatus } from "../order.types";
import { allowedActions, orderActionLabel } from "../order.model";
import { getOrderDetailsQueryOption, getOrderPeopleQueryOption, getOrderTimelineQueryOption } from "../order.query";
import OrderSummary from "./OrderSummary";
import OrderTimeline from "./OrderTimeline";
import OrderStatusForm from "./OrderStatusForm";

export default function OrderView({order, orderId, staff, onClose}: {
  order?: OrderRow; orderId: string; staff: boolean; onClose: () => void;
}) {
  const {user} = useAuth();
  const details = useQuery(getOrderDetailsQueryOption(user?.id || "", orderId));
  const timeline = useQuery(getOrderTimelineQueryOption(user?.id || "", orderId, staff));
  const people = useQuery(getOrderPeopleQueryOption(user?.id || "", [order?.customer_id,
    ...(staff ? [order?.added_by, ...(timeline.data || []).flatMap(entry => "changed_by" in entry ? [entry.changed_by] : [])] : []),
  ]));
  const [action, setAction] = useState<OrderStatus | null>(null);
  const [message, setMessage] = useState("");
  const error = details.error || timeline.error;
  return <Dialog open fullWidth maxWidth="md" onClose={() => {if (!action) onClose();}}>
    <DialogTitle>Order details</DialogTitle>
    <DialogContent><Stack spacing={2}>
      {message && <Alert severity="info">{message}</Alert>}
      {(details.isPending || timeline.isPending) && <CircularProgress aria-label="Loading order details" />}
      {error && <Alert severity="error">{error.message}<Button onClick={() => {void details.refetch(); void timeline.refetch();}}>Retry</Button></Alert>}
      {people.error && <Alert severity="warning">Some names could not be loaded.<Button onClick={() => {void people.refetch();}}>Retry names</Button></Alert>}
      <OrderSummary order={order} details={details.data || []} staff={staff} people={people.data || []} />
      {staff && order && <Stack direction="row" sx={{flexWrap: "wrap", gap: 1}}>
        {allowedActions(order.order_origin, order.order_status).map(status => <Button key={status} disabled={!!action}
          color={status === "declined" ? "error" : "primary"} onClick={() => setAction(status)}>{orderActionLabel(status)}</Button>)}
      </Stack>}
      <OrderTimeline entries={timeline.data || []} staff={staff} people={people.data || []} />
    </Stack></DialogContent>
    <DialogActions><Button disabled={!!action} onClick={onClose}>Close</Button></DialogActions>
    {action && <OrderStatusForm orderId={orderId} action={action} onCancel={() => setAction(null)}
      onSaved={result => {setMessage(result); setAction(null);}} />}
  </Dialog>;
}
