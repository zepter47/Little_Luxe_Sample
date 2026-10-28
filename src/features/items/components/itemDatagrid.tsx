import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import { Button } from "@mui/material";
import type { item } from "../item.types";
import type { Unit } from "../../units/unit.types";
import type { category } from "../../Categories/category.types";

export default function ItemDatagrid({items, categories, units, onEdit}: {items: item[]; categories: category[]; units: Unit[]; onEdit: (item: item) => void}) {
    const columns: GridColDef<item>[] = [
        {field: "item_name", headerName: "Item", flex: 1, minWidth: 180},
        {field: "sale_price", headerName: "Sale price", type: "number", width: 130},
        {field: "item_category_id", headerName: "Category", flex: 1, minWidth: 160,
            valueFormatter: value => categories.find(category => category.item_category_id === value)?.category_name || "Uncategorized"},
        {field: "uom_id", headerName: "Unit of measure", width: 160,
            valueFormatter: value => units.find(unit => unit.uom_id === value)?.uom_name || "Not set"},
        {field: "actions", headerName: "Actions", sortable: false, filterable: false, width: 100,
            renderCell: ({row}) => <Button onClick={() => onEdit(row)} aria-label={`Edit ${row.item_name}`}>Edit</Button>},
    ];
    return <DataGrid rows={items} columns={columns} getRowId={row => row.item_id} disableRowSelectionOnClick
        pageSizeOptions={[5, 10, 25]} initialState={{pagination: {paginationModel: {pageSize: 10}}}}
        sx={{height: 460, border: 0, "& .MuiDataGrid-columnHeaders": {bgcolor: "#faf6f2"}}} />;
}

