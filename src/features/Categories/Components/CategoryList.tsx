import { Button, Paper, Typography } from "@mui/material";
import type { GridColDef } from "@mui/x-data-grid";
import type { category } from "../category.types";
import CategoryResponsiveList from "./CategoryResponsiveList";
import { styles } from "./Category.styles";

export default function CategoryList({rows, onEdit}: {rows: category[]; onEdit: (row: category) => void}) {
    const columns: GridColDef<category>[] = [
        {field: "category_name", headerName: "Category name", flex: 1, minWidth: 170, valueGetter: (_, row) => row.category_name || ""},
        {field: "actions", headerName: "Actions", width: 100, sortable: false,
            renderCell: ({row}) => <Button onClick={() => onEdit(row)}>Edit</Button>},
    ];
    return <CategoryResponsiveList rows={rows} columns={columns} getRowId={row => row.item_category_id} label="Categories"
        getSearchText={row => (row.category_name || "") + " " + (row.category_notes || "")}
        getSortValue={(row, field) => field === "category_name" ? (row.category_name || "") : ""}
        renderCard={row => <Paper component="article" variant="outlined" sx={styles.listCard}>
            <Typography component="h3" sx={styles.cardTitle}>{row.category_name}</Typography>
                <Typography variant="body2">Description: {row.category_notes || ""}</Typography>
            <Button onClick={() => onEdit(row)} aria-label={`Edit ${row.category_name}`}>Edit</Button>
        </Paper>} />;
}
