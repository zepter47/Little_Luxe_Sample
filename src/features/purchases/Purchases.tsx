import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Alert, Button, CircularProgress, Paper, Stack, Typography } from '@mui/material';
import { getPurchaseOptionsQueryOption, getPurchasesQueryOption } from './purchase.query';
import type { Purchase } from './purchase.types';
import PurchaseForm from './components/PurchaseForm';
import PurchaseHeaderForm from './components/PurchaseHeaderForm';
import PurchaseList from './components/PurchaseList';
import PurchaseDetails from './components/PurchaseDetails';

export default function Purchases() {
    const query = useQuery(getPurchasesQueryOption());
    const options = useQuery(getPurchaseOptionsQueryOption());
    const [creating, setCreating] = useState(false);
    const [editing, setEditing] = useState<Purchase | null>(null);
    const [selected, setSelected] = useState<Purchase | null>(null);
    const [saved, setSaved] = useState(false);
    if (query.isPending || options.isPending) return <CircularProgress aria-label="Loading purchases" />;
    const error = query.error || options.error;
    if (error) return <Alert severity="error">{error.message}<Button onClick={() => {void query.refetch(); void options.refetch();}}>Retry</Button></Alert>;
    if (!options.data) return null;
    const selectedPurchase = query.data?.find(row => row.purchase_id === selected?.purchase_id) || selected;
    if (selectedPurchase) return <PurchaseDetails purchase={selectedPurchase} items={options.data.items} onClose={() => setSelected(null)} />;
    return <Paper variant="outlined" sx={{p: {xs: 2, sm: 3}, borderRadius: 4}}><Stack spacing={2}>
        <Typography component="h2" variant="h5">Purchases</Typography>
        <Button variant="contained" onClick={() => {setSaved(false); setCreating(true);}}>Add purchase</Button>
        {saved && <Alert severity="success">Purchase and all item lines saved successfully.</Alert>}
        <PurchaseList purchases={query.data || []} suppliers={options.data.suppliers} onSelect={setSelected} onEdit={setEditing} />
        {creating && <PurchaseForm {...options.data} onClose={() => setCreating(false)} onSaved={() => {setCreating(false); setSaved(true);}} />}
        {editing && <PurchaseHeaderForm purchase={editing} suppliers={options.data.suppliers} onClose={() => setEditing(null)} />}
    </Stack></Paper>;
}
