import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Alert, Box, Button, CircularProgress, Paper, Stack, Typography } from "@mui/material";
import { getSuppliersQueryOption } from "./supplier.query";
import { getSupplierCategoriesQueryOption } from "./supplierCategory.query";
import type { Supplier } from "./supplier.types";
import type { SupplierCategory } from "./supplierCategory.types";
import SupplierList from "./components/SupplierList";
import SupplierForm from "./components/SupplierForm";
import SupplierCategoryList from "./components/SupplierCategoryList";
import SupplierCategoryForm from "./components/SupplierCategoryForm";
import { styles } from "./components/Supplier.styles";

export default function Suppliers() {
    const suppliers = useQuery(getSuppliersQueryOption());
    const categories = useQuery(getSupplierCategoriesQueryOption());
    const [editingSupplier, setEditingSupplier] = useState<Supplier | null | undefined>();
    const [editingCategory, setEditingCategory] = useState<SupplierCategory | null | undefined>();
    const [saved, setSaved] = useState("");
    if (suppliers.isPending || categories.isPending) return <CircularProgress aria-label="Loading suppliers" />;
    const error = suppliers.error || categories.error;
    if (error) return <Alert severity="error">{error.message}<Button onClick={() => {void suppliers.refetch(); void categories.refetch();}}>Retry</Button></Alert>;
    return <Stack spacing={3}>
        {saved && <Alert severity="success">{saved} saved successfully.</Alert>}
        <Paper variant="outlined" sx={styles.panel}>
            <Box sx={styles.toolbar}><Typography component="h2" variant="h5">Suppliers</Typography>
                <Button variant="contained" onClick={() => {setSaved(""); setEditingSupplier(null);}}>Add supplier</Button></Box>
            {!categories.data?.length && <Alert severity="info">Add a supplier category below first, then select it when creating a supplier.</Alert>}
            <SupplierList rows={suppliers.data || []} categories={categories.data || []} onEdit={row => {setSaved(""); setEditingSupplier(row);}} />
        </Paper>
        <Paper variant="outlined" sx={styles.panel}>
            <Box sx={styles.toolbar}><Typography component="h2" variant="h5">Supplier categories</Typography>
                <Button variant="contained" onClick={() => {setSaved(""); setEditingCategory(null);}}>Add supplier category</Button></Box>
            <SupplierCategoryList rows={categories.data || []} onEdit={row => {setSaved(""); setEditingCategory(row);}} />
        </Paper>
        {editingSupplier !== undefined && <SupplierForm record={editingSupplier || undefined} categories={categories.data || []}
            onCancel={() => setEditingSupplier(undefined)} onSaved={() => {setEditingSupplier(undefined); setSaved("supplier");}} />}
        {editingCategory !== undefined && <SupplierCategoryForm record={editingCategory || undefined}
            onCancel={() => setEditingCategory(undefined)} onSaved={() => {setEditingCategory(undefined); setSaved("supplier category");}} />}
    </Stack>;
}
