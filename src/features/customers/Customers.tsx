import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Alert, Box, Button, CircularProgress, Paper, Typography } from "@mui/material";
import { getCustomersQueryOption } from "./customer.query";
import type { Customer } from "./customer.types";
import CustomerList from "./components/CustomerList";
import CustomerForm from "./components/CustomerForm";
import { styles } from "./components/Customer.styles";

export default function Customers() {
    const query = useQuery(getCustomersQueryOption());
    const [editing, setEditing] = useState<Customer | null | undefined>();
    const [saved, setSaved] = useState(false);
    if (query.isPending) return <CircularProgress aria-label="Loading customers" />;
    if (query.error) return <Alert severity="error">{query.error.message}<Button onClick={() => {void query.refetch();}}>Retry</Button></Alert>;
    return <Paper variant="outlined" sx={styles.panel}>
        <Box sx={styles.toolbar}><Typography component="h2" variant="h5">Customers</Typography>
            <Button variant="contained" onClick={() => {setSaved(false); setEditing(null);}}>Add customer</Button></Box>
        {saved && <Alert severity="success">customer saved successfully.</Alert>}
        <CustomerList rows={query.data} onEdit={row => {setSaved(false); setEditing(row);}} />
        {editing !== undefined && <CustomerForm record={editing || undefined} onCancel={() => setEditing(undefined)}
            onSaved={() => {setEditing(undefined); setSaved(true);}} />}
    </Paper>;
}
