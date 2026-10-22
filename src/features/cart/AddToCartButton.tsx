import { useState } from 'react';
import { Link } from '@tanstack/react-router';
import { Alert, Button, IconButton, Snackbar, SvgIcon } from '@mui/material';
import { useAuth } from '../auth/auth';
import { addToCart } from './cart.api';
import type { CartProduct } from '../items/item.types';
export default function AddToCartButton({ product, icon = false }: { product: CartProduct; icon?: boolean }) {
  const { user, loading } = useAuth();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ text: string; severity: 'success' | 'info' | 'error'; auth?: boolean } | null>(null);
  async function add() {
    if (!product.is_active || !product.is_stocked) return;
    if (!user) { setNotice({ text: 'Log in or sign up to add products to your cart.', severity: 'info', auth: true }); return; }
    setBusy(true);
    try {
      const added = await addToCart(product);
      setNotice({ text: added ? 'Added to your cart.' : 'This item is already in your cart. Change its quantity in the cart.', severity: added ? 'success' : 'info' });
    } catch (error) { setNotice({ text: error instanceof Error ? error.message : 'Unable to add this item. Please try again.', severity: 'error' }); }
    finally { setBusy(false); }
  }
  const glyph = <SvgIcon sx={{ fill: 'none', stroke: 'currentColor', strokeWidth: 1.5 }}><path d="M3 3h2l3 12h10l3-9H6M9 20h.01M18 20h.01M12 6v6m-3-3h6" /></SvgIcon>;
  return <>
    {icon ? <IconButton aria-label={`Add ${product.item_name} to cart`} disabled={loading || busy || !product.is_active || !product.is_stocked} onClick={() => void add()}>{glyph}</IconButton>
      : <Button variant="contained" startIcon={glyph} disabled={loading || busy || !product.is_active || !product.is_stocked} onClick={() => void add()}>{!product.is_stocked ? 'Out of stock' : busy ? 'Adding…' : 'Add to cart'}</Button>}
    <Snackbar open={!!notice} autoHideDuration={notice?.auth ? null : 6000} onClose={() => setNotice(null)}>
      <Alert severity={notice?.severity} onClose={() => setNotice(null)} action={notice?.auth ? <Button component={Link} to="/login" color="inherit">Log in / Sign up</Button> : undefined}>{notice?.text}</Alert>
    </Snackbar>
  </>;
}
