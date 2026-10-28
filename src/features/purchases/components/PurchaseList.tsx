import { formatPurchaseDate } from "../purchase.model";
import { Button, Paper, Typography } from '@mui/material';
import type { GridColDef } from '@mui/x-data-grid';
import type { Purchase } from '../purchase.types';
import PurchaseResponsiveList from './PurchaseResponsiveList';

export default function PurchaseList({purchases, suppliers, onSelect, onEdit}: {
    purchases: Purchase[]; suppliers: {supplier_id: string; supplier_name: string}[];
    onSelect: (purchase: Purchase) => void; onEdit: (purchase: Purchase) => void;
}) {
    const supplierName = (row: Purchase) => suppliers.find(supplier => supplier.supplier_id === row.supplier_id)?.supplier_name || 'No supplier';
    const quantity = (row: Purchase) => row.summary.reduce((sum, line) => sum + (line.quantity_bought || 0), 0);
    const columns: GridColDef<Purchase>[] = [
        {field: 'invoice_number', headerName: 'Invoice', flex: 1, minWidth: 170},
        {field: 'supplier_id', headerName: 'Supplier', flex: 1, minWidth: 170, valueGetter: (_, row) => supplierName(row)},
        {field: 'added_by', headerName: 'Added by (user ID)', flex: 1, minWidth: 170},
        {field: 'added_on', headerName: 'Added on', flex: 1, minWidth: 170, valueFormatter: value => formatPurchaseDate(value)},
        {field: 'quantity', headerName: 'Quantity', type: 'number', width: 120, valueGetter: (_, row) => quantity(row)},
        {field: 'actions', headerName: 'Actions', width: 170, sortable: false,
            renderCell: ({row}) => <><Button onClick={() => onEdit(row)}>Edit</Button><Button onClick={() => onSelect(row)}>Select</Button></>},
    ];
    return <PurchaseResponsiveList rows={purchases} columns={columns} getRowId={row => row.purchase_id} label="Purchases"
        getSearchText={row => `${row.invoice_number} ${supplierName(row)} ${row.added_by || ''} ${row.added_on || ''} ${quantity(row)} ${row.purchase_notes || ''}`}
        getSortValue={(row, field) => field === 'supplier_id' ? supplierName(row) : field === 'quantity' ? quantity(row) : String(row[field as keyof Purchase] || '')}
        renderCard={row => <Paper component="article" variant="outlined" sx={{p: 2, borderRadius: 3, overflowWrap: 'anywhere'}}>
            <Typography component="h3" sx={{fontWeight: 600}}>{row.invoice_number}</Typography>
            <Typography>Supplier: {supplierName(row)}</Typography>
            <Typography>Added by: {row.added_by || 'Not recorded'}</Typography>
            <Typography>Added on: {formatPurchaseDate(row.added_on)}</Typography>
            <Typography>Quantity: {quantity(row).toLocaleString()}</Typography>
            <Button onClick={() => onEdit(row)}>Edit</Button><Button onClick={() => onSelect(row)}>Select</Button>
        </Paper>} />;
}
