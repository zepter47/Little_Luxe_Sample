import { Button, Paper, Typography } from "@mui/material";
import type { GridColDef } from "@mui/x-data-grid";
import type { Customer } from "../customer.types";
import CustomerResponsiveList from "./CustomerResponsiveList";
import { styles } from "./Customer.styles";

export default function CustomerList({rows, onEdit}: {rows: Customer[]; onEdit: (row: Customer) => void}) {
    const columns: GridColDef<Customer>[] = [
        {field: "first_name", headerName: "First name", flex: 1, minWidth: 170, valueGetter: (_, row) => row.first_name || ""},
        {field: "last_name", headerName: "Last name", flex: 1, minWidth: 170, valueGetter: (_, row) => row.last_name || ""},
        {field: "email", headerName: "Email", flex: 1, minWidth: 170, valueGetter: (_, row) => row.email || ""},
        {field: "phone_number", headerName: "Phone number", flex: 1, minWidth: 170, valueGetter: (_, row) => row.phone_number || ""},
        {field: "is_active", headerName: "Active", flex: 1, minWidth: 170, valueGetter: (_, row) => row.is_active ? "Yes" : "No"},
        {field: "actions", headerName: "Actions", width: 100, sortable: false,
            renderCell: ({row}) => <Button onClick={() => onEdit(row)}>Edit</Button>},
    ];
    return <CustomerResponsiveList rows={rows} columns={columns} getRowId={row => row.customer_id} label="Customers"
        getSearchText={row => (row.first_name || "") + " " + (row.last_name || "") + " " + (row.email || "") + " " + (row.phone_number || "") + " " + (row.address || "") + " " + (row.customer_notes || "") + " " + (row.is_active ? "Yes" : "No")}
        getSortValue={(row, field) => field === "first_name" ? (row.first_name || "") : field === "last_name" ? (row.last_name || "") : field === "email" ? (row.email || "") : field === "phone_number" ? (row.phone_number || "") : field === "is_active" ? (row.is_active ? "Yes" : "No") : ""}
        renderCard={row => <Paper component="article" variant="outlined" sx={styles.listCard}>
            <Typography component="h3" sx={styles.cardTitle}>{row.first_name}</Typography>
                <Typography variant="body2">Last name: {row.last_name || ""}</Typography>
                <Typography variant="body2">Email: {row.email || ""}</Typography>
                <Typography variant="body2">Phone number: {row.phone_number || ""}</Typography>
                <Typography variant="body2">Address: {row.address || ""}</Typography>
                <Typography variant="body2">Notes: {row.customer_notes || ""}</Typography>
                <Typography variant="body2">Active: {row.is_active ? "Yes" : "No"}</Typography>
            <Button onClick={() => onEdit(row)} aria-label={`Edit ${row.first_name}`}>Edit</Button>
        </Paper>} />;
}
