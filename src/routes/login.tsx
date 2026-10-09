import { createFileRoute, redirect } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { Alert, Box, Button, Paper, Stack, TextField, Typography } from "@mui/material";
import { useState } from "react";
import { signInMutationOption } from "../features/auth/auth.query";
import { styles } from "../features/auth/components/Auth.styles";

export const Route = createFileRoute("/login")({
    beforeLoad: ({context}) => {
        if (context.auth.isAuthenticated) throw redirect({to: "/profile"});
    },
    component: Login,
});

function Login() {
    const [email, setEmail] = useState("");
    const signIn = useMutation(signInMutationOption());
    return <Box sx={styles.page}><Paper variant="outlined" sx={styles.panel}>
        <Typography component="h1" variant="h4" sx={styles.heading}>Welcome to Little Luxe</Typography>
        <Typography color="text.secondary" sx={{mb: 3}}>Sign in or create an account with your email. No password needed.</Typography>
        {signIn.isSuccess ? <Stack spacing={2}>
            <Alert severity="success">Check your email for a sign-in link.</Alert>
            <Typography color="text.secondary">The link was sent to {signIn.variables}.</Typography>
            <Button onClick={() => signIn.reset()}>Use another email or send again</Button>
        </Stack> : <Box component="form" onSubmit={event => {event.preventDefault(); signIn.mutate(email);}}>
            <Stack spacing={2}>
                <TextField label="Email address" type="email" autoComplete="email" required fullWidth
                    value={email} onChange={event => setEmail(event.target.value)} disabled={signIn.isPending} />
                {signIn.error && <Alert severity="error">{signIn.error.message}</Alert>}
                <Button type="submit" variant="contained" disabled={signIn.isPending} sx={styles.button}>
                    {signIn.isPending ? "Sending link…" : "Send sign-in link"}
                </Button>
            </Stack>
        </Box>}
    </Paper></Box>;
}
