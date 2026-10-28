import { useRef, useState } from "react";
import { Controller, FormProvider, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, Typography } from "@mui/material";
import LabeledTextField from "./LabeledTextField";
import OrderIssues from "./OrderIssues";
import StaffOrderLines from "./StaffOrderLines";
import StaffOrderConfirmation from "./StaffOrderConfirmation";
import { staffOrderSchema } from "../order.schema";
import type { StaffOrderFormData } from "../order.types";
import { createStaffOrderMutationOption, getOrderCustomersQueryOption, getOrderItemsQueryOption } from "../order.query";

export default function StaffOrderForm({onClose}: {onClose: () => void}) {
  const customers = useQuery(getOrderCustomersQueryOption());
  const items = useQuery(getOrderItemsQueryOption());
  const client = useQueryClient();
  const mutation = useMutation(createStaffOrderMutationOption(client));
  const form = useForm<StaffOrderFormData>({resolver: zodResolver(staffOrderSchema),
    defaultValues: {customer_id: "", notes: "", items: [{item_id: "", quantity: 1, sale_price: 0}]},
  });
  const [approvedDraft, setApprovedDraft] = useState<StaffOrderFormData | null>(null);
  // Request identity is independent of form state; identical retries reuse the same ID.
  const request = useRef({payload: "", id: ""});
  const saving = useRef(false);
  const pending = mutation.isPending || form.formState.isSubmitting;
  const names = Object.fromEntries((items.data || []).map(item => [item.item_id, item.item_name]));
  async function saveApprovedDraft() {
    if (!approvedDraft || saving.current) return;
    saving.current = true;
    const values = approvedDraft;
    setApprovedDraft(null);
    const payload = JSON.stringify(values);
    if (request.current.payload !== payload) request.current = {payload, id: crypto.randomUUID()};
    try {
      await mutation.mutateAsync({customerId: values.customer_id, items: values.items, requestId: request.current.id, notes: values.notes});
      onClose();
    } catch { /* Preserve every form field and the request ID for a confirmed retry. */ }
    finally {saving.current = false;}
  }
  async function refreshPrices() {
    const result = await items.refetch();
    if (!result.data) return;
    for (const [index, line] of form.getValues("items").entries()) {
      const price = result.data.find(item => item.item_id === line.item_id)?.sale_price;
      if (price !== undefined) form.setValue(`items.${index}.sale_price`, price, {shouldDirty: true, shouldValidate: true});
    }
  }
  return <Dialog open fullWidth maxWidth="md" onClose={() => {if (!pending) onClose();}}>
    <FormProvider {...form}>
      <Box component="form" noValidate onSubmit={form.handleSubmit(values => setApprovedDraft(values))}>
        <DialogTitle>New staff order</DialogTitle>
        <DialogContent><Stack spacing={2} sx={{pt: 1}}>
          <Typography>Select an existing customer. Register new customers in Admin → Customers before creating an order.</Typography>
          {(customers.error || items.error) && <Alert severity="error">{(customers.error || items.error)?.message}
            <Button disabled={pending} onClick={() => {void customers.refetch(); void items.refetch();}}>Retry</Button></Alert>}
          <Controller name="customer_id" control={form.control} render={({field: {ref, ...field}, fieldState}) =>
            <LabeledTextField {...field} inputRef={ref} label="Customer" select required fullWidth disabled={pending || customers.isPending}
              error={!!fieldState.error} helperText={fieldState.error?.message}>
              {customers.data?.filter(customer => customer.is_active).map(customer => <MenuItem key={customer.customer_id} value={customer.customer_id}>
                {[customer.first_name, customer.last_name].filter(Boolean).join(" ") || customer.email || "Customer"} · {customer.phone_number || customer.email || customer.customer_id}
              </MenuItem>)}
            </LabeledTextField>} />
          {customers.isSuccess && !customers.data.some(customer => customer.is_active) && <Alert severity="info">Add an active customer in the Customers tab first.</Alert>}
          <StaffOrderLines items={items.data || []} disabled={pending || items.isPending} />
          <Controller name="notes" control={form.control} render={({field: {ref, ...field}, fieldState}) =>
            <LabeledTextField {...field} inputRef={ref} label="Order notes" multiline fullWidth disabled={pending}
              error={!!fieldState.error} helperText={fieldState.error?.message} />} />
          <OrderIssues error={mutation.error} names={names} />
          {mutation.error && <Button disabled={pending || items.isFetching} onClick={() => {void refreshPrices();}}>Refresh current prices</Button>}
          <Typography>The order starts as received. Confirm delivery and cash receipt separately after creating it.</Typography>
        </Stack></DialogContent>
        <DialogActions><Button disabled={pending} onClick={onClose}>Cancel</Button>
          <Button type="submit" disabled={pending || items.isFetching || !items.data || !customers.data}>Create order</Button></DialogActions>
      </Box>
    </FormProvider>
    <StaffOrderConfirmation open={approvedDraft !== null} pending={pending}
      onNo={() => setApprovedDraft(null)} onYes={() => {void saveApprovedDraft();}} />
  </Dialog>;
}
