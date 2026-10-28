import { Alert, Typography } from "@mui/material";
import type { OrderDetail, OrderRow } from "../order.types";

export default function OrderSummary({order, details, staff}: {order?: OrderRow; details: OrderDetail[]; staff: boolean}) {
  return <>
    {!order && <Alert severity="info">This order has left the current list. Its history remains available.</Alert>}
    {order && <>
      <Typography>Customer: {order.customer_id}</Typography>
      <Typography>Status: {order.order_status} · Origin: {order.order_origin}</Typography>
      {staff && <Typography>Added by: {order.added_by}</Typography>}
    </>}
    {details.map(line => <Typography key={line.order_details_id}>
      {line.item?.item_name || line.item_id} × {line.quantity_sold} @ {line.sale_price}
    </Typography>)}
    <Typography>Total: {details.reduce((sum, line) => sum + (line.quantity_sold || 0) * (line.sale_price || 0), 0).toLocaleString()}</Typography>
  </>;
}
