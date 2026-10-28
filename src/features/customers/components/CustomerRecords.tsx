import CustomerResponsiveList from "./CustomerResponsiveList";
import LabeledTextField from "./LabeledTextField";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Alert, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Paper, Stack, Typography } from "@mui/material";
import { type GridColDef } from "@mui/x-data-grid";
import { styles } from "./Customer.styles";

export type CustomerField = {name: string; label: string; required?: boolean; defaultValue?: string; format?: "amount" | "quantity"; type?: "email" | "number" | "date"; min?: number; step?: number; multiline?: boolean; options?: {value: string; label: string}[]};
export type CustomerRecord = {id: string; [key: string]: string};

function displayValue(field: CustomerField, value: string) {
    if (field.format) return Number(value || 0).toLocaleString(undefined, field.format === "amount"
        ? {minimumFractionDigits: 2, maximumFractionDigits: 2} : {maximumFractionDigits: 0});
    return field.options?.find(option => option.value === value)?.label || value;
}

export default function CustomerRecords({title, singular, rows, fields, queryKey, onSave, notice, displayFields = fields, onSelect, onAdd, readOnly = false}: {
    title: string; singular: string; rows: CustomerRecord[]; fields: CustomerField[];
    queryKey: readonly string[]; onSave: (values: Record<string, string>, id?: string) => Promise<unknown>; notice?: string; displayFields?: CustomerField[]; onSelect?: (row: CustomerRecord) => void; onAdd?: () => void; readOnly?: boolean;
}) {
    const [editing, setEditing] = useState<CustomerRecord | null | undefined>(undefined);
    const [values, setValues] = useState<Record<string, string>>({});
    const [saved, setSaved] = useState(false);
    const [validationError, setValidationError] = useState("");
    const queryClient = useQueryClient();
    const mutation = useMutation({mutationFn: ({values, id}: {values: Record<string, string>; id?: string}) => onSave(values, id)});
    function openForm(row: CustomerRecord | null) {
        setEditing(row);
        setValues(Object.fromEntries(fields.map(field => [field.name, row?.[field.name] ?? field.defaultValue ?? ""])));
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
    const columns: GridColDef<CustomerRecord>[] = displayFields.filter(field => !field.multiline).map(field => ({
        field: field.name, headerName: field.label, flex: 1, minWidth: 170,
        type: field.type === "number" ? "number" : undefined,
        valueGetter: (_, row) => field.type === "number" ? Number(row[field.name] || 0) : row[field.name],
        valueFormatter: value => displayValue(field, String(value ?? "")),
    }));
    if (!readOnly) columns.push({field: "actions", headerName: "Actions", width: onSelect ? 170 : 100, sortable: false, filterable: false,
        renderCell: ({row}) => <><Button onClick={() => openForm(row)}>Edit</Button>{onSelect && <Button onClick={() => onSelect(row)}>Select</Button>}</>});
    return <Paper variant="outlined" sx={styles.panel}>
        <Box sx={styles.toolbar}>
            <Typography variant="h5" component="h2">{title}</Typography>
            {!readOnly && <Button variant="contained" onClick={() => onAdd ? onAdd() : openForm(null)}>Add {singular}</Button>}
        </Box>
        {saved && <Alert severity="success" sx={{mb: 2}}>{singular} saved successfully.</Alert>}
        {notice && <Alert severity="info" sx={{mb: 2}}>{notice}</Alert>}
        <CustomerResponsiveList rows={rows} columns={columns} getRowId={row => row.id} label={title}
            getSearchText={row => displayFields.map(field => displayValue(field, row[field.name] || "")).join(" ")}
            getSortValue={(row, name) => displayFields.find(field => field.name === name)?.type === "number" ? Number(row[name] || 0) : displayFields.find(field => field.name === name)?.options?.find(option => option.value === row[name])?.label || row[name] || ""}
            renderCard={row => <Paper component="article" variant="outlined" sx={styles.listCard}>
                <Box sx={onSelect ? {...styles.cardHeading, flexDirection: "column", gap: 1} : styles.cardHeading}>
                    <Typography component="h3" sx={styles.cardTitle}>{displayFields[0].format && <Typography component="span" variant="caption" color="text.secondary" sx={{display: "block"}}>{displayFields[0].label}</Typography>}{displayValue(displayFields[0], row[displayFields[0].name])}</Typography>
                    {!readOnly && <Box sx={{display: "flex", flexShrink: 0, alignSelf: "flex-end"}}><Button sx={styles.cardEdit} onClick={() => openForm(row)} aria-label={`Edit ${row[displayFields[0].name]}`}>Edit</Button>{onSelect && <Button sx={styles.cardEdit} onClick={() => onSelect(row)}>Select</Button>}</Box>}
                </Box>
                <Box component="dl" sx={{m: 0}}>
                    {displayFields.slice(1).map(field => {
                        const value = displayValue(field, row[field.name]);
                        return value ? <Box key={field.name} sx={{mt: 1}}>
                            <Typography component="dt" variant="caption" color="text.secondary">{field.label}</Typography>
                            <Typography component="dd" variant="body2" sx={{m: 0, whiteSpace: "pre-wrap"}}>{value}</Typography>
                        </Box> : null;
                    })}
                </Box>
            </Paper>} />
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
                            select={!!field.options} fullWidth slotProps={{htmlInput: {min: field.min, step: field.step, pattern: field.required && !field.options && !field.type ? ".*\\S.*" : undefined}}}>
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
