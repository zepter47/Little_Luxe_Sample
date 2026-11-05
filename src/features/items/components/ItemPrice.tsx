import { Chip, Stack, Typography } from "@mui/material";
import { discountedPrice, formatUGX } from "../item.pricing";
export default function ItemPrice({price, discount = 0}: {price: number; discount?: number}) {
  return <Stack spacing={0.5}>
    {discount > 0 && <><Chip size="small" color="success" label={`${discount}% OFF`} sx={{alignSelf: 'flex-start'}} />
      <Typography component="s" variant="body2" color="text.secondary">{formatUGX(price)}</Typography></>}
    <Typography sx={{fontWeight: 700, color: '#79543f', overflowWrap: 'anywhere'}}>{formatUGX(discountedPrice(price, discount))}</Typography>
  </Stack>;
}
