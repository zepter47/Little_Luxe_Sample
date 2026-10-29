import { supabase } from "../../lib/supabase";
import { anonymousAuth, type AuthState } from "./auth.types";
import { loginSchema, verifyLoginSchema } from "./login.schema";
import type { VerifyLoginData } from "./login.types";

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
    const values = loginSchema.parse({email});
    const {error} = await supabase.auth.signInWithOtp({
        email: values.email,
    });
    if (error) throw error;
}

export async function verifySignInAsync(input: VerifyLoginData) {
    const {email, code} = verifyLoginSchema.parse(input);
    const {data, error} = await supabase.auth.verifyOtp({email, token: code, type: "email"});
    if (error) throw error;
    if (!data.session) throw new Error("Unable to sign in. Please request a new code.");
}

export async function signOutAsync() {
    const {error} = await supabase.auth.signOut();
    if (error) throw error;
}

