import { Alert, Typography } from "@mui/material";
import type { OrderDetail, OrderPerson, OrderRow } from "../order.types";
import { orderPersonLabel } from "../order.model";

export default function OrderSummary({order, details, staff, people = []}: {order?: OrderRow; details: OrderDetail[]; staff: boolean; people?: OrderPerson[]}) {
  return <>
    {!order && <Alert severity="info">This order has left the current list. Its history remains available.</Alert>}
    {order && <>
      <Typography>Customer: {orderPersonLabel(order.customer_id, people, "Customer details unavailable")}</Typography>
      <Typography>Status: {order.order_status} · Origin: {order.order_origin}</Typography>
      {staff && <Typography>Added by: {orderPersonLabel(order.added_by, people, order.added_by ? "Staff details unavailable" : "Not recorded")}</Typography>}
    </>}
    {details.map(line => <Typography key={line.order_details_id}>
      {line.item?.item_name || "Item unavailable"} × {line.quantity_sold} @ {line.sale_price}
    </Typography>)}
    <Typography>Total: {details.reduce((sum, line) => sum + (line.quantity_sold || 0) * (line.sale_price || 0), 0).toLocaleString()}</Typography>
  </>;
}
