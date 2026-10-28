import { Button, Paper, Typography } from "@mui/material";
import type { GridColDef } from "@mui/x-data-grid";
import type { SupplierCategory } from "../supplierCategory.types";
import SupplierResponsiveList from "./SupplierResponsiveList";
import { styles } from "./Supplier.styles";

export default function SupplierCategoryList({rows, onEdit}: {rows: SupplierCategory[]; onEdit: (row: SupplierCategory) => void}) {
    const columns: GridColDef<SupplierCategory>[] = [
        {field: "category_name", headerName: "Category name", flex: 1, minWidth: 170, valueGetter: (_, row) => row.category_name || ""},
        {field: "actions", headerName: "Actions", width: 100, sortable: false,
            renderCell: ({row}) => <Button onClick={() => onEdit(row)}>Edit</Button>},
    ];
    return <SupplierResponsiveList rows={rows} columns={columns} getRowId={row => row.supplier_category_id} label="Supplier categories"
        getSearchText={row => (row.category_name || "") + " " + (row.category_notes || "")}
        getSortValue={(row, field) => field === "category_name" ? (row.category_name || "") : ""}
        renderCard={row => <Paper component="article" variant="outlined" sx={styles.listCard}>
            <Typography component="h3" sx={styles.cardTitle}>{row.category_name}</Typography>
                <Typography variant="body2">Description: {row.category_notes || ""}</Typography>
            <Button onClick={() => onEdit(row)} aria-label={`Edit ${row.category_name}`}>Edit</Button>
        </Paper>} />;
}
