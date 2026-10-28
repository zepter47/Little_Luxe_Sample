import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Alert, Box, Button, Checkbox, FormControlLabel, CircularProgress, Dialog, DialogContent, DialogTitle, Paper, Typography } from "@mui/material";
import { getAdminItemsQueryOption } from "./item.query";
import { getCategoryNameQueryOption } from "../Categories/category.query";
import ItemList from "./components/ItemList";
import ItemForm from "./components/itemForm";
import type { AdminItem } from "./item.types";
import { getUnitsQueryOption } from "../units/unit.query";
import { useAuth } from "../auth/auth";
import { styles } from "./components/Item.styles";

export default function Items() {
    const {user} = useAuth();
    if (!user) return null;
    // A different account must never inherit an open form or the previous draft.
    return <ItemPanel key={user.id} userId={user.id} />;
}

function ItemPanel({userId}: {userId: string}) {
    const [includeInactive, setIncludeInactive] = useState(false);
    const items = useQuery(getAdminItemsQueryOption(includeInactive, userId));
    const categories = useQuery(getCategoryNameQueryOption());
    const units = useQuery(getUnitsQueryOption());
    const [editing, setEditing] = useState<AdminItem | null | undefined>(undefined);
    const [imageWarning, setImageWarning] = useState("");
    const [saved, setSaved] = useState(false);
    const loading = items.isPending || categories.isPending || units.isPending;
    const error = items.error || categories.error || units.error;
    const retry = () => {void items.refetch(); void categories.refetch(); void units.refetch();};
    // Refreshing lists must not unmount an open form and discard selected files.
    if (editing === undefined && loading) return <CircularProgress aria-label="Loading items" />;
    if (editing === undefined && error) return <Alert severity="error">{error.message}<Button onClick={retry}>Retry</Button></Alert>;
    return <Paper variant="outlined" sx={styles.panel}>
        <Box sx={styles.toolbar}>
            <Box><Typography component="h2" variant="h5">Items</Typography><Typography color="text.secondary">Manage the collection your customers see.</Typography></Box>
            <Button onClick={() => {void items.refetch();}} disabled={items.isFetching}>Refresh inventory</Button>
            <Button variant="contained" onClick={() => {setSaved(false); setEditing(null);}}>Add item</Button>
        </Box>
        {editing !== undefined && error && <Alert severity="warning" sx={{mb: 2}}>Unable to refresh item options. Your draft is still open. <Button onClick={retry}>Retry</Button></Alert>}
        {saved && <Alert severity="success" sx={{mb: 2}}>Item saved. Its active status controls storefront visibility.</Alert>}
        {saved && imageWarning && <Alert severity="warning" sx={{mb: 2}}>{imageWarning}</Alert>}
        <FormControlLabel label="Show inactive products" control={<Checkbox checked={includeInactive} onChange={(_, checked) => setIncludeInactive(checked)} />} />
        <ItemList items={items.data || []} categories={categories.data || []} units={units.data || []} onEdit={row => {setSaved(false); setEditing(row);}} />
        <Dialog open={editing !== undefined} fullWidth maxWidth="sm">
            <DialogTitle>{editing ? "Edit item" : "Add item"}</DialogTitle>
            <DialogContent>
                {editing !== undefined && <Box sx={{pt: 1}}><ItemForm key={editing?.item_id || "new"} item={editing || undefined}
                    categories={categories.data || []} units={units.data || []} onCancel={() => setEditing(undefined)}
                    onSaved={warning => {setImageWarning(warning || ""); setEditing(undefined); setSaved(true);}} /></Box>}
            </DialogContent>
        </Dialog>
    </Paper>;
}


