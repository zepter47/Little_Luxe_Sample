import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Alert, Box, Button, CircularProgress, Typography } from "@mui/material";
import { useEffect, useState } from "react";
import { styles } from "../../features/auth/components/Auth.styles";

export const Route = createFileRoute("/auth/callback")({component: AuthCallback});

function AuthCallback() {
    const {auth} = Route.useRouteContext();
    const navigate = useNavigate();
    const [timedOut, setTimedOut] = useState(false);
    const params = new URLSearchParams(window.location.hash.slice(1));
    const search = new URLSearchParams(window.location.search);
    const failed = params.has("error") || search.has("error");
    useEffect(() => {
        if (auth.isAuthenticated) void navigate({to: "/", replace: true});
        const timer = setTimeout(() => setTimedOut(true), 15000);
        return () => clearTimeout(timer);
    }, [auth.isAuthenticated, navigate]);
    return <Box sx={styles.page}>
        {failed || timedOut ? <>
            <Alert severity="error">This sign-in link could not be verified. It may have expired or already been used.</Alert>
            <Button component={Link} to="/login" sx={{mt: 2}}>Request a new link</Button>
        </> : <Box sx={{textAlign: "center"}}><CircularProgress /><Typography sx={{mt: 2}}>Signing you in…</Typography></Box>}
    </Box>;
}
