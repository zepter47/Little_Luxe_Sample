import { useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack } from "@mui/material";
import type { SupplierCategory, SupplierCategoryFormData } from "../supplierCategory.types";
import { supplierCategorySchema } from "../supplierCategory.schema";
import { saveSupplierCategoryMutationOption } from "../supplierCategory.query";
import LabeledTextField from "./LabeledTextField";

export default function SupplierCategoryForm({record, onSaved, onCancel}: {
    record?: SupplierCategory; onSaved: () => void; onCancel: () => void;
}) {
    const client = useQueryClient();
    const mutation = useMutation(saveSupplierCategoryMutationOption(client));
    const [approvedDraft, setApprovedDraft] = useState<SupplierCategoryFormData | null>(null);
    const saving = useRef(false);
    const {control, handleSubmit, formState: {isSubmitting}} = useForm<SupplierCategoryFormData>({
        resolver: zodResolver(supplierCategorySchema), defaultValues: {
            category_name: record?.category_name || "",
            category_notes: record?.category_notes || "",
        },
    });
    const pending = mutation.isPending || isSubmitting;
    async function saveApprovedDraft() {
        if (!approvedDraft || saving.current) return;
        saving.current = true;
        const values = approvedDraft;
        setApprovedDraft(null);
        try {await mutation.mutateAsync({id: record?.supplier_category_id, values}); onSaved();}
        catch { /* Keep the draft and display the save error. */ }
        finally {saving.current = false;}
    }
    return <Dialog open fullWidth maxWidth="sm" onClose={() => {if (!pending) onCancel();}}>
        <Box component="form" noValidate onSubmit={handleSubmit(values => setApprovedDraft(values))}>
            <DialogTitle>{record ? "Edit" : "Add"} supplier category</DialogTitle>
            <DialogContent><Stack spacing={2.5} sx={{pt: 1}}>
                {mutation.error && <Alert severity="error">{mutation.error.message}</Alert>}
                <Controller name="category_name" control={control} render={({field: {ref, ...field}, fieldState}) =>
                    <LabeledTextField {...field} inputRef={ref} label="Category name" required fullWidth disabled={pending}
                        error={!!fieldState.error} helperText={fieldState.error?.message} />} />
                <Controller name="category_notes" control={control} render={({field: {ref, ...field}, fieldState}) =>
                    <LabeledTextField {...field} inputRef={ref} label="Description" multiline minRows={3} fullWidth disabled={pending}
                        error={!!fieldState.error} helperText={fieldState.error?.message} />} />
            </Stack></DialogContent>
            <DialogActions><Button disabled={pending} onClick={onCancel}>Cancel</Button>
                <Button type="submit" variant="contained" disabled={pending}>{pending ? "Saving…" : "Save"}</Button></DialogActions>
        </Box>
        <Dialog open={approvedDraft !== null} onClose={() => setApprovedDraft(null)} aria-labelledby="confirm-supplierCategory-title">
            <DialogTitle id="confirm-supplierCategory-title">Confirm supplier category save</DialogTitle>
            <DialogContent>Would you like to save this supplier category?</DialogContent>
            <DialogActions><Button autoFocus onClick={() => setApprovedDraft(null)}>No</Button>
                <Button onClick={() => {void saveApprovedDraft();}} disabled={pending}>Yes</Button></DialogActions>
        </Dialog>
    </Dialog>;
}
