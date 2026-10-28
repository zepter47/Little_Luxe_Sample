import { createFileRoute, redirect } from "@tanstack/react-router";

// Old email links now lead to the email/code sign-in flow.
export const Route = createFileRoute("/auth/callback")({
    beforeLoad: () => { throw redirect({to: "/login", replace: true}); },
});
