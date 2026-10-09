import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../../lib/supabase";
import { getAuthQueryOption } from "./auth.query";
import { authKeys } from "./auth.types";

// Mount once in main.tsx; routes consume the resulting router context.
export function useAuth() {
    const queryClient = useQueryClient();
    const auth = useQuery(getAuthQueryOption());
    useEffect(() => {
        const timers = new Set<ReturnType<typeof setTimeout>>();
        const {data: {subscription}} = supabase.auth.onAuthStateChange((event) => {
            // Defer client calls until Supabase releases its auth lock.
            const timer = setTimeout(() => {
                timers.delete(timer);
                if (event === "SIGNED_OUT" || event === "SIGNED_IN") {
                    queryClient.removeQueries({predicate: query => query.queryKey[0] !== authKeys.all[0]});
                }
                void queryClient.invalidateQueries({queryKey: authKeys.all});
            }, 0);
            timers.add(timer);
        });
        return () => {
            subscription.unsubscribe();
            timers.forEach(clearTimeout);
        };
    }, [queryClient]);
    return auth;
}
