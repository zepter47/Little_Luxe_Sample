import { formatUGX } from "../../items/item.pricing";
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
      {line.item?.item_name || "Item unavailable"} × {line.quantity_sold} @ {formatUGX(line.sale_price)}
      {line.original_sale_price != null && (line.order_discount ?? 0) > 0 && <> (original {formatUGX(line.original_sale_price)}, {line.order_discount}% off)</>}
    </Typography>)}
    <Typography>Total: {formatUGX(details.reduce((sum, line) => sum + (line.quantity_sold || 0) * (line.sale_price || 0), 0))}</Typography>
  </>;
}
