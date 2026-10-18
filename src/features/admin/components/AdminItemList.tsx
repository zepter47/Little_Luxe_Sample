import { Box, Button, Paper, Typography } from "@mui/material";
import type { GridColDef } from "@mui/x-data-grid";
import type { item } from "../../items/item.types";
import type { category } from "../../Categories/category.types";
import type { Unit } from "../../units/unit.query";
import AdminResponsiveList from "./AdminResponsiveList";
import { styles } from "./Admin.styles";

export default function AdminItemList({items, categories, units, onEdit}: {
    items: item[]; categories: category[]; units: Unit[]; onEdit: (row: item) => void;
}) {
    const categoryName = (row: item) => categories.find(category => category.item_category_id === row.item_category_id)?.category_name || "Uncategorized";
    const unitName = (row: item) => units.find(unit => unit.uom_id === row.uom_id)?.uom_name || "Not set";
    const columns: GridColDef<item>[] = [
        {field: "item_name", headerName: "Item", flex: 1, minWidth: 180},
        {field: "sale_price", headerName: "Sale price", type: "number", width: 130},
        {field: "item_category_id", headerName: "Category", flex: 1, minWidth: 160, valueGetter: (_, row) => categoryName(row)},
        {field: "uom_id", headerName: "Unit of measure", width: 160, valueGetter: (_, row) => unitName(row)},
        {field: "actions", headerName: "Actions", sortable: false, filterable: false, width: 100,
            renderCell: ({row}) => <Button onClick={() => onEdit(row)} aria-label={`Edit ${row.item_name}`}>Edit</Button>},
    ];
    return <AdminResponsiveList rows={items} columns={columns} getRowId={row => row.item_id} label="Items"
        getSearchText={row => `${row.item_name} ${row.sale_price} ${categoryName(row)} ${unitName(row)}`}
        getSortValue={(row, field) => field === "item_category_id" ? categoryName(row) : field === "uom_id" ? unitName(row) : field === "sale_price" ? row.sale_price : row.item_name}
        renderCard={row => <Paper component="article" variant="outlined" sx={styles.listCard}>
            <Box sx={styles.cardHeading}>
                <Box sx={{minWidth: 0}}>
                    <Typography component="h3" sx={styles.cardTitle}>{row.item_name}</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{mt: 0.5}}>
                        {categoryName(row)} · {unitName(row)}
                    </Typography>
                    <Typography aria-label="Sale price" sx={{mt: 1, fontWeight: 600, fontVariantNumeric: "tabular-nums"}}>
                        {row.sale_price.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                    </Typography>
                </Box>
                <Button sx={styles.cardEdit} onClick={() => onEdit(row)} aria-label={`Edit ${row.item_name}`}>Edit</Button>
            </Box>
        </Paper>} />;
}
