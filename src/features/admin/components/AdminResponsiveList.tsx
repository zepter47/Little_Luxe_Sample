import { useState, type ReactNode } from "react";
import { Box, Button, MenuItem, Stack, TablePagination, Typography, useMediaQuery } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { DataGrid, type GridColDef, type GridValidRowModel, type GridSortModel } from "@mui/x-data-grid";
import LabeledTextField from "../../../components/forms/LabeledTextField";
import { clampAdminPage, prepareAdminRows } from "./adminList.utils";

/** Own shared list state here; presentation children never fetch data. */
export default function AdminResponsiveList<T extends GridValidRowModel>({rows, columns, getRowId, renderCard,
    getSearchText, getSortValue, label}: {
    rows: T[]; columns: GridColDef<T>[]; getRowId: (row: T) => string;
    renderCard: (row: T) => ReactNode; label: string;
    getSearchText: (row: T) => string; getSortValue: (row: T, field: string) => string | number;
}) {
    const theme = useTheme();
    const compact = useMediaQuery(theme.breakpoints.down("md"));
    const [search, setSearch] = useState("");
    const [pagination, setPagination] = useState({page: 0, pageSize: 10});
    const [sort, setSort] = useState<GridSortModel>([]);
    const sorted = prepareAdminRows(rows, search, getSearchText, sort[0]?.field, sort[0]?.sort, getSortValue);
    const page = clampAdminPage(pagination.page, pagination.pageSize, sorted.length);
    const sortable = columns.filter(column => column.sortable !== false);
    const paginationModel = {...pagination, page};
    return <Box>
        <Stack direction={{xs: "column", sm: "row"}} spacing={2} sx={{mb: 2, alignItems: {sm: "flex-end"}}}>
            <LabeledTextField label={`Search ${label.toLowerCase()}`} value={search} fullWidth
                onChange={event => {setSearch(event.target.value); setPagination(previous => ({...previous, page: 0}));}} />
            {compact && <Stack direction="row" spacing={1} sx={{alignItems: "flex-end", width: {xs: "100%", sm: 300}, flexShrink: 0}}>
                <LabeledTextField label="Sort by" select value={sort[0]?.field || ""} fullWidth
                    onChange={event => setSort(event.target.value ? [{field: event.target.value, sort: sort[0]?.sort || "asc"}] : [])}>
                    <MenuItem value="">Default order</MenuItem>
                    {sortable.map(column => <MenuItem key={column.field} value={column.field}>{column.headerName || column.field}</MenuItem>)}
                </LabeledTextField>
                <Button disabled={!sort.length} aria-label="Reverse sort order" sx={{minHeight: 40, flexShrink: 0}}
                    onClick={() => setSort(previous => [{...previous[0], sort: previous[0]?.sort === "asc" ? "desc" : "asc"}])}>
                    {sort[0]?.sort === "desc" ? "↓" : "↑"}
                </Button>
            </Stack>}
        </Stack>
        {compact ? <Box aria-label={`${label} cards`}>
            {sorted.length ? <Stack component="ul" spacing={1.5} sx={{listStyle: "none", p: 0, m: 0}}>
                {sorted.slice(page * pagination.pageSize, (page + 1) * pagination.pageSize).map(row =>
                    <Box component="li" key={getRowId(row)} sx={{minWidth: 0}}>{renderCard(row)}</Box>)}
            </Stack> : <Typography role="status" color="text.secondary" sx={{py: 4, textAlign: "center"}}>
                {search.trim() ? "No matching records." : `No ${label.toLowerCase()} yet.`}
            </Typography>}
            <TablePagination component="div" count={sorted.length} page={page} rowsPerPage={pagination.pageSize}
                rowsPerPageOptions={[5, 10, 25]} labelRowsPerPage="Per page" sx={{"& .MuiTablePagination-toolbar": {px: 0, flexWrap: "wrap"}}}
                onPageChange={(_, next) => setPagination(previous => ({...previous, page: next}))}
                onRowsPerPageChange={event => setPagination({page: 0, pageSize: Number(event.target.value)})} />
        </Box> : <DataGrid aria-label={label} rows={sorted} columns={columns} getRowId={getRowId}
            disableRowSelectionOnClick disableColumnFilter sortingMode="server" sortModel={sort} onSortModelChange={setSort}
            paginationModel={paginationModel} onPaginationModelChange={setPagination} pageSizeOptions={[5, 10, 25]}
            sx={{height: 460, border: 0, "& .MuiDataGrid-columnHeaders": {bgcolor: "#faf6f2"}}} />}
    </Box>;
}
