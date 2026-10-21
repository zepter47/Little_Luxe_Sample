import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Alert, Box, Button, CircularProgress, Stack, Typography } from "@mui/material";
import AddToCartButton from "../../features/cart/AddToCartButton";
import { useState } from "react";
import { getItemImagesQueryOption, getItemQueryOption } from "../../features/items/item.query";
import { getItemImageUrl } from "../../services/itemImages";

export const Route = createFileRoute("/products/$productId")({component: ProductDetailPage});

function ProductDetailPage() {
    const {productId} = Route.useParams();
    return <ProductDetails key={productId} itemId={productId} />;
}

function ProductDetails({itemId}: {itemId: string}) {
    const product = useQuery(getItemQueryOption(itemId));
    const gallery = useQuery({...getItemImagesQueryOption(itemId), enabled: !!product.data});
    const [selected, setSelected] = useState<string>();
    const [failedImage, setFailedImage] = useState<string>();
    if (product.isPending) return <CircularProgress aria-label="Loading item" />;
    if (product.error) return <Alert severity="error">{product.error.message}<Button onClick={() => {void product.refetch();}}>Retry</Button></Alert>;
    if (!product.data) return <Alert severity="info">This item could not be found. <Button component={Link} to="/">Back to collection</Button></Alert>;
    const item = product.data;
    const images = [...new Set([getItemImageUrl(item.image_path), ...(gallery.data || []).map(image => getItemImageUrl(image.storage_path))].filter(Boolean))];
    const active = selected && images.includes(selected) ? selected : images[0];
    return <Box>
        <Button component={Link} to="/" sx={{mb: 2}}>Back to collection</Button>
        <Box sx={{display: "grid", gridTemplateColumns: {xs: "1fr", md: "1fr 1fr"}, gap: 4}}>
            <Box>
                <Box sx={{aspectRatio: "4 / 5", bgcolor: "#f5eee9", borderRadius: 3, display: "grid", placeItems: "center", overflow: "hidden"}}>
                    {active && failedImage !== active ? <Box component="img" src={active} alt={item.item_name}
                        onError={() => setFailedImage(active)} sx={{width: "100%", height: "100%", objectFit: "contain"}} />
                        : <Typography color="text.secondary">Image unavailable</Typography>}
                </Box>
                {gallery.isPending && gallery.fetchStatus === "fetching" && <CircularProgress size={24} aria-label="Loading additional images" sx={{mt: 2}} />}
                {gallery.error && <Alert severity="warning" sx={{mt: 2}}>Additional images could not be loaded. <Button onClick={() => {void gallery.refetch();}}>Retry</Button></Alert>}
                <Stack direction="row" spacing={1} sx={{mt: 2, flexWrap: "wrap", gap: 1}}>
                    {images.map((url, index) => <Button key={url} variant={active === url ? "contained" : "outlined"}
                        aria-label={`Show image ${index + 1} of ${item.item_name}`} aria-pressed={active === url}
                        onClick={() => {setSelected(url); setFailedImage(undefined);}} sx={{p: 0.5, minWidth: 0}}>
                        <Box component="img" src={url} alt={`View ${index + 1}`} sx={{width: 70, height: 85, objectFit: "contain"}} />
                    </Button>)}
                </Stack>
            </Box>
            <Stack spacing={2}>
                <Typography component="h1" variant="h3" sx={{fontFamily: "Georgia, serif"}}>{item.item_name}</Typography>
                <Typography variant="h5">UGX {item.sale_price.toLocaleString(undefined, {minimumFractionDigits: 2})}</Typography>
                <Typography sx={{whiteSpace: "pre-wrap"}}>{item.product_notes}</Typography>
                <AddToCartButton product={item} />
            </Stack>
        </Box>
    </Box>;
}
