import { discountedPrice } from "../../items/item.pricing";
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
import { orderPersonName } from "../order.model";
import type { StaffOrderFormData } from "../order.types";
import { createStaffOrderMutationOption, getOrderCustomersQueryOption, getOrderItemsQueryOption } from "../order.query";

import { useAuth } from '../../auth/auth';
import { useFormDraft } from '../../../services/drafts/useFormDraft';
import { staffOrderDraftRepository } from '../staffOrder.draft';
import StaffOrderDraftStatus from './StaffOrderDraftStatus';

export default function StaffOrderForm({onClose}: {onClose: () => void}) {
  const {user, loading} = useAuth();
  if (loading || !user) return null;
  return <StaffOrderEditor key={user.id} userId={user.id} onClose={onClose} />;
}

function StaffOrderEditor({onClose, userId}: {onClose: () => void; userId: string}) {
  const customers = useQuery(getOrderCustomersQueryOption());
  const items = useQuery(getOrderItemsQueryOption());
  const client = useQueryClient();
  const mutation = useMutation(createStaffOrderMutationOption(client));
  const form = useForm<StaffOrderFormData>({resolver: zodResolver(staffOrderSchema),
    defaultValues: {customer_id: "", notes: "", items: [{lineId: crypto.randomUUID(), item_id: "", quantity: 1, sale_price: 0, original_sale_price: 0, order_discount: 0}]},
  });
  const [approvedDraft, setApprovedDraft] = useState<StaffOrderFormData | null>(null);
  // Request identity is independent of form state; identical retries reuse the same ID.
  const [request, setRequest] = useState({payload: "", id: ""});
  const draft = useFormDraft({userId, form, repository: staffOrderDraftRepository,
    extra: request, restoreExtra: setRequest});
  const [closing, setClosing] = useState(false);
  async function closeKeepingDraft() {
    if (closing) return;
    setClosing(true);
    try {if (draft.finished || await draft.saveNow()) onClose();}
    finally {setClosing(false);}
  }
  async function discardDraft() {
    if (!window.confirm('Discard this staff order draft?')) return;
    setClosing(true);
    try {if (await draft.discard()) onClose();}
    finally {setClosing(false);}
  }
  const saving = useRef(false);
    const [submitting, setSubmitting] = useState(false);
  const pending = mutation.isPending || form.formState.isSubmitting || closing || submitting;
  const disabled = pending || !draft.ready || draft.finished;
  const names = Object.fromEntries((items.data || []).map(item => [item.item_id, item.item_name]));
  async function saveApprovedDraft() {
    if (!approvedDraft || saving.current || disabled) return;
    saving.current = true;
    setSubmitting(true);
    const values = approvedDraft;
    setApprovedDraft(null);
    const submission = {...values, items: values.items.map(({item_id, quantity, sale_price, original_sale_price, order_discount}) => ({item_id, quantity, sale_price, original_sale_price, order_discount}))};
    const payload = JSON.stringify(submission);
    const identity = request.payload === payload ? request : {payload, id: crypto.randomUUID()};
    setRequest(identity);
    try {
      // Persist retry identity BEFORE the request, including across reloads.
      if (!await draft.saveNow({values: form.getValues(), extra: identity})) return;
      await mutation.mutateAsync({customerId: values.customer_id, items: submission.items, requestId: identity.id, notes: values.notes});
      if (await draft.complete()) onClose();
    } catch { /* Preserve every form field and the request ID for a confirmed retry. */ }
    finally {saving.current = false; setSubmitting(false);}
  }
  async function refreshPrices() {
    const result = await items.refetch();
    if (!result.data) return;
    for (const [index, line] of form.getValues("items").entries()) {
      const price = result.data.find(item => item.item_id === line.item_id)?.sale_price;
      if (price !== undefined) {
        form.setValue(`items.${index}.original_sale_price`, price, {shouldDirty: true});
        const discount = line.order_discount ?? 0;
        if (Number.isInteger(discount) && discount >= 0 && discount <= 100)
          form.setValue(`items.${index}.sale_price`, discountedPrice(price, discount), {shouldDirty: true, shouldValidate: true});
      }
    }
  }
  return <Dialog open fullWidth maxWidth="md" onClose={() => {if (!pending) void closeKeepingDraft();}}>
    <FormProvider {...form}>
      <Box component="form" noValidate onBlur={() => {if (draft.ready && !draft.finished) void draft.saveNow();}} onSubmit={form.handleSubmit(values => setApprovedDraft(values))}>
        <DialogTitle>New staff order</DialogTitle>
        <DialogContent><Stack spacing={2} sx={{pt: 1}}>
          <StaffOrderDraftStatus {...draft} disabled={pending}
            onRetry={() => {void (draft.finished ? draft.complete().then(done => {if (done) onClose();}) : draft.saveNow());}}
            onDiscard={() => {void discardDraft();}} />
          <Typography>Select an existing customer. Register new customers in Admin → Customers before creating an order.</Typography>
          {(customers.error || items.error) && <Alert severity="error">{(customers.error || items.error)?.message}
            <Button disabled={disabled} onClick={() => {void customers.refetch(); void items.refetch();}}>Retry</Button></Alert>}
          <Controller name="customer_id" control={form.control} render={({field: {ref, ...field}, fieldState}) =>
            <LabeledTextField {...field} inputRef={ref} label="Customer" select required fullWidth disabled={disabled || customers.isPending}
              error={!!fieldState.error} helperText={fieldState.error?.message}>
              {customers.data?.filter(customer => customer.is_active).map(customer => <MenuItem key={customer.customer_id} value={customer.customer_id}>
                {orderPersonName(customer, "Customer details unavailable")}{customer.phone_number ? ` · ${customer.phone_number}` : ""}
              </MenuItem>)}
            </LabeledTextField>} />
          {customers.isSuccess && !customers.data.some(customer => customer.is_active) && <Alert severity="info">Add an active customer in the Customers tab first.</Alert>}
          <StaffOrderLines items={items.data || []} disabled={disabled || items.isPending} onStructureChange={() => {void draft.saveNow();}} />
          <Controller name="notes" control={form.control} render={({field: {ref, ...field}, fieldState}) =>
            <LabeledTextField {...field} inputRef={ref} label="Order notes" multiline fullWidth disabled={disabled}
              error={!!fieldState.error} helperText={fieldState.error?.message} />} />
          <OrderIssues error={mutation.error} names={names} />
          <Button disabled={disabled || items.isFetching} onClick={() => {void refreshPrices();}}>Refresh current prices</Button>
          <Typography>The order starts as received. Confirm delivery and cash receipt separately after creating it.</Typography>
        </Stack></DialogContent>
        <DialogActions><Button disabled={pending || (!draft.ready && !draft.finished)} onClick={() => {void closeKeepingDraft();}}>Close and keep draft</Button>
          <Button type="submit" disabled={disabled || items.isFetching || !items.data || !customers.data}>Create order</Button></DialogActions>
      </Box>
    </FormProvider>
    <StaffOrderConfirmation open={approvedDraft !== null} pending={pending}
      onNo={() => setApprovedDraft(null)} onYes={() => {void saveApprovedDraft();}} />
  </Dialog>;
}

