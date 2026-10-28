import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Paper, Stack, Typography } from "@mui/material";
import { useAuth } from "../../auth/auth";
import LabeledTextField from "./LabeledTextField";
import type { OrderRow, OrderStatus } from "../order.types";
import { allowedActions } from "../order.model";
import { getOrderDetailsQueryOption, getOrderTimelineQueryOption, updateOrderStatusMutationOption } from "../order.query";
const label = (s: OrderStatus) =>
  s === "delivered"
    ? "Confirm delivery and cash received"
    : s === "processed"
      ? "Process order"
      : s === "shipped"
        ? "Ship order"
        : "Decline order";
export default function OrderView({
  order,
  orderId,
  staff,
  onClose,
}: {
  order?: OrderRow;
  orderId: string;
  staff: boolean;
  onClose: () => void;
}) {
  const { user } = useAuth();
  const details = useQuery(getOrderDetailsQueryOption(user?.id || "", orderId));
  const timeline = useQuery(getOrderTimelineQueryOption(user?.id || "", orderId, staff));
  const [action, setAction] = useState<OrderStatus | null>(null);
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const client = useQueryClient();
  const mutation = useMutation(updateOrderStatusMutationOption(client));
  async function submitAction(status: OrderStatus) {
    try {
      const result = await mutation.mutateAsync({orderId, status, reason});
      setAction(null);
      setReason("");
      setMessage(result.outcome === "expired"
        ? "Order expired and its reservations were released."
        : result.outcome === "unchanged" ? "Order was already in that status." : "Order updated.");
    } catch { /* Retain the action dialog and show its error. */ }
  }
  return (
    <Dialog
      open
      fullWidth
      maxWidth="md"
      onClose={() => {
        if (!mutation.isPending) onClose();
      }}
    >
      <DialogTitle>Order details</DialogTitle>
      <DialogContent>
        <Stack spacing={2}>
          {message && <Alert severity="info">{message}</Alert>}
          {mutation.error && (
            <Alert severity="error">{mutation.error.message}</Alert>
          )}
          {!order && (
            <Alert severity="info">
              This order has left the current list. Its history remains
              available.
            </Alert>
          )}
          {order && (
            <>
              <Typography>Customer: {order.customer_id}</Typography>
              <Typography>
                Status: {order.order_status} · Origin: {order.order_origin}
              </Typography>
              {staff && <Typography>Added by: {order.added_by}</Typography>}
            </>
          )}
          {(details.isPending || timeline.isPending) && (
            <CircularProgress aria-label="Loading order details" />
          )}
          {(details.error || timeline.error) && (
            <Alert severity="error">
              {(details.error || timeline.error)?.message}
              <Button
                onClick={() => {
                  void details.refetch();
                  void timeline.refetch();
                }}
              >
                Retry
              </Button>
            </Alert>
          )}
          {details.data?.map((d) => (
            <Typography key={d.order_details_id}>
              {d.item?.item_name || d.item_id} × {d.quantity_sold} @{" "}
              {d.sale_price}
            </Typography>
          ))}
          <Typography>
            Total:{" "}
            {details.data
              ?.reduce(
                (sum, d) => sum + (d.quantity_sold || 0) * (d.sale_price || 0),
                0,
              )
              .toLocaleString()}
          </Typography>
          {staff && order && (
            <Stack direction="row" sx={{ flexWrap: "wrap", gap: 1 }}>
              {allowedActions(order.order_origin, order.order_status).map(
                (s) => (
                  <Button
                    key={s}
                    disabled={mutation.isPending}
                    color={s === "declined" ? "error" : "primary"}
                    onClick={() => {
                      setReason("");
                      setAction(s);
                    }}
                  >
                    {label(s)}
                  </Button>
                ),
              )}
            </Stack>
          )}
          <Typography variant="h6">Status history</Typography>
          {timeline.data?.map((h) => (
            <Paper key={h.history_id} variant="outlined" sx={{ p: 1 }}>
              <Typography>
                {h.previous_status ? `${h.previous_status} → ` : ""}
                {h.new_status} · {new Date(h.changed_on).toLocaleString()}
              </Typography>
              {"reason_code" in h &&
                "change_source" in h &&
                "changed_by" in h &&
                "reason_notes" in h && (
                  <Typography>
                    {String(h.reason_code)} · {String(h.change_source)} ·{" "}
                    {String(h.changed_by || "System")}
                    {h.reason_notes ? ` · ${h.reason_notes}` : ""}
                  </Typography>
                )}
            </Paper>
          ))}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button disabled={mutation.isPending} onClick={onClose}>
          Close
        </Button>
      </DialogActions>
      <Dialog
        open={action !== null}
        onClose={() => {
          if (!mutation.isPending) setAction(null);
        }}
      >
        <DialogTitle>{action ? label(action) : "Confirm action"}</DialogTitle>
        <DialogContent>
          <Stack spacing={2}>
            <Typography>
              Are you sure?{" "}
              {action === "delivered"
                ? "Confirm that the customer has received the goods and staff have received the cash."
                : ""}
            </Typography>
            {action === "declined" && (
              <LabeledTextField
                fullWidth
                label="Reason for decline"
                required
                multiline
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            )}
            {mutation.error && (
              <Alert severity="error">{mutation.error.message}</Alert>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button disabled={mutation.isPending} onClick={() => setAction(null)}>
            No
          </Button>
          <Button
            disabled={
              mutation.isPending || (action === "declined" && !reason.trim())
            }
            onClick={() => {
              if (action) void submitAction(action);
            }}
          >
            Yes
          </Button>
        </DialogActions>
      </Dialog>
    </Dialog>
  );
}
