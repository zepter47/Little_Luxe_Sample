import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Alert, Box, Button, CircularProgress, Paper, Typography } from "@mui/material";
import { getUnitsQueryOption } from "./unit.query";
import type { Unit } from "./unit.types";
import UnitList from "./components/UnitList";
import UnitForm from "./components/UnitForm";
import { styles } from "./components/Unit.styles";

export default function Units() {
    const query = useQuery(getUnitsQueryOption());
    const [editing, setEditing] = useState<Unit | null | undefined>();
    const [saved, setSaved] = useState(false);
    if (query.isPending) return <CircularProgress aria-label="Loading units of measure" />;
    if (query.error) return <Alert severity="error">{query.error.message}<Button onClick={() => {void query.refetch();}}>Retry</Button></Alert>;
    return <Paper variant="outlined" sx={styles.panel}>
        <Box sx={styles.toolbar}><Typography component="h2" variant="h5">Units of measure</Typography>
            <Button variant="contained" onClick={() => {setSaved(false); setEditing(null);}}>Add unit of measure</Button></Box>
        {saved && <Alert severity="success">unit of measure saved successfully.</Alert>}
        <UnitList rows={query.data} onEdit={row => {setSaved(false); setEditing(row);}} />
        {editing !== undefined && <UnitForm record={editing || undefined} onCancel={() => setEditing(undefined)}
            onSaved={() => {setEditing(undefined); setSaved(true);}} />}
    </Paper>;
}
