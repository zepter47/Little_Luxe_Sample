import LabeledTextField from "../../../components/forms/LabeledTextField";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Paper, Stack, Typography } from "@mui/material";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import { styles } from "./Admin.styles";

export type recordField = {name: string; label: string; required?: boolean; type?: "email"; multiline?: boolean; options?: {value: string; label: string}[]};
export type adminRecord = {id: string; [key: string]: string};

export default function AdminRecordManager({title, singular, rows, fields, queryKey, onSave, notice}: {
    title: string; singular: string; rows: adminRecord[]; fields: recordField[];
    queryKey: readonly string[]; onSave: (values: Record<string, string>, id?: string) => Promise<unknown>; notice?: string;
}) {
    const [editing, setEditing] = useState<adminRecord | null | undefined>(undefined);
    const [values, setValues] = useState<Record<string, string>>({});
    const [saved, setSaved] = useState(false);
    const [validationError, setValidationError] = useState("");
    const queryClient = useQueryClient();
    const mutation = useMutation({mutationFn: ({values, id}: {values: Record<string, string>; id?: string}) => onSave(values, id)});
    function openForm(row: adminRecord | null) {
        setEditing(row);
        setValues(Object.fromEntries(fields.map(field => [field.name, row?.[field.name] || ""])));
        mutation.reset();
        setSaved(false);
        setValidationError("");
    }
    async function submit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const cleaned = Object.fromEntries(Object.entries(values).map(([key, value]) => [key, value.trim()]));
        const missing = fields.find(field => field.required && !cleaned[field.name]);
        if (missing) {
            setValidationError(`Please enter or select ${missing.label.toLowerCase()}.`);
            return;
        }
        setValidationError("");
        try {
            await mutation.mutateAsync({values: cleaned, id: editing?.id});
            await queryClient.invalidateQueries({queryKey});
            setEditing(undefined);
            setSaved(true);
        } catch { /* Keep the form open and display the save error. */ }
    }
    const columns: GridColDef<adminRecord>[] = fields.filter(field => !field.multiline).map(field => ({
        field: field.name, headerName: field.label, flex: 1, minWidth: 170,
        valueFormatter: value => field.options?.find(option => option.value === value)?.label || value,
    }));
    columns.push({field: "actions", headerName: "Actions", width: 100, sortable: false, filterable: false,
        renderCell: ({row}) => <Button onClick={() => openForm(row)} aria-label={`Edit ${row[fields[0].name]}`}>Edit</Button>});
    return <Paper variant="outlined" sx={styles.panel}>
        <Box sx={styles.toolbar}>
            <Typography variant="h5" component="h2">{title}</Typography>
            <Button variant="contained" onClick={() => openForm(null)}>Add {singular}</Button>
        </Box>
        {saved && <Alert severity="success" sx={{mb: 2}}>{singular} saved successfully.</Alert>}
        {notice && <Alert severity="info" sx={{mb: 2}}>{notice}</Alert>}
        <DataGrid rows={rows} columns={columns} disableRowSelectionOnClick pageSizeOptions={[5, 10, 25]}
            initialState={{pagination: {paginationModel: {pageSize: 10}}}} sx={{height: 460, border: 0}} />
        <Dialog open={editing !== undefined} onClose={() => {if (!mutation.isPending) setEditing(undefined);}} fullWidth maxWidth="sm">
            <Box component="form" onSubmit={submit}>
                <DialogTitle>{editing ? "Edit" : "Add"} {singular}</DialogTitle>
                <DialogContent>
                    <Stack spacing={2.5} sx={{pt: 1}}>
                        {mutation.error && <Alert severity="error">{mutation.error.message}</Alert>}
                        {validationError && <Alert severity="error">{validationError}</Alert>}
                        {fields.map(field => <LabeledTextField key={field.name} fieldStyles={styles} label={field.label} value={values[field.name] || ""}
                            onChange={event => setValues(previous => ({...previous, [field.name]: event.target.value}))}
                            required={field.required} type={field.type} multiline={field.multiline} minRows={field.multiline ? 3 : undefined}
                            select={!!field.options} fullWidth slotProps={{htmlInput: {pattern: field.required && !field.options ? ".*\\S.*" : undefined}}}>
                            {field.options?.map(option => <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>)}
                        </LabeledTextField>)}
                    </Stack>
                </DialogContent>
                <DialogActions sx={{p: 3}}>
                    <Button disabled={mutation.isPending} onClick={() => setEditing(undefined)}>Cancel</Button>
                    <Button type="submit" variant="contained" disabled={mutation.isPending}>{mutation.isPending ? "Saving…" : "Save"}</Button>
                </DialogActions>
            </Box>
        </Dialog>
    </Paper>;
}

