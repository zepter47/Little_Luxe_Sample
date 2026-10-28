import { useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, MenuItem } from "@mui/material";
import type { Supplier, SupplierFormData } from "../supplier.types";
import { supplierSchema } from "../supplier.schema";
import { saveSupplierMutationOption } from "../supplier.query";
import LabeledTextField from "./LabeledTextField";
import type { SupplierCategory } from "../supplierCategory.types";

export default function SupplierForm({record, categories, onSaved, onCancel}: {
    record?: Supplier; categories: SupplierCategory[]; onSaved: () => void; onCancel: () => void;
}) {
    const client = useQueryClient();
    const mutation = useMutation(saveSupplierMutationOption(client));
    const [approvedDraft, setApprovedDraft] = useState<SupplierFormData | null>(null);
    const saving = useRef(false);
    const {control, handleSubmit, formState: {isSubmitting}} = useForm<SupplierFormData>({
        resolver: zodResolver(supplierSchema), defaultValues: {
            supplier_name: record?.supplier_name || "",
            supplier_cat_id: record?.supplier_cat_id || "",
            supplier_email: record?.supplier_email || "",
            supplier_contact: record?.supplier_contact || "",
            supplier_address: record?.supplier_address || "",
            supplier_notes: record?.supplier_notes || "",
        },
    });
    const pending = mutation.isPending || isSubmitting;
    async function saveApprovedDraft() {
        if (!approvedDraft || saving.current) return;
        saving.current = true;
        const values = approvedDraft;
        setApprovedDraft(null);
        try {await mutation.mutateAsync({id: record?.supplier_id, values}); onSaved();}
        catch { /* Keep the draft and display the save error. */ }
        finally {saving.current = false;}
    }
    return <Dialog open fullWidth maxWidth="sm" onClose={() => {if (!pending) onCancel();}}>
        <Box component="form" noValidate onSubmit={handleSubmit(values => setApprovedDraft(values))}>
            <DialogTitle>{record ? "Edit" : "Add"} supplier</DialogTitle>
            <DialogContent><Stack spacing={2.5} sx={{pt: 1}}>
                {mutation.error && <Alert severity="error">{mutation.error.message}</Alert>}
                <Controller name="supplier_name" control={control} render={({field: {ref, ...field}, fieldState}) =>
                    <LabeledTextField {...field} inputRef={ref} label="Supplier name" required fullWidth disabled={pending}
                        error={!!fieldState.error} helperText={fieldState.error?.message} />} />
                <Controller name="supplier_cat_id" control={control} render={({field: {ref, ...field}, fieldState}) =>
                    <LabeledTextField {...field} inputRef={ref} label="Supplier category" required select fullWidth disabled={pending}
                        error={!!fieldState.error} helperText={fieldState.error?.message}>
                        {categories.map(category => <MenuItem key={category.supplier_category_id} value={category.supplier_category_id}>{category.category_name}</MenuItem>)}
                    </LabeledTextField>} />
                <Controller name="supplier_email" control={control} render={({field: {ref, ...field}, fieldState}) =>
                    <LabeledTextField {...field} inputRef={ref} label="Email" type="email" fullWidth disabled={pending}
                        error={!!fieldState.error} helperText={fieldState.error?.message} />} />
                <Controller name="supplier_contact" control={control} render={({field: {ref, ...field}, fieldState}) =>
                    <LabeledTextField {...field} inputRef={ref} label="Phone" fullWidth disabled={pending}
                        error={!!fieldState.error} helperText={fieldState.error?.message} />} />
                <Controller name="supplier_address" control={control} render={({field: {ref, ...field}, fieldState}) =>
                    <LabeledTextField {...field} inputRef={ref} label="Address" fullWidth disabled={pending}
                        error={!!fieldState.error} helperText={fieldState.error?.message} />} />
                <Controller name="supplier_notes" control={control} render={({field: {ref, ...field}, fieldState}) =>
                    <LabeledTextField {...field} inputRef={ref} label="Notes" multiline minRows={3} fullWidth disabled={pending}
                        error={!!fieldState.error} helperText={fieldState.error?.message} />} />
            </Stack></DialogContent>
            <DialogActions><Button disabled={pending} onClick={onCancel}>Cancel</Button>
                <Button type="submit" variant="contained" disabled={pending}>{pending ? "Saving…" : "Save"}</Button></DialogActions>
        </Box>
        <Dialog open={approvedDraft !== null} onClose={() => setApprovedDraft(null)} aria-labelledby="confirm-supplier-title">
            <DialogTitle id="confirm-supplier-title">Confirm supplier save</DialogTitle>
            <DialogContent>Would you like to save this supplier?</DialogContent>
            <DialogActions><Button autoFocus onClick={() => setApprovedDraft(null)}>No</Button>
                <Button onClick={() => {void saveApprovedDraft();}} disabled={pending}>Yes</Button></DialogActions>
        </Dialog>
    </Dialog>;
}
