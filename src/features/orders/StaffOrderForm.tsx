import { useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { getCustomers } from "../customers/customer.api";
import { getStockOptions } from "../stock/stock.api";
import { createStaffOrder, type OrderItem } from "./order.api";
import OrderIssues from "./OrderIssues";
import { refreshOrders } from "./order.query";
export default function StaffOrderForm({ onClose }: { onClose: () => void }) {
  const customers = useQuery({
    queryKey: ["customers"],
    queryFn: getCustomers,
  });
  const options = useQuery({
    queryKey: ["stock-options"],
    queryFn: getStockOptions,
  });
  const [customer, setCustomer] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<OrderItem[]>([
    { item_id: "", quantity: 1, sale_price: 0 },
  ]);
  const [confirm, setConfirm] = useState(false);
  const [localError, setLocalError] = useState("");
  const request = useRef({ payload: "", id: "" });
  const client = useQueryClient();
  const mutation = useMutation({
    mutationFn: async () => {
      const payload = JSON.stringify({ customer, lines, notes });
      if (request.current.payload !== payload)
        request.current = { payload, id: crypto.randomUUID() };
      return createStaffOrder(customer, lines, request.current.id, notes);
    },
    onSuccess: async () => {
      await refreshOrders(client);
      onClose();
    },
  });
  const names = Object.fromEntries(
    (options.data?.items || []).map((i) => [i.item_id, i.item_name]),
  );
  const patch = (index: number, values: Partial<OrderItem>) =>
    setLines((old) =>
      old.map((l, n) => (n === index ? { ...l, ...values } : l)),
    );
  return (
    <Dialog
      open
      fullWidth
      maxWidth="md"
      onClose={() => {
        if (!mutation.isPending) onClose();
      }}
    >
      <DialogTitle>New staff order</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <Typography>
            Select an existing customer. Register new customers in Admin →
            Customers before creating an order.
          </Typography>
          {(customers.error || options.error) && (
            <Alert severity="error">
              {(customers.error || options.error)?.message}
              <Button
                onClick={() => {
                  void customers.refetch();
                  void options.refetch();
                }}
              >
                Retry
              </Button>
            </Alert>
          )}
          <TextField
            select
            label="Customer"
            required
            value={customer}
            disabled={mutation.isPending || customers.isPending}
            onChange={(e) => setCustomer(e.target.value)}
          >
            {(customers.data || [])
              .filter((c) => c.is_active)
              .map((c) => (
                <MenuItem key={c.customer_id} value={c.customer_id}>
                  {c.first_name} {c.last_name} ·{" "}
                  {c.phone_number || c.email || c.customer_id}
                </MenuItem>
              ))}
          </TextField>
          {customers.isSuccess && !customers.data.some((c) => c.is_active) && (
            <Alert severity="info">
              Add an active customer in the Customers tab first.
            </Alert>
          )}
          {lines.map((line, n) => (
            <Stack key={n} direction={{ xs: "column", sm: "row" }} spacing={1}>
              <TextField
                select
                label="Item"
                value={line.item_id}
                fullWidth
                disabled={mutation.isPending}
                onChange={(e) => {
                  const item = options.data?.items.find(
                    (i) => i.item_id === e.target.value,
                  );
                  patch(n, {
                    item_id: e.target.value,
                    sale_price: item?.sale_price || 0,
                  });
                }}
              >
                {options.data?.items.map((i) => (
                  <MenuItem key={i.item_id} value={i.item_id}>
                    {i.item_name}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                label="Quantity"
                type="number"
                value={line.quantity}
                disabled={mutation.isPending}
                slotProps={{ htmlInput: { min: 1, max: 999, step: 1 } }}
                onChange={(e) => patch(n, { quantity: Number(e.target.value) })}
              />
              <TextField
                label="Sale price"
                value={line.sale_price}
                slotProps={{ input: { readOnly: true } }}
              />
              <Button
                disabled={mutation.isPending || lines.length === 1}
                onClick={() => setLines((old) => old.filter((_, i) => i !== n))}
              >
                Remove
              </Button>
            </Stack>
          ))}
          <Button
            disabled={mutation.isPending || lines.length >= 100}
            onClick={() =>
              setLines((old) => [
                ...old,
                { item_id: "", quantity: 1, sale_price: 0 },
              ])
            }
          >
            Add item
          </Button>
          <TextField
            label="Order notes"
            multiline
            value={notes}
            disabled={mutation.isPending}
            onChange={(e) => setNotes(e.target.value)}
          />
          {localError && <Alert severity="error">{localError}</Alert>}
          <OrderIssues error={mutation.error} names={names} />
          {mutation.error && (
            <Button
              onClick={() =>
                void options.refetch().then((result) => {
                  if (result.data)
                    setLines((old) =>
                      old.map((l) => ({
                        ...l,
                        sale_price:
                          result.data.items.find((i) => i.item_id === l.item_id)
                            ?.sale_price ?? l.sale_price,
                      })),
                    );
                })
              }
            >
              Refresh current prices
            </Button>
          )}
          <Typography>
            The order starts as received. Confirm delivery and cash receipt
            separately after creating it.
          </Typography>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button disabled={mutation.isPending} onClick={onClose}>
          Cancel
        </Button>
        <Button
          disabled={mutation.isPending || !customer || !options.data}
          onClick={() => {
            setLocalError("");
            if (
              lines.some(
                (l) =>
                  !l.item_id ||
                  !Number.isInteger(l.quantity) ||
                  l.quantity < 1 ||
                  l.quantity > 999,
              ) ||
              new Set(lines.map((l) => l.item_id)).size !== lines.length
            ) {
              setLocalError(
                "Select distinct items and quantities between 1 and 999.",
              );
              return;
            }
            setConfirm(true);
          }}
        >
          Create order
        </Button>
      </DialogActions>
      <Dialog
        open={confirm}
        onClose={() => {
          if (!mutation.isPending) setConfirm(false);
        }}
      >
        <DialogTitle>Confirm staff order</DialogTitle>
        <DialogContent>
          Would you like to create this order and reserve its items?
        </DialogContent>
        <DialogActions>
          <Button
            disabled={mutation.isPending}
            onClick={() => setConfirm(false)}
          >
            No
          </Button>
          <Button
            disabled={mutation.isPending}
            onClick={() => {
              setConfirm(false);
              mutation.mutate();
            }}
          >
            Yes
          </Button>
        </DialogActions>
      </Dialog>
    </Dialog>
  );
}
