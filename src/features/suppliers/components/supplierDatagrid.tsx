import { useQuery } from "@tanstack/react-query";
import { Alert, Button, CircularProgress, Stack } from "@mui/material";
import SupplierRecords from "./SupplierRecords";
import { getSuppliersQueryOption, getSupplierCategoriesQueryOption } from "../supplier.query";
import { saveSupplierAsync, saveSupplierCategoryAsync } from "../supplier.api";
import { supplierKeys } from "../supplier.types";

export default function SupplierDatagrid() {
    const query = useQuery(getSuppliersQueryOption());
    const categories = useQuery(getSupplierCategoriesQueryOption());
    if (query.isPending || categories.isPending) return <CircularProgress aria-label="Loading suppliers" />;
    const error = query.error || categories.error;
    if (error) return <Alert severity="error">{error.message}<Button onClick={() => {void query.refetch(); void categories.refetch();}}>Retry</Button></Alert>;
    return <Stack spacing={3}><SupplierRecords title="Suppliers" singular="supplier" queryKey={supplierKeys.all}
        notice={!categories.data?.length ? "Add a supplier category below first, then select it when creating a supplier." : undefined}
        rows={(query.data || []).map(row => ({id: row.supplier_id, supplier_name: row.supplier_name,
            supplier_cat_id: row.supplier_cat_id, supplier_email: row.supplier_email || "", supplier_contact: row.supplier_contact || "",
            supplier_address: row.supplier_address || "", supplier_notes: row.supplier_notes || ""}))}
        fields={[{name: "supplier_name", label: "Supplier name", required: true},
            {name: "supplier_cat_id", label: "Supplier category", required: true,
                options: (categories.data || []).map(row => ({value: row.supplier_category_id, label: row.category_name}))},
            {name: "supplier_email", label: "Email", type: "email"}, {name: "supplier_contact", label: "Phone"},
            {name: "supplier_address", label: "Address"}, {name: "supplier_notes", label: "Notes", multiline: true}]}
        onSave={(values, id) => saveSupplierAsync({supplier_id: id || crypto.randomUUID(), supplier_name: values.supplier_name,
            supplier_cat_id: values.supplier_cat_id, supplier_email: values.supplier_email || null, supplier_contact: values.supplier_contact || null,
            supplier_address: values.supplier_address || null, supplier_notes: values.supplier_notes || null}, !!id)} />
        <SupplierRecords title="Supplier categories" singular="supplier category" queryKey={supplierKeys.categories}
            rows={(categories.data || []).map(row => ({id: row.supplier_category_id, category_name: row.category_name, category_notes: row.category_notes || ""}))}
            fields={[{name: "category_name", label: "Category name", required: true}, {name: "category_notes", label: "Description", multiline: true}]}
            onSave={(values, id) => saveSupplierCategoryAsync({category_name: values.category_name, category_notes: values.category_notes}, id)} />
    </Stack>;
}

