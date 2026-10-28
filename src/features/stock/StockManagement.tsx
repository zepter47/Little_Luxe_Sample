import { useState } from 'react';
import { Box, Button, Chip, Typography } from '@mui/material';
import OrderDashboard from '../orders/OrderDashboard';
import Purchases from '../purchases/Purchases';
import Returns from '../returns/Returns';
import StockNavigation from './StockNavigation';
import { styles } from './Stock.styles';

type Section = 'orders' | 'purchases' | 'returns';

// Navigation only. Each child feature owns its data, forms, and presentation.
export default function StockManagement() {
    const [section, setSection] = useState<Section>('orders');
    return <Box sx={{minWidth: 0}}>
        <Chip label="LITTLE LUXE · STOCK MANAGEMENT" size="small" sx={{mb: 2, bgcolor: '#f5eee9', color: '#79543f', letterSpacing: 1}} />
        <Typography component="h1" sx={styles.heading}>Every movement, beautifully organized.</Typography>
        <Typography color="text.secondary" sx={{mt: 1}}>Follow orders, welcome new purchases, and manage returns in one place.</Typography>
        <StockNavigation label="Stock management menu">
            {(['orders', 'purchases', 'returns'] as const).map(key => <Button key={key}
                aria-pressed={section === key} data-status={section === key ? 'active' : undefined}
                sx={styles.menuLink} onClick={() => setSection(key)}>
                {{orders: 'Orders', purchases: 'Purchases', returns: 'Item returns'}[key]}
            </Button>)}
        </StockNavigation>
        {section === 'orders' && <OrderDashboard staff deliveredOnly />}
        {section === 'purchases' && <Purchases />}
        {section === 'returns' && <Returns />}
    </Box>;
}
