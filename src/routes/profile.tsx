import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Alert, Box, Button, Paper, Typography } from "@mui/material";
import { signOutMutationOption } from "../features/auth/auth.query";
import { anonymousAuth, authKeys } from "../features/auth/auth.types";
import { styles } from "../features/auth/components/Auth.styles";
import SignInDialog from "../features/auth/components/signInDialog";

export const Route = createFileRoute("/profile")({component: Profile});

function Profile() {
    const {auth} = Route.useRouteContext();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const signOut = useMutation({...signOutMutationOption(), onSuccess: async () => {
        await queryClient.cancelQueries({queryKey: authKeys.all});
        queryClient.setQueryData(authKeys.all, anonymousAuth);
        await navigate({to: "/", replace: true});
    }});
    if (!auth.isAuthenticated) return <SignInDialog open message="Sign in to view your profile and manage your account."
        onClose={() => {void navigate({to: "/"});}} />;
    return <Box sx={styles.page}><Paper variant="outlined" sx={styles.panel}>
        <Typography component="h1" variant="h4" sx={styles.heading}>Your profile</Typography>
        <Typography color="text.secondary">Email address</Typography>
        <Typography sx={{mt: 1, mb: 3, overflowWrap: "anywhere"}}>{auth.email}</Typography>
        {signOut.error && <Alert severity="error" sx={{mb: 2}}>{signOut.error.message}</Alert>}
        <Button variant="contained" sx={styles.button} disabled={signOut.isPending} onClick={() => signOut.mutate()}>
            {signOut.isPending ? "Logging out…" : "Log out"}
        </Button>
    </Paper></Box>;
}
