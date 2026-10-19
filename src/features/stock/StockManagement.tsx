import NavigationStrip from '../../components/NavigationStrip';
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert, Box, Button, Chip, CircularProgress, Typography } from '@mui/material';
import AdminRecordManager, {type adminRecord, type recordField} from '../admin/components/adminRecordManager';
import { styles } from '../admin/components/Admin.styles';
import { entityInfo, getStockDetails, getStockOptions, getStockRecords, saveStockDetail, saveStockRecord, type Entity } from './stock.api';

const options = (values: string[]) => values.map(value => ({value, label: value[0].toUpperCase() + value.slice(1)}));

export default function StockManagement() {
    const [entity, setEntity] = useState<Entity>('order');
    return <Box sx={{minWidth: 0}}>
        <Chip label="LITTLE LUXE · STOCK MANAGEMENT" size="small" sx={{mb: 2, bgcolor: '#f5eee9', color: '#79543f', letterSpacing: 1}} />
        <Typography component="h1" sx={styles.heading}>Every movement, beautifully organized.</Typography>
        <Typography color="text.secondary" sx={{mt: 1}}>Follow orders, welcome new purchases, and manage returns in one place.</Typography>
        <NavigationStrip label="Stock management menu">
            {(Object.keys(entityInfo) as Entity[]).map(key => <Button key={key} aria-pressed={key === entity} data-status={key === entity ? 'active' : undefined}
                sx={styles.menuLink} onClick={() => setEntity(key)}>{entityInfo[key].title}</Button>)}
        </NavigationStrip>
        <StockEntity key={entity} entity={entity} />
    </Box>;
}

function StockEntity({entity}: {entity: Entity}) {
    const queryClient = useQueryClient();
    const [selected, setSelected] = useState<adminRecord | null>(null);
    const config = entityInfo[entity];
    const records = useQuery({queryKey: ['stock', entity], queryFn: () => getStockRecords(entity)});
    const lookups = useQuery({queryKey: ['stock-options'], queryFn: getStockOptions});
    const details = useQuery({queryKey: ['stock-details', entity, selected?.id], queryFn: () => getStockDetails(entity, selected!.id), enabled: !!selected});
    const loading = records.isPending || lookups.isPending || (!!selected && details.isPending);
    const error = records.error || lookups.error || (selected ? details.error : null);
    if (loading) return <Box sx={{py: 8, textAlign: 'center'}}><CircularProgress aria-label={`Loading ${config.title.toLowerCase()}`} /></Box>;
    if (error) return <Alert severity="error">{error.message}<Button onClick={() => {void records.refetch(); void lookups.refetch(); if (selected) void details.refetch();}}>Retry</Button>{selected && <Button onClick={() => setSelected(null)}>Back</Button>}</Alert>;
    const supplierOptions = lookups.data!.suppliers.map(row => ({value: row.supplier_id, label: row.supplier_name}));
    const itemOptions = lookups.data!.items.map(row => ({value: row.item_id, label: row.item_name}));
    const orderOptions = lookups.data!.orders.map(row => ({value: row.order_id, label: row.order_id}));
    const fields: recordField[] = entity === 'order'
        ? [{name: 'order_status', label: 'Order status', required: true, defaultValue: 'received', options: options(['received', 'processed', 'shipped', 'delivered', 'declined'])}]
        : entity === 'purchase'
            ? [{name: 'invoice_number', label: 'Invoice', required: true}, {name: 'supplier_id', label: 'Supplier', options: [{value: '', label: 'No supplier'}, ...supplierOptions]}]
            : [{name: 'order_id', label: 'Order', required: true, options: orderOptions}, {name: 'return_status', label: 'Return status', required: true, defaultValue: 'received', options: options(['received', 'processed', 'authorized', 'declined'])}];
    fields.push({name: config.notes, label: 'Notes', multiline: true});
    const displayFields: recordField[] = [
        {name: entity === 'purchase' ? 'invoice_number' : config.id, label: entity === 'purchase' ? 'Invoice' : entity === 'order' ? 'Order ID' : 'Return ID'},
        {name: 'author_email', label: 'Added by'},
        {name: config.notes, label: 'Notes'},
        {name: 'added_on_display', label: 'Added on'},
        ...fields.filter(field => field.name !== config.notes && field.name !== 'invoice_number'),
    ];
    const rows = (records.data || []).map(row => ({...row, added_on_display: row.added_on ? new Date(row.added_on.endsWith('Z') || /[+-]\d\d:\d\d$/.test(row.added_on) ? row.added_on : `${row.added_on}Z`).toLocaleString() : '—'}));
    if (selected) {
        const detailFields: recordField[] = [
            {name: 'item_id', label: 'Item', required: true, options: itemOptions},
            {name: config.quantity, label: 'Quantity', type: 'number', required: true, min: 1, step: 1},
            ...(config.price ? [{name: config.price, label: entity === 'purchase' ? 'Cost price' : 'Sale price', type: 'number' as const, required: true, min: 0, step: 0.01}] : []),
            {name: 'batch_number', label: 'Batch number'}, {name: 'expiry_date', label: 'Expiry date', type: 'date'},
        ];
        return <Box>
            <Button onClick={() => setSelected(null)} sx={{mb: 2}}>← Back to {config.title.toLowerCase()}</Button>
            <Box sx={{mb: 3, p: 2, borderRadius: 3, bgcolor: '#f5eee9'}}>
                <Typography variant="overline">Selected {config.singular}</Typography>
                <Typography sx={{fontWeight: 600, overflowWrap: 'anywhere'}}>{entity === 'purchase' ? selected.invoice_number : selected.id}</Typography>
                <Typography color="text.secondary">{selected.author_email} · {selected[config.notes] || 'No notes'}</Typography>
            </Box>
            <AdminRecordManager key={`${entity}-${selected.id}`} title={`${config.title === 'Item returns' ? 'Return' : config.title.slice(0, -1)} details`} singular="detail"
                rows={details.data || []} fields={detailFields} queryKey={['stock-details', entity, selected.id]}
                onSave={(values, id) => saveStockDetail(entity, selected.id, values, id)} />
        </Box>;
    }
    return <AdminRecordManager title={config.title} singular={config.singular} rows={rows} fields={fields} displayFields={displayFields}
        queryKey={['stock', entity]} onSave={async (values, id) => {
            const result = await saveStockRecord(entity, values, id);
            await queryClient.invalidateQueries({queryKey: ['stock-options']});
            return result;
        }} onSelect={setSelected} />;
}
