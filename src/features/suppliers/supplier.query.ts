import { queryOptions } from "@tanstack/react-query";
import { getSuppliersAsync, getSupplierCategoriesAsync } from "./supplier.api";
import { supplierKeys } from "./supplier.types";
export const getSuppliersQueryOption = () => queryOptions({queryKey: supplierKeys.all, queryFn: getSuppliersAsync});
export const getSupplierCategoriesQueryOption = () => queryOptions({queryKey: supplierKeys.categories, queryFn: getSupplierCategoriesAsync});

