import LabeledTextField from "../components/forms/LabeledTextField";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Alert, Box, Button, Paper, Stack, Typography } from "@mui/material";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signInMutationOption, verifySignInMutationOption } from "../features/auth/auth.query";
import { authKeys } from "../features/auth/auth.types";
import { loginSchema, loginCodeSchema } from "../features/auth/login.schema";
import type { LoginFormData, LoginCodeFormData } from "../features/auth/login.types";
import { styles } from "../features/auth/components/Auth.styles";

export const Route = createFileRoute("/login")({
    beforeLoad: ({context}) => {
        if (context.auth.isAuthenticated) throw redirect({to: "/profile"});
    },
    component: Login,
});

function Login() {
    const [sentEmail, setSentEmail] = useState<string | null>(null);
    const {auth} = Route.useRouteContext();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const signIn = useMutation(signInMutationOption());
    const verify = useMutation(verifySignInMutationOption());
    const emailForm = useForm<LoginFormData>({
        resolver: zodResolver(loginSchema), defaultValues: {email: ""},
    });
    const codeForm = useForm<LoginCodeFormData>({
        resolver: zodResolver(loginCodeSchema), defaultValues: {code: ""},
    });

    useEffect(() => {
        if (auth.isAuthenticated) void navigate({to: "/profile", replace: true});
    }, [auth.isAuthenticated, navigate]);

    async function sendCode({email}: LoginFormData) {
        try {
            await signIn.mutateAsync(email);
            codeForm.reset();
            verify.reset();
            setSentEmail(email);
        } catch {
            // The mutation error is displayed below the email field.
        }
    }

    async function verifyCode({code}: LoginCodeFormData) {
        if (!sentEmail) return;
        try {
            await verify.mutateAsync({email: sentEmail, code});
            await queryClient.invalidateQueries({queryKey: authKeys.all});
        } catch {
            // Keep the code step open so the user can correct or replace it.
        }
    }

    return <Box sx={styles.page}><Paper variant="outlined" sx={styles.panel}>
        <Typography component="h1" variant="h4" sx={styles.heading}>Welcome to Little Luxe</Typography>
        <Typography color="text.secondary" sx={{mb: 3}}>Sign in or create an account with your email. No password needed.</Typography>
        {sentEmail ? <Box component="form" noValidate onSubmit={codeForm.handleSubmit(verifyCode)}>
            <Stack spacing={2}>
                <Alert severity="success">Check your email for a six-digit sign-in code.</Alert>
                <Typography color="text.secondary">The code was sent to {sentEmail}.</Typography>
                <Controller name="code" control={codeForm.control} render={({field: {ref, ...field}, fieldState}) => (
                    <LabeledTextField {...field} inputRef={ref} label="Sign-in code" type="text"
                        autoComplete="one-time-code" autoFocus required fullWidth
                        slotProps={{htmlInput: {inputMode: "numeric", maxLength: 6}}}
                        error={!!fieldState.error} helperText={fieldState.error?.message ?? "Enter the six digits from your email."}
                        disabled={codeForm.formState.isSubmitting || verify.isSuccess} />
                )} />
                {verify.error && <Alert severity="error">{"code" in verify.error && verify.error.code === "otp_expired"
                    ? "This code is invalid or has expired. Try again or request a new code."
                    : verify.error.message}</Alert>}
                {verify.isSuccess && <Alert severity="info">Signing you in…</Alert>}
                <Button type="submit" variant="contained" sx={styles.button}
                    disabled={codeForm.formState.isSubmitting || verify.isSuccess}>
                    {codeForm.formState.isSubmitting || verify.isSuccess ? "Signing in…" : "Verify code and sign in"}
                </Button>
                <Button disabled={codeForm.formState.isSubmitting || verify.isSuccess} onClick={() => {
                    setSentEmail(null);
                    codeForm.reset();
                    signIn.reset();
                    verify.reset();
                }}>Change email or request a new code</Button>
            </Stack>
        </Box> : <Box component="form" noValidate onSubmit={emailForm.handleSubmit(sendCode)}>
            <Stack spacing={2}>
                <Controller name="email" control={emailForm.control} render={({field: {ref, ...field}, fieldState}) => (
                    <LabeledTextField {...field} inputRef={ref} label="Email address" type="email"
                        autoComplete="email" required fullWidth error={!!fieldState.error}
                        helperText={fieldState.error?.message} disabled={emailForm.formState.isSubmitting} />
                )} />
                {signIn.error && <Alert severity="error">{signIn.error.message}</Alert>}
                <Button type="submit" variant="contained" disabled={emailForm.formState.isSubmitting} sx={styles.button}>
                    {emailForm.formState.isSubmitting ? "Sending code…" : "Send sign-in code"}
                </Button>
            </Stack>
        </Box>}
    </Paper></Box>;
}
