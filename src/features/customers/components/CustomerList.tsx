import { Button, Paper, Typography } from "@mui/material";
import type { GridColDef } from "@mui/x-data-grid";
import type { Customer } from "../customer.types";
import CustomerResponsiveList from "./CustomerResponsiveList";
import { styles } from "./Customer.styles";
import { customerDisplayName } from "../customer.model";

export default function CustomerList({rows, onEdit}: {rows: Customer[]; onEdit: (row: Customer) => void}) {
    const columns: GridColDef<Customer>[] = [
        {field: "customer_name", headerName: "Customer", flex: 1, minWidth: 170, valueGetter: (_, row) => customerDisplayName(row)},
        {field: "email", headerName: "Email", flex: 1, minWidth: 170, valueGetter: (_, row) => row.email || ""},
        {field: "phone_number", headerName: "Phone number", flex: 1, minWidth: 170, valueGetter: (_, row) => row.phone_number || ""},
        {field: "is_active", headerName: "Active", flex: 1, minWidth: 170, valueGetter: (_, row) => row.is_active ? "Yes" : "No"},
        {field: "actions", headerName: "Actions", width: 100, sortable: false,
            renderCell: ({row}) => <Button onClick={() => onEdit(row)}>Edit</Button>},
    ];
    return <CustomerResponsiveList rows={rows} columns={columns} getRowId={row => row.customer_id} label="Customers"
        getSearchText={row => (row.first_name || "") + " " + (row.last_name || "") + " " + (row.email || "") + " " + (row.phone_number || "") + " " + (row.address || "") + " " + (row.customer_notes || "") + " " + (row.is_active ? "Yes" : "No")}
        getSortValue={(row, field) => field === "customer_name" ? customerDisplayName(row) : field === "email" ? (row.email || "") : field === "phone_number" ? (row.phone_number || "") : field === "is_active" ? (row.is_active ? "Yes" : "No") : ""}
        renderCard={row => <Paper component="article" variant="outlined" sx={styles.listCard}>
            <Typography component="h3" sx={styles.cardTitle}>{customerDisplayName(row)}</Typography>
                <Typography variant="body2">Email: {row.email || ""}</Typography>
                <Typography variant="body2">Phone number: {row.phone_number || ""}</Typography>
                <Typography variant="body2">Address: {row.address || ""}</Typography>
                <Typography variant="body2">Notes: {row.customer_notes || ""}</Typography>
                <Typography variant="body2">Active: {row.is_active ? "Yes" : "No"}</Typography>
            <Button onClick={() => onEdit(row)} aria-label={`Edit ${customerDisplayName(row)}`}>Edit</Button>
        </Paper>} />;
}
