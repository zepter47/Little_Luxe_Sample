import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Alert, Box, Button, Chip, LinearProgress, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import { salesReportQueryOptions } from './report.query';
import { reportDate, reportMoney, reportRange, reportTotals } from './report.model';
import type { ReportPeriod } from './report.types';
import SalesList from './components/SalesList';
import { reportStyles as styles } from './components/Report.styles';

export default function Reports({userId}: {userId: string}) {
    const [period, setPeriod] = useState<ReportPeriod>('daily');
    const [date, setDate] = useState(() => reportDate(new Date()));
    const range = reportRange(date, period);
    const query = useQuery(salesReportQueryOptions(userId, range.start, range.end));
    const sales = query.data ?? [];
    const total = reportTotals(sales);
    const days = [...new Set(sales.map(sale => reportDate(new Date(sale.delivered_on))))].sort();
    const rangeLabel = `${reportDate(new Date(range.start))} — ${reportDate(new Date(new Date(range.end).getTime() - 1))}`;
    return <Box sx={styles.page}>
        <Box sx={styles.hero}>
            <Chip label="SALES INSIGHTS" size="small" sx={{bgcolor: '#ffffff20', color: 'inherit', mb: 2, letterSpacing: 1.2}} />
            <Typography component="h1" variant="h3" sx={{fontSize: {xs: 30, md: 40}, fontWeight: 700, letterSpacing: '-.04em'}}>Sales reports</Typography>
            <Typography sx={{mt: 1, maxWidth: 600, color: '#e0eee6'}}>A clearer view of every sale. Track revenue, understand your costs, and see what your business earns.</Typography>
        </Box>
        <Paper sx={styles.panel}>
            <Box sx={styles.filters}>
                <ToggleButtonGroup exclusive value={period} onChange={(_, value: ReportPeriod | null) => value && setPeriod(value)} aria-label="Reporting period" size="small">
                    <ToggleButton value="daily">Daily</ToggleButton><ToggleButton value="weekly">Weekly</ToggleButton><ToggleButton value="monthly">Monthly</ToggleButton>
                </ToggleButtonGroup>
                <TextField type="date" label="Report date" size="small" value={date} slotProps={{inputLabel: {shrink: true}}} onChange={event => {
                    const value = event.target.value;
                    if (/^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(new Date(value).getTime())) setDate(value);
                }} />
                <Button onClick={() => {void query.refetch();}} disabled={query.isFetching} sx={{ml: {sm: 'auto'}}}>Refresh report</Button>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{mt: 2}}>{rangeLabel} · Africa/Kampala · Weeks run Monday–Sunday</Typography>
        </Paper>
        {query.isFetching && <LinearProgress aria-label="Loading sales report" />}
        {query.isError ? <Alert severity="error" action={<Button onClick={() => {void query.refetch();}}>Retry</Button>}>Unable to load a complete sales report. Please try again.</Alert> : query.isPending ? <Typography role="status">Preparing your sales report…</Typography> : <>
            <Box sx={styles.metrics}>{[['Sales revenue', reportMoney(total.revenue)], ['Cost of goods', reportMoney(total.cost)], ['Gross profit', reportMoney(total.profit)], ['Completed sales', String(sales.length)]].map(([label, value]) =>
                <Paper key={label} sx={{...styles.metric, ...(label === 'Gross profit' ? {bgcolor: '#edf5ef', borderColor: '#cee2d3'} : {})}}>
                    <Typography variant="body2" color="text.secondary">{label}</Typography><Typography sx={{fontSize: {xs: 24, md: 28}, fontWeight: 700, mt: 1, letterSpacing: '-.03em'}}>{value}</Typography>
                </Paper>)}</Box>
            <Typography variant="body2" color="text.secondary">Delivered sales only, grouped by delivery date. Selling prices include recorded discounts. Gross profit excludes expenses and returns. Costs use the fulfilled stock batches’ recorded cost prices.</Typography>
            {!!total.missing && <Alert severity="warning">Cost is unavailable for {total.missing} sale(s). Period cost and profit are unavailable until all stock allocations and costs can be read.</Alert>}
            {!sales.length ? <Paper sx={{...styles.panel, textAlign: 'center', py: 6}}><Typography variant="h6">No completed sales in this period</Typography><Typography color="text.secondary" sx={{mt: 1}}>Choose another date or reporting period to explore your sales.</Typography></Paper> : <>
                <Paper sx={styles.panel}>
                    <Typography component="h2" variant="h6" sx={{fontWeight: 700}}>Daily performance</Typography>
                    <TableContainer><Table size="small" aria-label="Daily sales totals" sx={{minWidth: 580}}><TableHead><TableRow>{['Date', 'Sales', 'Revenue', 'Cost', 'Gross profit'].map(label => <TableCell key={label}>{label}</TableCell>)}</TableRow></TableHead>
                        <TableBody>{days.map(day => {
                            const rows = sales.filter(sale => reportDate(new Date(sale.delivered_on)) === day);
                            const sum = reportTotals(rows);
                            return <TableRow key={day}><TableCell sx={{whiteSpace: 'nowrap'}}>{day}</TableCell><TableCell>{rows.length}</TableCell>{[sum.revenue, sum.cost, sum.profit].map((value, index) => <TableCell key={index} sx={{whiteSpace: 'nowrap'}}>{reportMoney(value)}</TableCell>)}</TableRow>;
                        })}</TableBody></Table></TableContainer>
                </Paper>
                <Stack direction="row" sx={{alignItems: "center", justifyContent: "space-between"}}><Typography component="h2" variant="h6" sx={{fontWeight: 700}}>Sales breakdown</Typography><Chip label={`${sales.length} sales`} size="small" /></Stack>
                <SalesList sales={sales} />
            </>}
        </>}
    </Box>;
}
