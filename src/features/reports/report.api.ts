import { supabase } from '../../lib/supabase';
import { reportRange } from './report.model';
import type { ReportSale } from './report.types';

// Page the delivery events, then load each sale separately so nested line limits
// cannot silently truncate a period's totals. Existing RLS applies to every read.
async function readDeliveryEvents(start: string, end: string) {
    const events: {order_id: string; changed_on: string}[] = [];
    for (let offset = 0; ; offset += 500) {
        const {data, error} = await supabase.from('order_status_history')
            .select('order_id,changed_on').eq('new_status', 'delivered')
            .gte('changed_on', start).lt('changed_on', end)
            .order('history_id').range(offset, offset + 499);
        if (error) throw error;
        events.push(...data);
        if (data.length < 500) break;
    }
    return events;
}

async function readDeliveredOrder(orderId: string) {
    const {data, error} = await supabase.from('order').select('order_id,order_origin')
        .eq('order_id', orderId).eq('order_status', 'delivered').single();
    if (error) throw error;
    return data;
}

async function readSaleLines(orderId: string): Promise<ReportSale['lines']> {
    const lines: ReportSale['lines'] = [];
    for (let offset = 0; ; offset += 500) {
        const {data, error} = await supabase.from('order_details')
            .select('order_details_id,quantity_sold,sale_price,item(item_name),stock_reservation(quantity_reserved,reservation_status,unit_cost_price,stock(cost_price))')
            .eq('order_id', orderId).order('order_details_id').range(offset, offset + 499);
        if (error) throw error;
        lines.push(...data);
        if (data.length < 500) return lines;
    }
}

async function readDeliveredSales(start: string, end: string): Promise<ReportSale[]> {
    const events = await readDeliveryEvents(start, end);
    const sales: ReportSale[] = [];
    for (const event of events) {
        if (sales.some(sale => sale.order_id === event.order_id)) continue;
        const order = await readDeliveredOrder(event.order_id);
        const lines = await readSaleLines(order.order_id);
        sales.push({...order, delivered_on: event.changed_on, lines});
    }
    return sales.sort((a, b) => b.delivered_on.localeCompare(a.delivered_on));
}

export async function getDailySalesReport(date: string): Promise<ReportSale[]> {
    const {start, end} = reportRange(date, 'daily');
    return readDeliveredSales(start, end);
}

export async function getWeeklySalesReport(date: string): Promise<ReportSale[]> {
    const {start, end} = reportRange(date, 'weekly');
    return readDeliveredSales(start, end);
}

export async function getMonthlySalesReport(date: string): Promise<ReportSale[]> {
    const {start, end} = reportRange(date, 'monthly');
    return readDeliveredSales(start, end);
}
