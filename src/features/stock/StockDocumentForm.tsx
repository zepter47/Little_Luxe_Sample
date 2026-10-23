import { useState } from 'react';
import { useFieldArray, useForm, useWatch, type FieldErrors } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { purchaseSchema } from '../purchases/purchase.schema';
import type { PurchaseFormData } from '../purchases/purchase.types';
import { createPurchaseMutationOption } from '../purchases/purchase.query';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Box, Button, Chip, Dialog, DialogContent, DialogTitle, Divider, IconButton, MenuItem, Paper, Stack, Typography, useMediaQuery, useTheme } from '@mui/material';
import LabeledTextField from '../../components/forms/LabeledTextField';
import type { recordField } from '../admin/components/adminRecordManager';
import { entityInfo, getReturnOrderLines, saveStockDocument, type Entity, type StockOptions } from './stock.api';
import { documentLinesPayload, lineTotal, newDocumentLine, validateDocumentLines, type DocumentLine } from './stockDocument.model';

const money = (value: number) => value.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
const fieldGrid = {display: 'grid', gridTemplateColumns: {xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', lg: 'repeat(3, minmax(0, 1fr))'}, gap: 2};

export default function StockDocumentForm({entity, fields, lookups, onClose, onSaved}: {
    entity: Entity; fields: recordField[]; lookups: StockOptions; onClose: () => void; onSaved: (id: string) => void;
}) {
    const config = entityInfo[entity];
    const isReturn = entity === 'item_return';
    const compact = useMediaQuery(useTheme().breakpoints.down('sm'));
    const [documentId] = useState(() => crypto.randomUUID());
    const [legacyParent, setLegacyParent] = useState<Record<string, string>>(() => ({...Object.fromEntries(fields.map(field => [field.name, field.defaultValue || ''])),
        document_date: new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10)}));
    const [legacyLines, setLegacyLines] = useState<DocumentLine[]>(() => [newDocumentLine()]);
    const [validation, setValidation] = useState('');
    const queryClient = useQueryClient();
    const isPurchase = entity === 'purchase';
    const purchaseForm = useForm<PurchaseFormData>({
        resolver: zodResolver(purchaseSchema),
        defaultValues: {invoice_number: '', supplier_id: '', purchase_notes: '',
            lines: [newDocumentLine()]},
    });
    const purchaseArray = useFieldArray({control: purchaseForm.control, name: 'lines'});
    const draft = useWatch({control: purchaseForm.control});
    const parent: Record<string, string> = isPurchase ? {
        invoice_number: draft.invoice_number || '', supplier_id: draft.supplier_id || '',
        purchase_notes: draft.purchase_notes || '',
    } : legacyParent;
    const lines: DocumentLine[] = isPurchase ? purchaseArray.fields.map((field, index) => ({
        ...field, ...draft.lines?.[index], key: field.id, order_details_id: '',
    })) : legacyLines;
    const purchaseMutation = useMutation(createPurchaseMutationOption(queryClient));
    function setParent(update: (previous: Record<string, string>) => Record<string, string>) {
        if (!isPurchase) {setLegacyParent(update); return;}
        const values = update(parent);
        for (const name of ['invoice_number', 'supplier_id', 'purchase_notes'] as const) {
            if (values[name] !== parent[name]) purchaseForm.setValue(name, values[name], {shouldDirty: true});
        }
    }
    function setLines(update: DocumentLine[] | ((previous: DocumentLine[]) => DocumentLine[])) {
        if (!isPurchase) {setLegacyLines(update); return;}
        const next = typeof update === 'function' ? update(lines) : update;
        // Preserve field-array IDs and focus when appending/removing a single line.
        if (next.length > lines.length) purchaseArray.append(next[next.length - 1]);
        else if (next.length < lines.length) purchaseArray.remove(lines.findIndex(line => !next.some(other => other.key === line.key)));
        else purchaseArray.replace(next);
    }
    const source = useQuery({queryKey: ['return-order-lines', parent.order_id], queryFn: () => getReturnOrderLines(parent.order_id), enabled: isReturn && !!parent.order_id});
    const mutation = useMutation({mutationFn: () => saveStockDocument(entity,
        {...parent, document_id: documentId, added_on: new Date(`${parent.document_date}T00:00:00`).toISOString()}, documentLinesPayload(lines))});
    const pending = isPurchase ? purchaseMutation.isPending || purchaseForm.formState.isSubmitting : mutation.isPending;
    const total = lines.reduce((sum, line) => sum + lineTotal(line), 0);
    const units = lines.filter(line => line.item_id).reduce((sum, line) => sum + (Number(line.quantity) || 0), 0);
    const missingReturnPrice = isReturn && lines.some(line => line.item_id && !line.unit_price);
    function patchLine(key: string, patch: Partial<DocumentLine>) {
        if (isPurchase) {
            const index = lines.findIndex(line => line.key === key);
            if (index >= 0) purchaseForm.setValue(`lines.${index}`, {...purchaseForm.getValues(`lines.${index}`), ...patch}, {shouldDirty: true});
        } else setLegacyLines(previous => previous.map(line => line.key === key ? {...line, ...patch} : line));
        setValidation('');
    }
    function chooseItem(key: string, value: string) {
        if (isReturn) {
            const original = source.data?.find(row => row.order_details_id === value);
            patchLine(key, {order_details_id: value, item_id: original?.item_id || '', unit_price: original?.sale_price == null ? '' : String(original.sale_price),
                batch_number: original?.batch_number || '', expiry_date: original?.expiry_date || '', quantity: '1'});
        } else {
            const item = lookups.items.find(row => row.item_id === value);
            patchLine(key, {item_id: value, ...(entity === 'order' ? {unit_price: String(item?.sale_price ?? '')} : {})});
        }
    }
    async function submitPurchase(data: PurchaseFormData) {
        setValidation('');
        try {
            const id = await purchaseMutation.mutateAsync({
                purchase: {invoice_number: data.invoice_number, supplier_id: data.supplier_id || null,
                    purchase_notes: data.purchase_notes || null},
                lines: data.lines.map(line => ({item_id: line.item_id, quantity_bought: Number(line.quantity),
                    cost_price: Number(line.unit_price), batch_number: line.batch_number || null,
                    expiry_date: line.expiry_date || null})),
            });
            onSaved(id);
        } catch { /* Retain the complete purchase draft and display the mutation error. */ }
    }
    function invalidPurchase(errors: FieldErrors<PurchaseFormData>) {
        const header = errors.invoice_number || errors.supplier_id;
        if (header?.message) {setValidation(header.message); return;}
        if (Array.isArray(errors.lines)) {
            for (const [index, error] of errors.lines.entries()) {
                const issue = error?.item_id || error?.quantity || error?.unit_price || error?.batch_number || error?.expiry_date;
                if (issue?.message) {setValidation(`Item ${index + 1}: ${issue.message}`); return;}
            }
        }
        setValidation(errors.lines?.root?.message || errors.lines?.message || 'Check the purchase information and item lines.');
    }
    async function submit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const missing = fields.find(field => field.required && !parent[field.name]?.trim());
        const issue = missing ? `Please enter or select ${missing.label.toLowerCase()}.` : !parent.document_date ? 'Select a document date.' : validateDocumentLines(lines, isReturn);
        if (issue) {setValidation(issue); return;}
        if (isReturn && (source.isPending || source.error)) {setValidation('Wait for the original order items to load, then try again.'); return;}
        if (isReturn && lines.some(line => lines.filter(other => other.order_details_id === line.order_details_id).reduce((sum, other) => sum + Number(other.quantity), 0) > (source.data?.find(row => row.order_details_id === line.order_details_id)?.quantity_sold || 0))) {
            setValidation('Returned quantities cannot exceed the original order quantities.'); return;
        }
        setValidation('');
        try {
            const id = await mutation.mutateAsync();
            await Promise.all([
                queryClient.invalidateQueries({queryKey: ['stock', entity]}),
                queryClient.invalidateQueries({queryKey: ['stock-options']}),
                queryClient.invalidateQueries({queryKey: ['stock-details', entity, id]}),
            ]);
            onSaved(id);
        } catch { /* Preserve every field and line for correction and retry. */ }
    }
    return <Dialog open onClose={() => {if (!pending) onClose();}} fullWidth maxWidth="xl" fullScreen={compact}
        slotProps={{paper: {sx: {borderRadius: compact ? 0 : 4, bgcolor: '#fdfbf9'}}}}>
        <Box component="form" onSubmit={isPurchase ? purchaseForm.handleSubmit(submitPurchase, invalidPurchase) : submit} noValidate>
            <DialogTitle component="div" sx={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, px: {xs: 2, sm: 3}}}>
                <Box><Typography variant="overline" color="text.secondary">STOCK MANAGEMENT</Typography>
                    <Typography component="h2" sx={{fontFamily: 'Georgia, serif', fontSize: {xs: '1.75rem', sm: '2rem'}, color: '#49352b'}}>New {config.singular}</Typography></Box>
                <IconButton aria-label="Close document form" disabled={pending} onClick={onClose}>×</IconButton>
            </DialogTitle>
            <DialogContent sx={{px: {xs: 2, sm: 3}, pb: 3, maxHeight: compact ? 'calc(100dvh - 110px)' : '76dvh', overflowY: 'auto'}}>
                <Stack spacing={3}>
                    <Typography color="text.secondary">Add the {config.singular} information once, then build its item list below.</Typography>
                    <Paper variant="outlined" sx={{p: {xs: 2, sm: 3}, borderRadius: 3, borderColor: '#e9dfd7'}}>
                        <Typography component="h3" sx={{fontWeight: 600, mb: 2}}>01 · {entity === 'purchase' ? 'Purchase' : isReturn ? 'Return' : 'Order'} information</Typography>
                        <Box sx={fieldGrid}>
                            {!isPurchase && <LabeledTextField label="Date" type="date" required fullWidth disabled={pending} value={parent.document_date}
                                onChange={event => setParent(previous => ({...previous, document_date: event.target.value}))} />}
                            {fields.map(field => <Box key={field.name} sx={field.multiline ? {gridColumn: '1 / -1'} : undefined}>
                                <LabeledTextField label={field.label} required={field.required} fullWidth disabled={pending} value={parent[field.name] || ''}
                                    multiline={field.multiline} minRows={field.multiline ? 2 : undefined} select={!!field.options}
                                    onChange={event => {setParent(previous => ({...previous, [field.name]: event.target.value})); if (field.name === 'order_id') setLines([newDocumentLine()]); setValidation('');}}>
                                    {field.options?.map(option => <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>)}
                                </LabeledTextField>
                            </Box>)}
                        </Box>
                        {isReturn && <Typography variant="caption" color="text.secondary" sx={{display: 'block', mt: 1}}>Choose the original order first. Changing it resets the item list.</Typography>}
                    </Paper>
                    <Box sx={{display: 'grid', gridTemplateColumns: {xs: 'minmax(0, 1fr)', lg: 'minmax(0, 1fr) 240px'}, alignItems: 'start', gap: 3}}>
                        <Box sx={{minWidth: 0}}>
                            <Box sx={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, gap: 1}}>
                                <Typography component="h3" sx={{fontWeight: 600}}>02 · Item lines</Typography><Chip size="small" label={`${lines.length} ${lines.length === 1 ? 'line' : 'lines'}`} sx={{bgcolor: '#f5eee9'}} />
                            </Box>
                            {isReturn && source.error && <Alert severity="error" sx={{mb: 2}}>{source.error.message}<Button onClick={() => void source.refetch()}>Retry</Button></Alert>}
                            {isReturn && parent.order_id && source.isSuccess && !source.data.length && <Alert severity="info" sx={{mb: 2}}>This order has no item lines to return.</Alert>}
                            <Stack spacing={2}>
                                {lines.map((line, index) => <Paper key={line.key} component="fieldset" variant="outlined" sx={{m: 0, p: 2, minWidth: 0, borderRadius: 3, borderColor: '#e9dfd7'}}>
                                    <Typography component="legend" variant="caption" sx={{px: 1, color: '#79543f'}}>ITEM {String(index + 1).padStart(2, '0')}</Typography>
                                    <Box sx={{...fieldGrid, gridTemplateColumns: {xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', md: 'repeat(3, minmax(0, 1fr))'}}}>
                                        <Box sx={{gridColumn: {sm: '1 / -1', md: 'span 2'}}}>
                                            <LabeledTextField label="Item" select required fullWidth value={isReturn ? line.order_details_id : line.item_id}
                                                disabled={pending || (isReturn && (!parent.order_id || source.isPending || !!source.error))} onChange={event => chooseItem(line.key, event.target.value)}>
                                                {isReturn ? source.data?.map(row => <MenuItem key={row.order_details_id} value={row.order_details_id}>{lookups.items.find(item => item.item_id === row.item_id)?.item_name || 'Item unavailable'} · {row.batch_number || 'No batch'} · {row.quantity_sold || 0} sold</MenuItem>)
                                                    : lookups.items.map(item => <MenuItem key={item.item_id} value={item.item_id}>{item.item_name}</MenuItem>)}
                                            </LabeledTextField>
                                        </Box>
                                        <LabeledTextField label={entity === 'purchase' ? 'Quantity bought' : isReturn ? 'Quantity returned' : 'Quantity sold'} type="number" required fullWidth value={line.quantity} disabled={pending}
                                            slotProps={{htmlInput: {min: 1, step: 1}}} onChange={event => patchLine(line.key, {quantity: event.target.value})} />
                                        <LabeledTextField label={entity === 'purchase' ? 'Cost price' : 'Sale price'} type="number" required={!isReturn} fullWidth value={line.unit_price} disabled={pending || isReturn}
                                            slotProps={{htmlInput: {min: 0, step: 0.01}}} onChange={event => patchLine(line.key, {unit_price: event.target.value})} />
                                        <LabeledTextField label="Batch number" fullWidth value={line.batch_number} disabled={pending || isReturn} onChange={event => patchLine(line.key, {batch_number: event.target.value})} />
                                        <LabeledTextField label="Expiry date" type="date" fullWidth value={line.expiry_date} disabled={pending || isReturn} onChange={event => patchLine(line.key, {expiry_date: event.target.value})} />
                                    </Box>
                                    <Box sx={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 2}}>
                                        <Button color="inherit" disabled={pending} onClick={() => setLines(previous => previous.filter(other => other.key !== line.key))} aria-label={`Remove item ${index + 1}`}>Remove</Button>
                                        <Typography sx={{fontWeight: 600, fontVariantNumeric: 'tabular-nums'}}>Line total · {isReturn && line.item_id && !line.unit_price ? 'Unavailable' : money(lineTotal(line))}</Typography>
                                    </Box>
                                </Paper>)}
                            </Stack>
                            <Button variant="outlined" disabled={pending || (isReturn && (!parent.order_id || !source.data?.length))} onClick={() => setLines(previous => [...previous, newDocumentLine()])} sx={{mt: 2, borderColor: '#c8b5a7', color: '#79543f', borderStyle: 'dashed', py: 1.5}} fullWidth>+ Add item line</Button>
                        </Box>
                        <Paper variant="outlined" sx={{p: 3, borderRadius: 3, bgcolor: '#f5eee9', borderColor: '#e9dfd7', position: {lg: 'sticky'}, top: 0}}>
                            <Typography component="h3" sx={{fontFamily: 'Georgia, serif', fontSize: '1.5rem', color: '#49352b'}}>Summary</Typography>
                            <Stack spacing={1.5} sx={{my: 2}}>
                                <Box sx={{display: 'flex', justifyContent: 'space-between'}}><Typography color="text.secondary">Item lines</Typography><Typography>{lines.filter(line => line.item_id).length}</Typography></Box>
                                <Box sx={{display: 'flex', justifyContent: 'space-between'}}><Typography color="text.secondary">Total quantity</Typography><Typography>{units}</Typography></Box>
                            </Stack><Divider />
                            <Typography color="text.secondary" sx={{mt: 2}}>{isReturn ? 'Return value' : 'Grand total'}</Typography>
                            <Typography aria-live="polite" sx={{fontSize: '2rem', fontWeight: 600, color: '#49352b', overflowWrap: 'anywhere', fontVariantNumeric: 'tabular-nums'}}>{missingReturnPrice ? 'Unavailable' : money(total)}</Typography>
                            {isReturn && <Typography variant="caption" color="text.secondary">Value uses the original order prices. Return records store the item and quantity.</Typography>}
                            <Typography variant="body2" color="text.secondary" sx={{mt: 2}}>The {config.singular} and all its items will be saved together.</Typography>
                        </Paper>
                    </Box>
                    {validation && <Alert severity="error">{validation}</Alert>}
                    {(isPurchase ? purchaseMutation.error : mutation.error) && <Alert severity="error">{(isPurchase ? purchaseMutation.error : mutation.error)?.message}</Alert>}
                    <Box sx={{display: 'flex', flexWrap: 'wrap', justifyContent: 'flex-end', gap: 1, pt: 2, borderTop: '1px solid #e9dfd7'}}>
                        <Button disabled={pending} onClick={onClose}>Cancel</Button>
                        <Button variant="contained" type="submit" disabled={pending} sx={{bgcolor: '#79543f', px: 4, '&:hover': {bgcolor: '#49352b'}}}>{pending ? 'Saving…' : `Save ${config.singular}`}</Button>
                    </Box>
                </Stack>
            </DialogContent>
        </Box>
    </Dialog>;
}
