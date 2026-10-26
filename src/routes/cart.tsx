import { useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Stack,
  Typography,
} from "@mui/material";
import { useAuth } from "../features/auth/auth";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { db } from "../services/db/database";
import { requireUser } from "../features/auth/auth";
import { createOnlineOrder } from "../features/orders/order.api";
import { refreshOrders } from "../features/orders/order.query";
import OrderIssues from "../features/orders/OrderIssues";
import { useCart } from "../features/cart/cart.hooks";
import { changeQuantity, removeCartItem } from "../features/cart/cart.api";
import { formatPrice, getCartImage } from "../features/cart/image";
export const Route = createFileRoute("/cart")({ component: CartPage });
function CartPage() {
  const { user, loading } = useAuth();
  if (loading) return <CircularProgress aria-label="Loading account" />;
  if (!user)
    return (
      <Stack spacing={2}>
        <Typography variant="h4">Your cart</Typography>
        <Alert severity="info">
          Log in or sign up to add products and view your cart.
        </Alert>
        <Button component={Link} to="/login">
          Log in / Sign up
        </Button>
      </Stack>
    );
  return <AuthenticatedCart key={user.id} />;
}
function AuthenticatedCart() {
  const { user, loading: authLoading } = useAuth();
  const { items, loading, error: storageError } = useCart();
  const [editing, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [success, setSuccess] = useState("");
  const client = useQueryClient();
  const attempt = useRef({ payload: "", id: "" });
  const mutation = useMutation({
    mutationFn: async () => {
      const userId = requireUser();
      // Read the current cart only after the customer confirms.
      const snapshot = await db.cartItems
        .where("userId")
        .equals(userId)
        .sortBy("itemId");
      const payload = snapshot.map((i) => ({
        item_id: i.itemId,
        quantity: i.quantity,
        sale_price: i.salePrice,
      }));
      const fingerprint = JSON.stringify({ userId, payload });
      if (attempt.current.payload !== fingerprint)
        attempt.current = { payload: fingerprint, id: crypto.randomUUID() };
      if (requireUser() !== userId)
        throw new Error("Your account changed. Please try again.");
      const id = await createOnlineOrder(payload, attempt.current.id);
      // Never clear newly edited lines or another account's cart.
      await db.transaction("rw", db.cartItems, async () => {
        for (const item of snapshot) {
          const key: [string, string] = [userId, item.itemId];
          const current = await db.cartItems.get(key);
          if (
            current &&
            current.quantity === item.quantity &&
            current.salePrice === item.salePrice
          )
            await db.cartItems.delete(key);
        }
      });
      return id;
    },
    onSuccess: async (id) => {
      attempt.current = { payload: "", id: "" };
      setSuccess(
        `Order ${id} received. Stock is reserved pending delivery and cash receipt.`,
      );
      await refreshOrders(client);
    },
  });
  const busy = editing || mutation.isPending;
  const lock = useRef(false);
  const [error, setError] = useState("");
  async function run(action: () => Promise<void>) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      await action();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  if (authLoading) return <CircularProgress aria-label="Loading account" />;
  if (!user)
    return (
      <Stack spacing={2}>
        <Typography variant="h4">Your cart</Typography>
        <Alert severity="info">
          Log in or sign up to add products and view your cart.
        </Alert>
        <Button component={Link} to="/login">
          Log in / Sign up
        </Button>
      </Stack>
    );
  return (
    <Stack spacing={3}>
      <Typography component="h1" variant="h4">
        Your cart
      </Typography>
      {error && <Alert severity="error">{error}</Alert>}
      {storageError && <Alert severity="error">{storageError}</Alert>}
      {success && <Alert severity="success">{success}</Alert>}
      <OrderIssues
        error={mutation.error}
        names={Object.fromEntries(items.map((i) => [i.itemId, i.itemName]))}
      />
      {mutation.error && (
        <Button
          disabled={busy}
          onClick={() =>
            void run(async () => {
              const userId = requireUser();
              const { getItemsAsync } = await import(
                "../features/items/item.api"
              );
              const latest = await getItemsAsync();
              await db.transaction("rw", db.cartItems, async () => {
                for (const item of items) {
                  const price = latest.find(
                    (i) => i.item_id === item.itemId,
                  )?.sale_price;
                  if (price !== undefined)
                    await db.cartItems.update([userId, item.itemId], {
                      salePrice: price,
                    });
                }
              });
            })
          }
        >
          Refresh cart prices
        </Button>
      )}
      {loading ? (
        <CircularProgress aria-label="Loading cart" />
      ) : items.length === 0 ? (
        <Box>
          <Typography>Your cart is empty.</Typography>
          <Button component={Link} to="/">
            Explore the collection
          </Button>
        </Box>
      ) : (
        <>
          {items.map((item) => (
            <Stack
              key={item.itemId}
              direction={{ xs: "column", sm: "row" }}
              spacing={3}
              sx={{ p: 3, border: "1px solid #e8ddd5", borderRadius: 3 }}
            >
              {item.imagePath && (
                <Box
                  component="img"
                  src={getCartImage(item.imagePath)}
                  alt={item.itemName}
                  sx={{
                    width: 110,
                    height: 110,
                    objectFit: "cover",
                    borderRadius: 2,
                  }}
                />
              )}
              <Stack spacing={1} sx={{ flex: 1 }}>
                <Typography variant="h6">{item.itemName}</Typography>
                <Typography>{formatPrice(item.salePrice)} each</Typography>
                <Stack
                  direction="row"
                  spacing={2}
                  sx={{ alignItems: "center" }}
                >
                  <Button
                    aria-label={`Decrease quantity of ${item.itemName}`}
                    disabled={busy || item.quantity <= 1}
                    onClick={() =>
                      void run(() => changeQuantity(item.itemId, -1))
                    }
                  >
                    −
                  </Button>
                  <Typography aria-live="polite">{item.quantity}</Typography>
                  <Button
                    aria-label={`Increase quantity of ${item.itemName}`}
                    disabled={busy || item.quantity >= 999}
                    onClick={() =>
                      void run(() => changeQuantity(item.itemId, 1))
                    }
                  >
                    +
                  </Button>
                  <Button
                    color="error"
                    disabled={busy}
                    onClick={() => void run(() => removeCartItem(item.itemId))}
                  >
                    Remove
                  </Button>
                </Stack>
              </Stack>
              <Typography>
                Subtotal: {formatPrice(item.salePrice * item.quantity)}
              </Typography>
            </Stack>
          ))}
          <Typography variant="h6">
            Estimated total:{" "}
            {formatPrice(
              items.reduce(
                (sum, item) => sum + item.salePrice * item.quantity,
                0,
              ),
            )}
          </Typography>
          <Typography>
            Prices and available quantities are checked when you confirm.
          </Typography>
          <Button
            variant="contained"
            disabled={busy || !!storageError}
            onClick={() => {
              setSuccess("");
              setConfirm(true);
            }}
          >
            Checkout
          </Button>
        </>
      )}
      <Dialog
        open={confirm}
        onClose={() => {
          if (!busy) setConfirm(false);
        }}
      >
        <DialogTitle>Confirm checkout</DialogTitle>
        <DialogContent>
          Would you like to place this order? Its prices and stock will be
          validated before it is accepted.
        </DialogContent>
        <DialogActions>
          <Button disabled={busy} onClick={() => setConfirm(false)}>
            No
          </Button>
          <Button
            disabled={busy}
            onClick={() => {
              setConfirm(false);
              mutation.mutate();
            }}
          >
            Yes
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
