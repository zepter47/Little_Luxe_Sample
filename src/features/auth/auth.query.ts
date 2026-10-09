import { mutationOptions, queryOptions } from "@tanstack/react-query";
import { getAuthAsync, signInAsync, signOutAsync } from "./auth.api";
import { authKeys } from "./auth.types";

export const getAuthQueryOption = () => queryOptions({
    queryKey: authKeys.all, queryFn: getAuthAsync, staleTime: Infinity, retry: false,
});
export const signInMutationOption = () => mutationOptions({mutationFn: signInAsync});
export const signOutMutationOption = () => mutationOptions({mutationFn: signOutAsync});
