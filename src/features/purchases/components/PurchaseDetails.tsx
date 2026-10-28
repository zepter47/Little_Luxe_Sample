import { useQuery } from '@tanstack/react-query';
import { Alert, Button, CircularProgress, Paper, Stack, Typography } from '@mui/material';
import { getPurchaseDetailsQueryOption } from '../purchase.query';
import type { Purchase, PurchaseDetail } from '../purchase.types';
import type { GridColDef } from '@mui/x-data-grid';
import PurchaseResponsiveList from './PurchaseResponsiveList';

export default function PurchaseDetails({purchase, items, onClose}: {
    purchase: Purchase; items: {item_id: string; item_name: string}[]; onClose: () => void;
}) {
    const query = useQuery(getPurchaseDetailsQueryOption(purchase.purchase_id));
    const itemName = (line: PurchaseDetail) => items.find(item => item.item_id === line.item_id)?.item_name || line.item_id || 'Item unavailable';
    const columns: GridColDef<PurchaseDetail>[] = [
        {field: 'item_id', headerName: 'Item', flex: 1, minWidth: 170, valueGetter: (_, row) => itemName(row)},
        {field: 'quantity_bought', headerName: 'Quantity bought', type: 'number', width: 150},
        {field: 'cost_price', headerName: 'Cost price', type: 'number', width: 130},
        {field: 'batch_number', headerName: 'Batch number', flex: 1, minWidth: 150},
        {field: 'expiry_date', headerName: 'Expiry date', width: 150},
    ];
    return <Stack spacing={2}>
        <Button onClick={onClose}>← Back to purchases</Button>
        <Typography component="h2" variant="h5">Purchase {purchase.invoice_number}</Typography>
        <Typography>{purchase.purchase_notes || 'No notes'}</Typography>
        {query.isPending && <CircularProgress aria-label="Loading purchase details" />}
        {query.error && <Alert severity="error">{query.error.message}<Button onClick={() => void query.refetch()}>Retry</Button></Alert>}
        {query.data && <PurchaseResponsiveList rows={query.data} columns={columns} getRowId={row => row.purchase_details_id} label="Purchase details"
            getSearchText={row => `${itemName(row)} ${row.quantity_bought} ${row.cost_price} ${row.batch_number || ''} ${row.expiry_date || ''}`}
            getSortValue={(row, field) => field === 'item_id' ? itemName(row) : field === 'quantity_bought' || field === 'cost_price' ? row[field] || 0 : String(row[field as keyof PurchaseDetail] || '')}
            renderCard={line => <Paper component="article" variant="outlined" sx={{p: 2}}>
            <Typography sx={{fontWeight: 600}}>{itemName(line)}</Typography>
            <Typography>Quantity bought: {line.quantity_bought}</Typography><Typography>Cost price: {line.cost_price}</Typography>
            <Typography>Batch: {line.batch_number || '—'} · Expiry: {line.expiry_date || '—'}</Typography>
        </Paper>} />}
        <Alert severity="info">Purchase item lines are read-only after creation.</Alert>
    </Stack>;
}
