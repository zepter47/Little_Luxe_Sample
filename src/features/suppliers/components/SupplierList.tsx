import { Button, Paper, Typography } from "@mui/material";
import type { GridColDef } from "@mui/x-data-grid";
import type { Supplier } from "../supplier.types";
import SupplierResponsiveList from "./SupplierResponsiveList";
import { styles } from "./Supplier.styles";
import type { SupplierCategory } from "../supplierCategory.types";

export default function SupplierList({rows, categories, onEdit}: {rows: Supplier[]; categories: SupplierCategory[]; onEdit: (row: Supplier) => void}) {
    const columns: GridColDef<Supplier>[] = [
        {field: "supplier_name", headerName: "Supplier name", flex: 1, minWidth: 170, valueGetter: (_, row) => row.supplier_name || ""},
        {field: "supplier_cat_id", headerName: "Supplier category", flex: 1, minWidth: 170, valueGetter: (_, row) => categories.find(category => category.supplier_category_id === row.supplier_cat_id)?.category_name || "Unavailable"},
        {field: "supplier_email", headerName: "Email", flex: 1, minWidth: 170, valueGetter: (_, row) => row.supplier_email || ""},
        {field: "supplier_contact", headerName: "Phone", flex: 1, minWidth: 170, valueGetter: (_, row) => row.supplier_contact || ""},
        {field: "supplier_address", headerName: "Address", flex: 1, minWidth: 170, valueGetter: (_, row) => row.supplier_address || ""},
        {field: "actions", headerName: "Actions", width: 100, sortable: false,
            renderCell: ({row}) => <Button onClick={() => onEdit(row)}>Edit</Button>},
    ];
    return <SupplierResponsiveList rows={rows} columns={columns} getRowId={row => row.supplier_id} label="Suppliers"
        getSearchText={row => (row.supplier_name || "") + " " + (categories.find(category => category.supplier_category_id === row.supplier_cat_id)?.category_name || "Unavailable") + " " + (row.supplier_email || "") + " " + (row.supplier_contact || "") + " " + (row.supplier_address || "") + " " + (row.supplier_notes || "")}
        getSortValue={(row, field) => field === "supplier_name" ? (row.supplier_name || "") : field === "supplier_cat_id" ? (categories.find(category => category.supplier_category_id === row.supplier_cat_id)?.category_name || "Unavailable") : field === "supplier_email" ? (row.supplier_email || "") : field === "supplier_contact" ? (row.supplier_contact || "") : field === "supplier_address" ? (row.supplier_address || "") : ""}
        renderCard={row => <Paper component="article" variant="outlined" sx={styles.listCard}>
            <Typography component="h3" sx={styles.cardTitle}>{row.supplier_name}</Typography>
                <Typography variant="body2">Supplier category: {categories.find(category => category.supplier_category_id === row.supplier_cat_id)?.category_name || "Unavailable"}</Typography>
                <Typography variant="body2">Email: {row.supplier_email || ""}</Typography>
                <Typography variant="body2">Phone: {row.supplier_contact || ""}</Typography>
                <Typography variant="body2">Address: {row.supplier_address || ""}</Typography>
                <Typography variant="body2">Notes: {row.supplier_notes || ""}</Typography>
            <Button onClick={() => onEdit(row)} aria-label={`Edit ${row.supplier_name}`}>Edit</Button>
        </Paper>} />;
}
