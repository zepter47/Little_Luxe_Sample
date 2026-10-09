import { useEffect } from "react";
import { RouterProvider } from "@tanstack/react-router";
import { Alert, Box, Button, CircularProgress } from "@mui/material";
import { useAuth } from "../useAuth";
import { router } from "../../../router";

export default function AppRouter() {
  const auth = useAuth();
  useEffect(() => {
    if (auth.data) void router.invalidate();
  }, [auth.data]);
  if (auth.isPending) return <Box sx={{display: "grid", placeItems: "center", minHeight: "100dvh"}}><CircularProgress aria-label="Checking sign-in" /></Box>;
  if (auth.error) return <Alert severity="error">Unable to check your sign-in. <Button onClick={() => {void auth.refetch();}}>Retry</Button></Alert>;
  return <RouterProvider router={router} context={{auth: auth.data}} />;
}

