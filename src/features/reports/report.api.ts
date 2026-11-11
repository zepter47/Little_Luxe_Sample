import { supabase } from '../../lib/supabase';
import type { ReportSale } from './report.types';

// Page the delivery events, then load each sale separately so nested line limits
// cannot silently truncate a period's totals. Existing RLS applies to every read.
export async function getSalesReport(start: string, end: string): Promise<ReportSale[]> {
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
    const sales: ReportSale[] = [];
    for (const event of events) {
        if (sales.some(sale => sale.order_id === event.order_id)) continue;
        const {data: order, error} = await supabase.from('order').select('order_id,order_origin')
            .eq('order_id', event.order_id).eq('order_status', 'delivered').single();
        if (error) throw error;
        const lines: ReportSale['lines'] = [];
        for (let offset = 0; ; offset += 500) {
            const {data, error: lineError} = await supabase.from('order_details')
                .select('order_details_id,quantity_sold,sale_price,item(item_name),stock_reservation(quantity_reserved,reservation_status,stock(cost_price))')
                .eq('order_id', order.order_id).order('order_details_id').range(offset, offset + 499);
            if (lineError) throw lineError;
            lines.push(...data);
            if (data.length < 500) break;
        }
        sales.push({...order, delivered_on: event.changed_on, lines});
    }
    return sales.sort((a, b) => b.delivered_on.localeCompare(a.delivered_on));
}
