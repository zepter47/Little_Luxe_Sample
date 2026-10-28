import { DataGrid, type GridColDef } from '@mui/x-data-grid';
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../../../services/db/database";

export default function ProductGrid() {
    const columns: GridColDef[] = [
        {field: "id", headerName: "ID", width: 70},
        {field: "name", headerName: "Product Name", width: 200},
        {field: "price", headerName: "Price", width: 120, type: "number"},
        {field: "description", headerName: "Description", width: 300},
    ];
    const products = useLiveQuery(() => db.productsStore.toArray(), [], []);
    return <DataGrid rows={products} columns={columns} />;
}
