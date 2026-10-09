import { supabase } from "../../lib/supabase";
import { anonymousAuth, type AuthState } from "./auth.types";

export async function getAuthAsync(): Promise<AuthState> {
    const {data, error} = await supabase.auth.getClaims();
    if (error) throw error;
    if (!data?.claims) return anonymousAuth;
    const claims = data.claims;
    const role = claims.user_role;
    return {
        isAuthenticated: true,
        userId: claims.sub,
        email: typeof claims.email === "string" ? claims.email : null,
        appRole: role === "customer" || role === "staff" || role === "admin" ? role : null,
    };
}

export async function signInAsync(email: string) {
    const {error} = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {emailRedirectTo: new URL(`${import.meta.env.BASE_URL}auth/callback`, window.location.origin).href},
    });
    if (error) throw error;
}

export async function signOutAsync() {
    const {error} = await supabase.auth.signOut();
    if (error) throw error;
}
