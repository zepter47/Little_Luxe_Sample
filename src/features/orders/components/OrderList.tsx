import { Box, Button, Chip, Paper, Stack, Typography } from "@mui/material";
import type { OrderRow } from "../order.types";
export default function OrderList({rows, onSelect}: {rows: OrderRow[]; onSelect: (id: string) => void}) {
  return <Stack spacing={2}>
      {rows.map((o) => (
        <Paper key={o.order_id} variant="outlined" sx={{ p: 2 }}>
          <Stack spacing={1}>
            <Typography sx={{ overflowWrap: "anywhere" }}>
              Order {o.order_id}
            </Typography>
            <Box>
              <Chip label={o.order_status} />
              <Chip label={o.order_origin} />
            </Box>
            <Typography>
              Created: {new Date(o.added_on!).toLocaleString()}
            </Typography>
            {o.order_status === "received" && (
              <Typography>
                Expires if unprocessed:{" "}
                {new Date(o.expected_expiry_date).toLocaleString()}
              </Typography>
            )}
            <Button onClick={() => onSelect(o.order_id)}>View order</Button>
          </Stack>
        </Paper>
      ))}
  </Stack>;
}
