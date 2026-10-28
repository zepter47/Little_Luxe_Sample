import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../../lib/supabase";
import { getAuthQueryOption } from "./auth.query";
import { authKeys, type AuthState } from "./auth.types";

// Mount once in main.tsx; routes consume the resulting router context.
export function useAuth() {
    const queryClient = useQueryClient();
    const auth = useQuery(getAuthQueryOption());
    useEffect(() => {
        const timers = new Set<ReturnType<typeof setTimeout>>();
        let previousUserId = queryClient.getQueryData<AuthState>(authKeys.all)?.userId;
        const {data: {subscription}} = supabase.auth.onAuthStateChange((event, session) => {
            // Defer client calls until Supabase releases its auth lock.
            const timer = setTimeout(() => {
                timers.delete(timer);
                const userId = session?.user && !session.user.is_anonymous ? session.user.id : null;
                const accountChanged = event === "SIGNED_OUT" || (previousUserId !== undefined && previousUserId !== userId);
                previousUserId = userId;
                if (accountChanged) {
                    queryClient.removeQueries({predicate: query => query.queryKey[0] !== authKeys.all[0]});
                    // Hide protected routes until the new account's claims have been checked.
                    void queryClient.resetQueries({queryKey: authKeys.all, exact: true});
                } else {
                    // SIGNED_IN also fires when the same user returns from a file picker.
                    // Recheck claims without destroying active queries or unsaved forms.
                    void queryClient.invalidateQueries({queryKey: authKeys.all});
                }
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

