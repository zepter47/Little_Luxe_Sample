import { Button, Paper, Typography } from "@mui/material";
import type { GridColDef } from "@mui/x-data-grid";
import type { Unit } from "../unit.types";
import UnitResponsiveList from "./UnitResponsiveList";
import { styles } from "./Unit.styles";

export default function UnitList({rows, onEdit}: {rows: Unit[]; onEdit: (row: Unit) => void}) {
    const columns: GridColDef<Unit>[] = [
        {field: "uom_name", headerName: "Unit name", flex: 1, minWidth: 170, valueGetter: (_, row) => row.uom_name || ""},
        {field: "actions", headerName: "Actions", width: 100, sortable: false,
            renderCell: ({row}) => <Button onClick={() => onEdit(row)}>Edit</Button>},
    ];
    return <UnitResponsiveList rows={rows} columns={columns} getRowId={row => row.uom_id} label="Units of measure"
        getSearchText={row => (row.uom_name || "") + " " + (row.uom_notes || "")}
        getSortValue={(row, field) => field === "uom_name" ? (row.uom_name || "") : ""}
        renderCard={row => <Paper component="article" variant="outlined" sx={styles.listCard}>
            <Typography component="h3" sx={styles.cardTitle}>{row.uom_name}</Typography>
                <Typography variant="body2">Description: {row.uom_notes || ""}</Typography>
            <Button onClick={() => onEdit(row)} aria-label={`Edit ${row.uom_name}`}>Edit</Button>
        </Paper>} />;
}
