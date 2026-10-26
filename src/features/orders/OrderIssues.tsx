import { Alert, Typography } from "@mui/material";
import { OrderValidationError } from "./order.api";
export default function OrderIssues({
  error,
  names = {},
}: {
  error: Error | null;
  names?: Record<string, string>;
}) {
  if (!error) return null;
  return (
    <Alert severity="error">
      {error.message}
      {error instanceof OrderValidationError &&
        error.issues.map((i, n) => (
          <Typography key={n}>
            {names[i.item_id] || i.item_id}:{" "}
            {i.code === "PRICE_CHANGED"
              ? `price changed from ${i.previous_price} to ${i.current_price}.`
              : i.code === "INSUFFICIENT_STOCK"
                ? `requested ${i.requested}, available ${i.available}.`
                : "item unavailable."}
          </Typography>
        ))}
    </Alert>
  );
}
