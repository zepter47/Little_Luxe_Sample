import { mutationOptions, queryOptions, type QueryClient } from "@tanstack/react-query";
import { getSuppliersAsync, saveSupplierAsync } from "./supplier.api";
import { supplierKeys, type SupplierFormData } from "./supplier.types";

export const getSuppliersQueryOption = () => queryOptions({queryKey: supplierKeys.all, queryFn: getSuppliersAsync});
export const saveSupplierMutationOption = (client: QueryClient) => mutationOptions({
    mutationFn: ({id, values}: {id?: string; values: SupplierFormData}) => saveSupplierAsync({
        supplier_id: id || crypto.randomUUID(), supplier_name: values.supplier_name, supplier_cat_id: values.supplier_cat_id,
        supplier_email: values.supplier_email || null, supplier_contact: values.supplier_contact || null,
        supplier_address: values.supplier_address || null, supplier_notes: values.supplier_notes || null,
    }, !!id),
    onSuccess: () => client.invalidateQueries({queryKey: supplierKeys.all}),
});
