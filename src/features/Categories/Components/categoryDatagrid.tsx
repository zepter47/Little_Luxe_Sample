import { useQuery } from "@tanstack/react-query";
import { Alert, Button, CircularProgress } from "@mui/material";
import { getCategoryNameQueryOption } from "../category.query";
import { categoryKeys } from "../category.types";
import { saveCategoryAsync } from "../category.api";
import AdminRecordManager from "../../admin/components/adminRecordManager";

export default function CategoryDatagrid() {
    const query = useQuery(getCategoryNameQueryOption());
    if (query.isPending) return <CircularProgress aria-label="Loading categories" />;
    if (query.error) return <Alert severity="error">{query.error.message}<Button onClick={() => query.refetch()}>Retry</Button></Alert>;
    return <AdminRecordManager title="Categories" singular="category" queryKey={categoryKeys.categoryNamesKey}
        rows={query.data.map(row => ({id: row.item_category_id, category_name: row.category_name, category_notes: row.category_notes || ""}))}
        fields={[{name: "category_name", label: "Category name", required: true}, {name: "category_notes", label: "Description", multiline: true}]}
        onSave={(values, id) => saveCategoryAsync({item_category_id: id, category_name: values.category_name, category_notes: values.category_notes})} />;
}

