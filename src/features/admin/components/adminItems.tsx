import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Alert, Box, Button, CircularProgress, Dialog, DialogContent, DialogTitle, Paper, Typography } from "@mui/material";
import { getItemsQueryOption } from "../../items/item.query";
import { getCategoryNameQueryOption } from "../../Categories/category.query";
import ItemDatagrid from "../../items/components/itemDatagrid";
import ItemForm from "../../items/components/itemForm";
import type { item } from "../../items/item.types";
import { getUnitsQueryOption } from "../../units/unit.query";
import { styles } from "./Admin.styles";

export default function AdminItems() {
    const items = useQuery(getItemsQueryOption());
    const categories = useQuery(getCategoryNameQueryOption());
    const units = useQuery(getUnitsQueryOption());
    const [editing, setEditing] = useState<item | null | undefined>(undefined);
    const [imageWarning, setImageWarning] = useState("");
    const [saved, setSaved] = useState(false);
    if (items.isPending || categories.isPending || units.isPending) return <CircularProgress aria-label="Loading items" />;
    const error = items.error || categories.error || units.error;
    if (error) return <Alert severity="error">{error.message}<Button onClick={() => {void items.refetch(); void categories.refetch(); void units.refetch();}}>Retry</Button></Alert>;
    return <Paper variant="outlined" sx={styles.panel}>
        <Box sx={styles.toolbar}>
            <Box><Typography component="h2" variant="h5">Items</Typography><Typography color="text.secondary">Manage the collection your customers see.</Typography></Box>
            <Button variant="contained" onClick={() => {setSaved(false); setEditing(null);}}>Add item</Button>
        </Box>
        {saved && <Alert severity="success" sx={{mb: 2}}>Item saved. It is now available on the home page.</Alert>}
        {saved && imageWarning && <Alert severity="warning" sx={{mb: 2}}>{imageWarning}</Alert>}
        <ItemDatagrid items={items.data || []} categories={categories.data || []} units={units.data || []} onEdit={row => {setSaved(false); setEditing(row);}} />
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

