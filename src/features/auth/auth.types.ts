export type AppRole = "customer" | "staff" | "admin";

export interface AuthState {
    isAuthenticated: boolean;
    userId: string | null;
    email: string | null;
    appRole: AppRole | null;
}

export const authKeys = {all: ["auth"] as const};
export const anonymousAuth: AuthState = {
    isAuthenticated: false, userId: null, email: null, appRole: null,
};

export function canManageStore(auth: AuthState) {
    return auth.isAuthenticated && (auth.appRole === "staff" || auth.appRole === "admin");
}
