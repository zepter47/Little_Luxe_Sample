import NavigationStrip from "../components/NavigationStrip";
import { canManageStore } from "../features/auth/auth.types";
import { Link, Outlet, createFileRoute, redirect } from "@tanstack/react-router";
import { Box, Button, Chip, Typography } from "@mui/material";
import { styles } from "../features/admin/components/Admin.styles";

export const Route = createFileRoute("/admin")({
    beforeLoad: ({context}) => {
        if (!context.auth.isAuthenticated) throw redirect({to: "/login"});
        if (!canManageStore(context.auth)) throw redirect({to: "/"});
    },
    component: Admin,
});

function Admin() {
    return <Box>
        <Chip label="LITTLE LUXE · ADMIN" size="small" sx={{mb: 2, bgcolor: "#f5eee9", color: "#79543f", letterSpacing: 1}} />
        <Typography component="h1" sx={styles.heading}>Your store, beautifully managed.</Typography>
        <Typography color="text.secondary" sx={{mt: 1}}>Curate your items, organize your categories, and keep suppliers close.</Typography>
        <NavigationStrip label="Admin menu">
            <Button component={Link} to="/admin" activeOptions={{exact: true}} sx={styles.menuLink}>Items</Button>
            <Button component={Link} to="/admin/categories" sx={styles.menuLink}>Categories</Button>
            <Button component={Link} to="/admin/units" sx={styles.menuLink}>Units of measure</Button>
            <Button component={Link} to="/admin/customers" sx={styles.menuLink}>Customers</Button>
            <Button component={Link} to="/admin/suppliers" sx={styles.menuLink}>Suppliers</Button>
        </NavigationStrip>
        <Outlet />
    </Box>;
}
