import { useRef } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Typography } from "@mui/material";
import LabeledTextField from "./LabeledTextField";
import { orderStatusSchema } from "../order.schema";
import { orderActionLabel } from "../order.model";
import { updateOrderStatusMutationOption } from "../order.query";
import type { OrderStatus, OrderStatusFormData } from "../order.types";

export default function OrderStatusForm({orderId, action, onSaved, onCancel}: {
  orderId: string; action: OrderStatus; onSaved: (message: string) => void; onCancel: () => void;
}) {
  const client = useQueryClient();
  const mutation = useMutation(updateOrderStatusMutationOption(client));
  const saving = useRef(false);
  const {control, register, handleSubmit, formState: {isSubmitting}} = useForm<OrderStatusFormData>({
    resolver: zodResolver(orderStatusSchema), defaultValues: {status: action, reason: ""},
  });
  const pending = isSubmitting || mutation.isPending;
  async function submit(values: OrderStatusFormData) {
    if (saving.current) return;
    saving.current = true;
    try {
      const result = await mutation.mutateAsync({orderId, status: values.status, reason: values.reason});
      onSaved(result.outcome === "expired" ? "Order expired and its reservations were released."
        : result.outcome === "unchanged" ? "Order was already in that status." : "Order updated.");
    } catch { /* Keep the action and reason for correction or retry. */ }
    finally {saving.current = false;}
  }
  return <Dialog open onClose={() => {if (!pending) onCancel();}} aria-labelledby="order-status-title">
    <Box component="form" noValidate onSubmit={event => {void handleSubmit(submit)(event);}}>
      <DialogTitle id="order-status-title">{orderActionLabel(action)}</DialogTitle>
      <DialogContent><Stack spacing={2}>
        <Typography>Are you sure? {action === "delivered" ? "Confirm that the customer has received the goods and staff have received the cash." : ""}</Typography>
        <input type="hidden" {...register("status")} />
        {action === "declined" && <Controller name="reason" control={control} render={({field: {ref, ...field}, fieldState}) =>
          <LabeledTextField {...field} inputRef={ref} label="Reason for decline" required multiline fullWidth disabled={pending}
            error={!!fieldState.error} helperText={fieldState.error?.message} />} />}
        {mutation.error && <Alert severity="error">{mutation.error.message}</Alert>}
      </Stack></DialogContent>
      <DialogActions><Button autoFocus disabled={pending} onClick={onCancel}>No</Button>
        <Button type="submit" disabled={pending}>Yes</Button></DialogActions>
    </Box>
  </Dialog>;
}
