import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Alert, Box, Button, Checkbox, FormControlLabel, CircularProgress, Dialog, DialogContent, DialogTitle, Paper, Typography } from "@mui/material";
import { getAdminItemsQueryOption } from "../../items/item.query";
import { getCategoryNameQueryOption } from "../../Categories/category.query";
import AdminItemList from "./AdminItemList";
import ItemForm from "../../items/components/itemForm";
import type { AdminItem } from "../../items/item.types";
import { getUnitsQueryOption } from "../../units/unit.query";
import { useAuth } from "../../auth/auth";
import { styles } from "./Admin.styles";

export default function AdminItems() {
    const {user} = useAuth();
    const [includeInactive, setIncludeInactive] = useState(false);
    const items = useQuery(getAdminItemsQueryOption(includeInactive, user?.id || ""));
    const categories = useQuery(getCategoryNameQueryOption());
    const units = useQuery(getUnitsQueryOption());
    const [editing, setEditing] = useState<AdminItem | null | undefined>(undefined);
    const [imageWarning, setImageWarning] = useState("");
    const [saved, setSaved] = useState(false);
    if (items.isPending || categories.isPending || units.isPending) return <CircularProgress aria-label="Loading items" />;
    const error = items.error || categories.error || units.error;
    if (error) return <Alert severity="error">{error.message}<Button onClick={() => {void items.refetch(); void categories.refetch(); void units.refetch();}}>Retry</Button></Alert>;
    return <Paper variant="outlined" sx={styles.panel}>
        <Box sx={styles.toolbar}>
            <Box><Typography component="h2" variant="h5">Items</Typography><Typography color="text.secondary">Manage the collection your customers see.</Typography></Box>
            <Button onClick={() => {void items.refetch();}} disabled={items.isFetching}>Refresh inventory</Button>
            <Button variant="contained" onClick={() => {setSaved(false); setEditing(null);}}>Add item</Button>
        </Box>
        {saved && <Alert severity="success" sx={{mb: 2}}>Item saved. Its active status controls storefront visibility.</Alert>}
        {saved && imageWarning && <Alert severity="warning" sx={{mb: 2}}>{imageWarning}</Alert>}
        <FormControlLabel label="Show inactive products" control={<Checkbox checked={includeInactive} onChange={(_, checked) => setIncludeInactive(checked)} />} />
        <AdminItemList items={items.data || []} categories={categories.data || []} units={units.data || []} onEdit={row => {setSaved(false); setEditing(row);}} />
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

