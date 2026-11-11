import { Accordion, AccordionDetails, AccordionSummary, Box, Chip, Divider, Stack, Typography } from '@mui/material';
import { lineAmounts, reportMoney, saleAmounts } from '../report.model';
import type { ReportSale } from '../report.types';
import { reportStyles as styles } from './Report.styles';

export default function SalesList({sales}: {sales: ReportSale[]}) {
    return <Stack sx={{gap: 1.5}}>{sales.map(sale => {
        const total = saleAmounts(sale);
        return <Accordion key={sale.order_id} disableGutters sx={{...styles.panel, p: 0, '&:before': {display: 'none'}}}>
            <AccordionSummary expandIcon={<span aria-hidden="true">⌄</span>}>
                <Box sx={{width: '100%', minWidth: 0, pr: 2}}>
                    <Stack direction="row" sx={{flexWrap: "wrap", gap: 1, alignItems: "center"}}>
                        <Typography sx={{fontWeight: 700}}>Sale {sale.order_id.slice(0, 8).toUpperCase()}</Typography>
                        <Chip size="small" label={sale.order_origin === 'staff' ? 'In store' : 'Online'} />
                    </Stack>
                    <Typography variant="caption" color="text.secondary">{new Date(sale.delivered_on).toLocaleString('en-UG', {timeZone: 'Africa/Kampala'})}</Typography>
                    <Box sx={{...styles.amounts, mt: 2}}>{[['Selling total', total.revenue], ['Cost total', total.cost], ['Gross profit', total.profit]].map(([label, value]) =>
                        <Box key={String(label)}><Typography variant="caption" color="text.secondary">{label}</Typography><Typography sx={{fontWeight: 700}}>{reportMoney(value as number | null)}</Typography></Box>)}</Box>
                </Box>
            </AccordionSummary>
            <AccordionDetails><Typography variant="body2" color="text.secondary" sx={{mb: 2}}>Item breakdown · cost per unit is weighted across fulfilled stock batches.</Typography>
                <Stack divider={<Divider />} sx={{gap: 2}}>{sale.lines.map(line => {
                    const amounts = lineAmounts(line);
                    return <Box key={line.order_details_id} sx={{py: 1}}>
                        <Typography sx={{fontWeight: 600}}>{line.item?.item_name || 'Item unavailable'} <Typography component="span" color="text.secondary">× {line.quantity_sold}</Typography></Typography>
                        <Box sx={{...styles.amounts, mt: 1}}>
                            <Typography variant="body2">Cost / unit<br /><b>{reportMoney(amounts.cost === null ? null : amounts.cost / line.quantity_sold)}</b></Typography>
                            <Typography variant="body2">Selling / unit<br /><b>{reportMoney(line.sale_price)}</b></Typography>
                            <Typography variant="body2">Line profit<br /><b>{reportMoney(amounts.profit)}</b></Typography>
                        </Box>
                    </Box>;
                })}</Stack>
                <Typography variant="caption" color="text.secondary">Full sale reference: {sale.order_id}</Typography>
            </AccordionDetails>
        </Accordion>;
    })}</Stack>;
}
