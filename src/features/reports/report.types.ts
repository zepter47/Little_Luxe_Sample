export type ReportPeriod = 'daily' | 'weekly' | 'monthly';
export interface ReportLine {
    order_details_id: string;
    quantity_sold: number;
    sale_price: number;
    item: {item_name: string} | null;
    stock_reservation: {quantity_reserved: number; reservation_status: string; stock: {cost_price: number} | null}[];
}
export interface ReportSale {
    order_id: string;
    delivered_on: string;
    order_origin: string;
    lines: ReportLine[];
}
