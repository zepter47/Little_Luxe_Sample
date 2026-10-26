import { useRef, useState } from 'react';
import { createFileRoute, Link } from '@tanstack/react-router';
import { Alert, Box, Button, CircularProgress, Stack, Typography } from '@mui/material';
import { useAuth } from '../features/auth/auth';
import { useCart } from '../features/cart/cart.hooks';
import { changeQuantity, removeCartItem } from '../features/cart/cart.api';
import { formatPrice, getCartImage } from '../features/cart/image';
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
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const [error, setError] = useState('');
  async function run(action: () => Promise<void>) {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError('');
    try { await action(); } catch (err) { setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.'); }
    finally { lock.current = false; setBusy(false); }
  }
  if (authLoading) return <CircularProgress aria-label="Loading account" />;
  if (!user) return <Stack spacing={2}><Typography variant="h4">Your cart</Typography><Alert severity="info">Log in or sign up to add products and view your cart.</Alert><Button component={Link} to="/login">Log in / Sign up</Button></Stack>;
  return <Stack spacing={3}>
    <Typography component="h1" variant="h4">Your cart</Typography>
    {error && <Alert severity="error">{error}</Alert>}{storageError && <Alert severity="error">{storageError}</Alert>}
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
      <Alert severity="info">Checkout is unavailable while the order workflow is being replaced.</Alert>
      <Button variant="contained" disabled>Checkout unavailable</Button>
    </>}
  </Stack>;
}
