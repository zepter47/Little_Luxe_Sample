import { Link, Outlet } from '@tanstack/react-router';
import { Box, Button, Chip, Typography } from '@mui/material';
import StockNavigation from './StockNavigation';
import { styles } from './Stock.styles';

export default function StockManagement() {
    return <Box sx={{minWidth: 0}}>
        <Chip label="LITTLE LUXE · STOCK MANAGEMENT" size="small" sx={{mb: 2, bgcolor: '#f5eee9', color: '#79543f', letterSpacing: 1}} />
        <Typography component="h1" sx={styles.heading}>Every movement, beautifully organized.</Typography>
        <Typography color="text.secondary" sx={{mt: 1}}>Follow orders, welcome new purchases, and manage returns in one place.</Typography>
        <StockNavigation label="Stock management menu">
            <Button component={Link} to="/stock-management" activeOptions={{exact: true}} sx={styles.menuLink}>Orders</Button>
            <Button component={Link} to="/stock-management/purchases" sx={styles.menuLink}>Purchases</Button>
            <Button component={Link} to="/stock-management/returns" sx={styles.menuLink}>Item returns</Button>
        </StockNavigation>
        <Outlet />
    </Box>;
}
