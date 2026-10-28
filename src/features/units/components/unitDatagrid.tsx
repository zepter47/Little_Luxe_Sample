import { useQuery } from "@tanstack/react-query";
import { Alert, Button, CircularProgress } from "@mui/material";
import UnitRecords from "./UnitRecords";
import { saveUnitAsync } from "../unit.api";
import { getUnitsQueryOption, unitKeys } from "../unit.query";

export default function UnitDatagrid() {
    const query = useQuery(getUnitsQueryOption());
    if (query.isPending) return <CircularProgress aria-label="Loading units of measure" />;
    if (query.error) return <Alert severity="error">{query.error.message}<Button onClick={() => {void query.refetch();}}>Retry</Button></Alert>;
    return <UnitRecords title="Units of measure" singular="unit of measure" queryKey={unitKeys.all}
        rows={query.data.map(unit => ({id: unit.uom_id, uom_name: unit.uom_name, uom_notes: unit.uom_notes || ""}))}
        fields={[{name: "uom_name", label: "Unit name", required: true}, {name: "uom_notes", label: "Description", multiline: true}]}
        onSave={(values, id) => saveUnitAsync({uom_id: id, uom_name: values.uom_name, uom_notes: values.uom_notes})} />;
}
