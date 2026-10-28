import { useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack } from "@mui/material";
import type { Unit, UnitFormData } from "../unit.types";
import { unitSchema } from "../unit.schema";
import { saveUnitMutationOption } from "../unit.query";
import LabeledTextField from "./LabeledTextField";

export default function UnitForm({record, onSaved, onCancel}: {
    record?: Unit; onSaved: () => void; onCancel: () => void;
}) {
    const client = useQueryClient();
    const mutation = useMutation(saveUnitMutationOption(client));
    const [approvedDraft, setApprovedDraft] = useState<UnitFormData | null>(null);
    const saving = useRef(false);
    const {control, handleSubmit, formState: {isSubmitting}} = useForm<UnitFormData>({
        resolver: zodResolver(unitSchema), defaultValues: {
            uom_name: record?.uom_name || "",
            uom_notes: record?.uom_notes || "",
        },
    });
    const pending = mutation.isPending || isSubmitting;
    async function saveApprovedDraft() {
        if (!approvedDraft || saving.current) return;
        saving.current = true;
        const values = approvedDraft;
        setApprovedDraft(null);
        try {await mutation.mutateAsync({id: record?.uom_id, values}); onSaved();}
        catch { /* Keep the draft and display the save error. */ }
        finally {saving.current = false;}
    }
    return <Dialog open fullWidth maxWidth="sm" onClose={() => {if (!pending) onCancel();}}>
        <Box component="form" noValidate onSubmit={handleSubmit(values => setApprovedDraft(values))}>
            <DialogTitle>{record ? "Edit" : "Add"} unit of measure</DialogTitle>
            <DialogContent><Stack spacing={2.5} sx={{pt: 1}}>
                {mutation.error && <Alert severity="error">{mutation.error.message}</Alert>}
                <Controller name="uom_name" control={control} render={({field: {ref, ...field}, fieldState}) =>
                    <LabeledTextField {...field} inputRef={ref} label="Unit name" required fullWidth disabled={pending}
                        error={!!fieldState.error} helperText={fieldState.error?.message} />} />
                <Controller name="uom_notes" control={control} render={({field: {ref, ...field}, fieldState}) =>
                    <LabeledTextField {...field} inputRef={ref} label="Description" multiline minRows={3} fullWidth disabled={pending}
                        error={!!fieldState.error} helperText={fieldState.error?.message} />} />
            </Stack></DialogContent>
            <DialogActions><Button disabled={pending} onClick={onCancel}>Cancel</Button>
                <Button type="submit" variant="contained" disabled={pending}>{pending ? "Saving…" : "Save"}</Button></DialogActions>
        </Box>
        <Dialog open={approvedDraft !== null} onClose={() => setApprovedDraft(null)} aria-labelledby="confirm-unit-title">
            <DialogTitle id="confirm-unit-title">Confirm unit of measure save</DialogTitle>
            <DialogContent>Would you like to save this unit of measure?</DialogContent>
            <DialogActions><Button autoFocus onClick={() => setApprovedDraft(null)}>No</Button>
                <Button onClick={() => {void saveApprovedDraft();}} disabled={pending}>Yes</Button></DialogActions>
        </Dialog>
    </Dialog>;
}
