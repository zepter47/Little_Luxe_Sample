import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Alert, Box, Button, CircularProgress, Paper, Typography } from "@mui/material";
import { getCategoryNameQueryOption } from "./category.query";
import type { category } from "./category.types";
import CategoryList from "./Components/CategoryList";
import CategoryForm from "./Components/CategoryForm";
import { styles } from "./Components/Category.styles";

export default function Categories() {
    const query = useQuery(getCategoryNameQueryOption());
    const [editing, setEditing] = useState<category | null | undefined>();
    const [saved, setSaved] = useState(false);
    if (query.isPending) return <CircularProgress aria-label="Loading categories" />;
    if (query.error) return <Alert severity="error">{query.error.message}<Button onClick={() => {void query.refetch();}}>Retry</Button></Alert>;
    return <Paper variant="outlined" sx={styles.panel}>
        <Box sx={styles.toolbar}><Typography component="h2" variant="h5">Categories</Typography>
            <Button variant="contained" onClick={() => {setSaved(false); setEditing(null);}}>Add category</Button></Box>
        {saved && <Alert severity="success">category saved successfully.</Alert>}
        <CategoryList rows={query.data} onEdit={row => {setSaved(false); setEditing(row);}} />
        {editing !== undefined && <CategoryForm record={editing || undefined} onCancel={() => setEditing(undefined)}
            onSaved={() => {setEditing(undefined); setSaved(true);}} />}
    </Paper>;
}
