import { useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Checkbox, FormControlLabel } from "@mui/material";
import type { Customer, CustomerFormData } from "../customer.types";
import { customerSchema } from "../customer.schema";
import { saveCustomerMutationOption } from "../customer.query";
import LabeledTextField from "./LabeledTextField";

export default function CustomerForm({record, onSaved, onCancel}: {
    record?: Customer; onSaved: () => void; onCancel: () => void;
}) {
    const client = useQueryClient();
    const mutation = useMutation(saveCustomerMutationOption(client));
    const [approvedDraft, setApprovedDraft] = useState<CustomerFormData | null>(null);
    const saving = useRef(false);
    const {control, handleSubmit, formState: {isSubmitting}} = useForm<CustomerFormData>({
        resolver: zodResolver(customerSchema), defaultValues: {
            first_name: record?.first_name || "",
            last_name: record?.last_name || "",
            email: record?.email || "",
            phone_number: record?.phone_number || "",
            address: record?.address || "",
            customer_notes: record?.customer_notes || "",
            is_active: record?.is_active ?? true,
        },
    });
    const pending = mutation.isPending || isSubmitting;
    async function saveApprovedDraft() {
        if (!approvedDraft || saving.current) return;
        saving.current = true;
        const values = approvedDraft;
        setApprovedDraft(null);
        try {await mutation.mutateAsync({id: record?.customer_id, values}); onSaved();}
        catch { /* Keep the draft and display the save error. */ }
        finally {saving.current = false;}
    }
    return <Dialog open fullWidth maxWidth="sm" onClose={() => {if (!pending) onCancel();}}>
        <Box component="form" noValidate onSubmit={handleSubmit(values => setApprovedDraft(values))}>
            <DialogTitle>{record ? "Edit" : "Add"} customer</DialogTitle>
            <DialogContent><Stack spacing={2.5} sx={{pt: 1}}>
                {mutation.error && <Alert severity="error">{mutation.error.message}</Alert>}
                <Controller name="first_name" control={control} render={({field: {ref, ...field}, fieldState}) =>
                    <LabeledTextField {...field} inputRef={ref} label="First name" required fullWidth disabled={pending}
                        error={!!fieldState.error} helperText={fieldState.error?.message} />} />
                <Controller name="last_name" control={control} render={({field: {ref, ...field}, fieldState}) =>
                    <LabeledTextField {...field} inputRef={ref} label="Last name" required fullWidth disabled={pending}
                        error={!!fieldState.error} helperText={fieldState.error?.message} />} />
                <Controller name="email" control={control} render={({field: {ref, ...field}, fieldState}) =>
                    <LabeledTextField {...field} inputRef={ref} label="Email" type="email" fullWidth disabled={pending}
                        error={!!fieldState.error} helperText={fieldState.error?.message} />} />
                <Controller name="phone_number" control={control} render={({field: {ref, ...field}, fieldState}) =>
                    <LabeledTextField {...field} inputRef={ref} label="Phone number" fullWidth disabled={pending}
                        error={!!fieldState.error} helperText={fieldState.error?.message} />} />
                <Controller name="address" control={control} render={({field: {ref, ...field}, fieldState}) =>
                    <LabeledTextField {...field} inputRef={ref} label="Address" multiline minRows={3} fullWidth disabled={pending}
                        error={!!fieldState.error} helperText={fieldState.error?.message} />} />
                <Controller name="customer_notes" control={control} render={({field: {ref, ...field}, fieldState}) =>
                    <LabeledTextField {...field} inputRef={ref} label="Notes" multiline minRows={3} fullWidth disabled={pending}
                        error={!!fieldState.error} helperText={fieldState.error?.message} />} />
                <Controller name="is_active" control={control} render={({field}) =>
                    <FormControlLabel label="Active" control={<Checkbox checked={field.value} onChange={(_, checked) => field.onChange(checked)} disabled={pending} />} />} />
            </Stack></DialogContent>
            <DialogActions><Button disabled={pending} onClick={onCancel}>Cancel</Button>
                <Button type="submit" variant="contained" disabled={pending}>{pending ? "Saving…" : "Save"}</Button></DialogActions>
        </Box>
        <Dialog open={approvedDraft !== null} onClose={() => setApprovedDraft(null)} aria-labelledby="confirm-customer-title">
            <DialogTitle id="confirm-customer-title">Confirm customer save</DialogTitle>
            <DialogContent>Would you like to save this customer?</DialogContent>
            <DialogActions><Button autoFocus onClick={() => setApprovedDraft(null)}>No</Button>
                <Button onClick={() => {void saveApprovedDraft();}} disabled={pending}>Yes</Button></DialogActions>
        </Dialog>
    </Dialog>;
}
