import type { ReportLine, ReportPeriod, ReportSale } from './report.types';

export const reportDate = (date: Date) => new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Kampala', year: 'numeric', month: '2-digit', day: '2-digit',
}).format(date);
export const reportMoney = (value: number | null) => value === null ? 'Unavailable' :
    `UGX ${value.toLocaleString('en-UG', {maximumFractionDigits: 2})}`;
export function reportRange(date: string, period: ReportPeriod) {
    const start = new Date(`${date}T00:00:00+03:00`);
    if (period === 'weekly') start.setUTCDate(start.getUTCDate() - ((new Date(`${date}T12:00:00Z`).getUTCDay() + 6) % 7));
    if (period === 'monthly') { // Use Uganda's calendar day, independently of the browser timezone.
        start.setUTCDate(start.getUTCDate() - (Number(date.slice(8)) - 1));
    }
    const end = new Date(start);
    if (period === 'monthly') {
        const [year, month] = date.split('-').map(Number);
        end.setTime(Date.UTC(year, month, 1) - 3 * 3600000);
    } else end.setUTCDate(end.getUTCDate() + (period === 'weekly' ? 7 : 1));
    return {start: start.toISOString(), end: end.toISOString()};
}
export function lineAmounts(line: ReportLine) {
    const revenue = line.quantity_sold * line.sale_price;
    const allocations = line.stock_reservation.filter(row => row.reservation_status === 'fulfilled');
    const complete = allocations.reduce((sum, row) => sum + row.quantity_reserved, 0) === line.quantity_sold &&
        allocations.every(row => row.stock !== null && Number.isFinite(row.stock.cost_price));
    const cost = complete ? allocations.reduce((sum, row) => sum + row.quantity_reserved * row.stock!.cost_price, 0) : null;
    return {revenue, cost, profit: cost === null ? null : revenue - cost};
}
export function saleAmounts(sale: ReportSale) {
    const lines = sale.lines.map(lineAmounts);
    const revenue = lines.reduce((sum, row) => sum + row.revenue, 0);
    const cost = lines.length && lines.every(row => row.cost !== null) ? lines.reduce((sum, row) => sum + row.cost!, 0) : null;
    return {revenue, cost, profit: cost === null ? null : revenue - cost};
}
export function reportTotals(sales: ReportSale[]) {
    const amounts = sales.map(saleAmounts);
    const revenue = amounts.reduce((sum, row) => sum + row.revenue, 0);
    const missing = amounts.filter(row => row.cost === null).length;
    const cost = missing ? null : amounts.reduce((sum, row) => sum + row.cost!, 0);
    return {revenue, cost, profit: cost === null ? null : revenue - cost, missing};
}
