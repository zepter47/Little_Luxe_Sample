import { useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { createFileRoute, Link } from '@tanstack/react-router';
import { Alert, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Typography } from '@mui/material';
import { useAuth } from '../features/auth/auth';
import { useCart } from '../features/cart/cart.hooks';
import { changeQuantity, clearPurchasedItems, removeCartItem } from '../features/cart/cart.api';
import { checkout, CheckoutRejected } from '../features/cart/checkout.api';
import { formatPrice, getCartImage } from '../features/cart/image';
import type { CartItem, CheckoutResult } from '../features/cart/cart.types';
import { db } from '../services/db/database';
export const Route = createFileRoute('/cart')({ component: CartPage });
function CartPage() {
  const { user, loading } = useAuth();
  if (loading) return <CircularProgress aria-label="Loading account" />;
  if (!user) return <Stack spacing={2}><Typography variant="h4">Your cart</Typography><Alert severity="info">Log in or sign up to add products and view your cart.</Alert><Button component={Link} to="/login">Log in / Sign up</Button></Stack>;
  return <AuthenticatedCart key={user.id} />;
}
function AuthenticatedCart() {
  const { user, loading: authLoading } = useAuth();
  const { items, loading, error: storageError } = useCart();
  const pending = useLiveQuery(() => user ? db.checkoutAttempts.get(user.id).catch(() => undefined) : undefined, [user?.id]);
  const hasPending = !!user && pending?.userId === user.id;
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [review, setReview] = useState<{ userId: string; items: CartItem[]; quote: CheckoutResult; requestId: string } | null>(null);
  async function run(action: () => Promise<void>) {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError('');
    try { await action(); } catch (err) { setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.'); }
    finally { lock.current = false; setBusy(false); }
  }
  async function prepare() {
    if (!user) return;
    const snapshot = items.map(item => ({ ...item }));
    const requestId = crypto.randomUUID();
    const quote = await checkout(snapshot, requestId, false);
    setReview({ userId: user.id, items: snapshot.map(item => ({ ...item, salePrice: quote.lines.find(line => line.itemId === item.itemId)!.salePrice })), quote, requestId });
  }
  async function confirm() {
    if (!review || user?.id !== review.userId) throw new Error('Your account changed. Please review your cart again.');
    // Persist the request before submitting: retries after a lost response reuse its ID.
    const attempt = await db.transaction('rw', db.checkoutAttempts, db.cartItems, async () => {
      const pending = await db.checkoutAttempts.get(user.id);
      if (pending) return pending;
      const current = await db.cartItems.where('userId').equals(user.id).toArray();
      if (current.length !== review.items.length || review.items.some(item => current.find(row => row.itemId === item.itemId)?.quantity !== item.quantity)) {
        throw new Error('Your cart has changed. Close this review and check out again.');
      }
      await db.checkoutAttempts.add(review);
      return review;
    });
    await complete(attempt);
  }
  async function complete(attempt: NonNullable<typeof review>) {
    let result: CheckoutResult;
    try { result = await checkout(attempt.items, attempt.requestId, true); }
    catch (error) {
      // A database rejection confirms no order committed. Network errors retain
      // the request so a retry cannot create a second order.
      if (error instanceof CheckoutRejected) {
        await db.checkoutAttempts.delete(attempt.userId);
        setReview(null);
      }
      throw error;
    }
    if (!result.orderId) throw new Error('The order was not confirmed. Please try again.');
    await clearPurchasedItems(attempt.userId, attempt.items, attempt.requestId);
    setReview(null); setSuccess(`Order ${result.orderId} received. Total: ${formatPrice(result.total)}.`);
  }
  async function resume() {
    if (!user) return;
    const pending = await db.checkoutAttempts.get(user.id);
    if (pending) await complete(pending);
    else await prepare();
  }
  if (authLoading) return <CircularProgress aria-label="Loading account" />;
  if (!user) return <Stack spacing={2}><Typography variant="h4">Your cart</Typography><Alert severity="info">Log in or sign up to add products and view your cart.</Alert><Button component={Link} to="/login">Log in / Sign up</Button></Stack>;
  return <Stack spacing={3}>
    <Typography component="h1" variant="h4">Your cart</Typography>
    {error && <Alert severity="error">{error}</Alert>}{storageError && <Alert severity="error">{storageError}</Alert>}
    {hasPending && <Alert severity="info" action={<Button disabled={busy} onClick={() => void run(resume)}>Retry confirmation</Button>}>An order confirmation is pending. Retry to check its result before checking out again.</Alert>}
    {success && <Alert severity="success">{success}</Alert>}
    {loading ? <CircularProgress aria-label="Loading cart" /> : items.length === 0 ? <Box><Typography>Your cart is empty.</Typography><Button component={Link} to="/">Explore the collection</Button></Box> : <>
      {items.map(item => <Stack key={item.itemId} direction={{ xs: 'column', sm: 'row' }} spacing={3} sx={{ p: 3, border: '1px solid #e8ddd5', borderRadius: 3 }}>
        {item.imagePath && <Box component="img" src={getCartImage(item.imagePath)} alt={item.itemName} sx={{ width: 110, height: 110, objectFit: 'cover', borderRadius: 2 }} />}
        <Stack spacing={1} sx={{ flex: 1 }}><Typography variant="h6">{item.itemName}</Typography><Typography>{formatPrice(item.salePrice)} each</Typography>
          <Stack direction="row" spacing={2} sx={{ alignItems: "center" }}>
            <Button aria-label={`Decrease quantity of ${item.itemName}`} disabled={busy || item.quantity <= 1} onClick={() => void run(() => changeQuantity(item.itemId, -1))}>−</Button>
            <Typography aria-live="polite">{item.quantity}</Typography>
            <Button aria-label={`Increase quantity of ${item.itemName}`} disabled={busy || item.quantity >= 999} onClick={() => void run(() => changeQuantity(item.itemId, 1))}>+</Button>
            <Button color="error" disabled={busy} onClick={() => void run(() => removeCartItem(item.itemId))}>Remove</Button>
          </Stack>
        </Stack><Typography>Subtotal: {formatPrice(item.salePrice * item.quantity)}</Typography>
      </Stack>)}
      <Typography variant="h6">Estimated total: {formatPrice(items.reduce((sum, item) => sum + item.salePrice * item.quantity, 0))}</Typography>
      <Typography color="text.secondary">We’ll check current prices and availability before you confirm your order.</Typography>
      <Button variant="contained" disabled={busy || !!storageError || hasPending} onClick={() => void run(resume)}>{busy ? 'Please wait…' : 'Checkout'}</Button>
    </>}
    <Dialog open={!!review && review.userId === user.id} onClose={() => { if (!busy) setReview(null); }} fullWidth>
      <DialogTitle>Review your order</DialogTitle><DialogContent>
        <Typography sx={{ mb: 2 }}>These are the current prices. Confirm to place your order.</Typography>
        {review?.quote.lines.map(line => <Typography key={line.itemId}>{line.itemName} × {line.quantity}: {formatPrice(line.salePrice * line.quantity)}</Typography>)}
        {review?.items.some(item => item.salePrice !== items.find(row => row.itemId === item.itemId)?.salePrice) && <Alert severity="info" sx={{ mt: 2 }}>Some prices have changed. Please review the updated total.</Alert>}
        <Typography sx={{ mt: 2, fontWeight: "bold" }}>Total: {formatPrice(review?.quote.total ?? 0)}</Typography>
        {error && <Alert severity="error">{error}</Alert>}
      </DialogContent><DialogActions>
        <Button disabled={busy} onClick={() => setReview(null)}>Back to cart</Button>
        <Button variant="contained" disabled={busy} onClick={() => void run(confirm)}>Confirm order</Button>
      </DialogActions>
    </Dialog>
  </Stack>;
}
