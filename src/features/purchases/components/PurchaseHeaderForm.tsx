import { useRef, useState } from "react";
import SaveConfirmation from "./SaveConfirmation";
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack } from '@mui/material';
import { purchaseSchema } from '../purchase.schema';
import type { Purchase, PurchaseFormData } from '../purchase.types';
import { updatePurchaseMutationOption } from '../purchase.query';
import LabeledTextField from './LabeledTextField';

type HeaderData = Pick<PurchaseFormData, 'invoice_number' | 'supplier_id' | 'purchase_notes'>;
const headerSchema = purchaseSchema.pick({invoice_number: true, supplier_id: true, purchase_notes: true});
export default function PurchaseHeaderForm({purchase, suppliers, onClose}: {
    purchase: Purchase; suppliers: {supplier_id: string; supplier_name: string}[]; onClose: () => void;
}) {
    const client = useQueryClient();
    const [approvedDraft, setApprovedDraft] = useState<HeaderData | null>(null);
    const saving = useRef(false);
    const mutation = useMutation(updatePurchaseMutationOption(client));
    const {control, handleSubmit} = useForm<HeaderData>({resolver: zodResolver(headerSchema), defaultValues: {
        invoice_number: purchase.invoice_number, supplier_id: purchase.supplier_id || '', purchase_notes: purchase.purchase_notes || '',
    }});
    async function submit(data: HeaderData) {
        try {await mutation.mutateAsync({id: purchase.purchase_id, purchase: data}); onClose();}
        catch { /* Display the mutation error and preserve the draft. */ }
    }
    async function saveApprovedDraft() {
        if (!approvedDraft || saving.current) return;
        saving.current = true;
        const values = approvedDraft;
        setApprovedDraft(null);
        try {await submit(values);}
        finally {saving.current = false;}
    }
    return <Dialog open fullWidth maxWidth="sm" onClose={() => {if (!mutation.isPending) onClose();}}>
        <Box component="form" noValidate onSubmit={handleSubmit(values => setApprovedDraft(values))}>
            <DialogTitle>Edit purchase</DialogTitle>
            <DialogContent><Stack spacing={2} sx={{pt: 1}}>
                {mutation.error && <Alert severity="error">{mutation.error.message}</Alert>}
                <Controller name="invoice_number" control={control} render={({field: {ref, ...field}, fieldState}) =>
                    <LabeledTextField {...field} inputRef={ref} label="Invoice" required disabled={mutation.isPending} error={!!fieldState.error} helperText={fieldState.error?.message} />} />
                <Controller name="supplier_id" control={control} render={({field: {ref, ...field}, fieldState}) =>
                    <LabeledTextField {...field} inputRef={ref} label="Supplier" select disabled={mutation.isPending} error={!!fieldState.error} helperText={fieldState.error?.message}>
                        <MenuItem value="">No supplier</MenuItem>{suppliers.map(row => <MenuItem key={row.supplier_id} value={row.supplier_id}>{row.supplier_name}</MenuItem>)}
                    </LabeledTextField>} />
                <Controller name="purchase_notes" control={control} render={({field: {ref, ...field}}) => <LabeledTextField {...field} inputRef={ref} label="Notes" multiline disabled={mutation.isPending} />} />
            </Stack></DialogContent>
            <DialogActions><Button disabled={mutation.isPending} onClick={onClose}>Cancel</Button><Button type="submit" disabled={mutation.isPending}>Save</Button></DialogActions>
        </Box>
        <SaveConfirmation open={approvedDraft !== null} pending={mutation.isPending} label="purchase"
            onNo={() => setApprovedDraft(null)} onYes={() => {void saveApprovedDraft();}} />
    </Dialog>;
}
