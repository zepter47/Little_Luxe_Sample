import { useRef, useState } from "react";
import SaveConfirmation from "./SaveConfirmation";
import { Controller, useFieldArray, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Paper, Stack, Typography } from '@mui/material';
import LabeledTextField from './LabeledTextField';
import { purchaseSchema } from '../purchase.schema';
import { createPurchaseMutationOption } from '../purchase.query';
import type { PurchaseFormData } from '../purchase.types';

const emptyLine = () => ({item_id: '', quantity: '1', unit_price: '', batch_number: '', expiry_date: ''});
export default function PurchaseForm({items, suppliers, onClose, onSaved}: {
    items: {item_id: string; item_name: string}[];
    suppliers: {supplier_id: string; supplier_name: string}[];
    onClose: () => void; onSaved: () => void;
}) {
    const client = useQueryClient();
    const [approvedDraft, setApprovedDraft] = useState<PurchaseFormData | null>(null);
    const saving = useRef(false);
    const mutation = useMutation(createPurchaseMutationOption(client));
    const {control, handleSubmit, formState: {isSubmitting, errors}} = useForm<PurchaseFormData>({
        resolver: zodResolver(purchaseSchema),
        defaultValues: {invoice_number: '', supplier_id: '', purchase_notes: '', lines: [emptyLine()]},
    });
    const {fields, append, remove} = useFieldArray({control, name: 'lines'});
    const lines = useWatch({control, name: 'lines'});
    const total = lines.reduce((sum, line) => {
        const quantity = Number(line.quantity), price = Number(line.unit_price);
        return sum + (Number.isFinite(quantity) && Number.isFinite(price) ? quantity * Math.round(price * 100) : 0);
    }, 0) / 100;
    const pending = mutation.isPending || isSubmitting;
    async function submit(data: PurchaseFormData) {
        try {
            await mutation.mutateAsync({purchase: {invoice_number: data.invoice_number,
                supplier_id: data.supplier_id || null, purchase_notes: data.purchase_notes || null},
                lines: data.lines.map(line => ({item_id: line.item_id, quantity_bought: Number(line.quantity),
                    cost_price: Number(line.unit_price), batch_number: line.batch_number || null, expiry_date: line.expiry_date || null})),
            });
            onSaved();
        } catch { /* Keep the draft open; display the mutation error. */ }
    }
    async function saveApprovedDraft() {
        if (!approvedDraft || saving.current) return;
        saving.current = true;
        const values = approvedDraft;
        setApprovedDraft(null);
        try {await submit(values);}
        finally {saving.current = false;}
    }
    return <Dialog open fullWidth maxWidth="lg" onClose={() => {if (!pending) onClose();}}>
        <Box component="form" noValidate onSubmit={handleSubmit(values => setApprovedDraft(values))}>
            <DialogTitle>New purchase</DialogTitle>
            <DialogContent><Stack spacing={3} sx={{pt: 1}}>
                {mutation.error && <Alert severity="error">{mutation.error.message}</Alert>}
                <Controller name="invoice_number" control={control} render={({field: {ref, ...field}, fieldState}) =>
                    <LabeledTextField {...field} inputRef={ref} label="Invoice" required disabled={pending} error={!!fieldState.error} helperText={fieldState.error?.message} />} />
                <Controller name="supplier_id" control={control} render={({field: {ref, ...field}, fieldState}) =>
                    <LabeledTextField {...field} inputRef={ref} label="Supplier" select disabled={pending} error={!!fieldState.error} helperText={fieldState.error?.message}>
                        <MenuItem value="">No supplier</MenuItem>
                        {suppliers.map(supplier => <MenuItem key={supplier.supplier_id} value={supplier.supplier_id}>{supplier.supplier_name}</MenuItem>)}
                    </LabeledTextField>} />
                <Controller name="purchase_notes" control={control} render={({field: {ref, ...field}}) =>
                    <LabeledTextField {...field} inputRef={ref} label="Notes" multiline minRows={2} disabled={pending} />} />
                {fields.map((line, index) => <Paper component="fieldset" variant="outlined" key={line.id} sx={{p: 2, minWidth: 0}}>
                    <Typography component="legend">Item {index + 1}</Typography>
                    <Stack spacing={2}>
                        <Controller name={`lines.${index}.item_id`} control={control} render={({field: {ref, ...field}, fieldState}) =>
                            <LabeledTextField {...field} inputRef={ref} label="Item" select required disabled={pending} error={!!fieldState.error} helperText={fieldState.error?.message}>
                                {items.map(item => <MenuItem key={item.item_id} value={item.item_id}>{item.item_name}</MenuItem>)}
                            </LabeledTextField>} />
                        <Box sx={{display: 'grid', gridTemplateColumns: {xs: '1fr', sm: '1fr 1fr'}, gap: 2}}>
                            {(['quantity', 'unit_price', 'batch_number', 'expiry_date'] as const).map(name =>
                                <Controller key={name} name={`lines.${index}.${name}`} control={control} render={({field: {ref, ...field}, fieldState}) =>
                                    <LabeledTextField {...field} inputRef={ref} label={{quantity: 'Quantity bought', unit_price: 'Cost price', batch_number: 'Batch number', expiry_date: 'Expiry date'}[name]}
                                        type={name === 'expiry_date' ? 'date' : name === 'quantity' || name === 'unit_price' ? 'number' : 'text'}
                                        required={name === 'quantity' || name === 'unit_price'} disabled={pending}
                                        slotProps={{htmlInput: {min: name === 'quantity' ? 1 : 0, step: name === 'unit_price' ? 0.01 : 1}}}
                                        error={!!fieldState.error} helperText={fieldState.error?.message} />} />)}
                        </Box>
                        <Button disabled={pending} onClick={() => remove(index)}>Remove item {index + 1}</Button>
                    </Stack>
                </Paper>)}
                {(errors.lines?.root?.message || errors.lines?.message) && <Alert severity="error">{errors.lines.root?.message || errors.lines.message}</Alert>}
                <Button variant="outlined" disabled={pending} onClick={() => append(emptyLine())}>Add item line</Button>
                <Typography aria-live="polite">Grand total: {total.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</Typography>
                <Typography color="text.secondary">The purchase and all its item lines will be saved together.</Typography>
            </Stack></DialogContent>
            <DialogActions><Button disabled={pending} onClick={onClose}>Cancel</Button><Button type="submit" variant="contained" disabled={pending}>{pending ? 'Saving…' : 'Save purchase'}</Button></DialogActions>
        </Box>
        <SaveConfirmation open={approvedDraft !== null} pending={pending} label="purchase"
            onNo={() => setApprovedDraft(null)} onYes={() => {void saveApprovedDraft();}} />
    </Dialog>;
}
