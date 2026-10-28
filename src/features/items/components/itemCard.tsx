import { Box, Card, CardActionArea, CardContent, Chip, SvgIcon, Typography } from "@mui/material";
import { createLink } from "@tanstack/react-router";
import { useState } from "react";
import AddToCartButton from "../../cart/AddToCartButton";
import { getCartImage } from "../../cart/image";
import type { StorefrontItem } from "../item.types";

const ItemCardLink = createLink(CardActionArea);

export default function ItemCard({item, category}: {item: StorefrontItem; category?: string}) {
    const [failedImage, setFailedImage] = useState<string | null>(null);
    return <Card variant="outlined" sx={{borderRadius: 3, overflow: "hidden", height: "100%", minWidth: 0, display: "flex", flexDirection: "column"}}>
        <ItemCardLink to="/items/$itemId" params={{itemId: item.item_id}} aria-label={`View details for ${item.item_name}`}>
        <Box sx={{position: "relative", aspectRatio: "3 / 2", overflow: "hidden", bgcolor: "#f5eee9", display: "grid", placeItems: "center"}}>
            {item.image_path && failedImage !== item.image_path
                ? <Box component="img" src={getCartImage(item.image_path)} alt={item.item_name} onError={() => setFailedImage(item.image_path)}
                    loading="lazy" sx={{position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover"}} />
                : <Box sx={{textAlign: "center", color: "#9d8272"}}>
                    <SvgIcon sx={{fontSize: {xs: 32, sm: 40}, fill: "none", stroke: "currentColor", strokeWidth: 1}}>
                        <path d="M4 4h16v16H4ZM4 16l5-5 4 4 3-3 4 4M15 8h.01" />
                    </SvgIcon>
                    <Typography variant="caption" sx={{display: "block", px: 1}}>Image coming soon</Typography>
                </Box>}
            {!item.is_stocked && <Chip label="Out of stock" size="small" color="warning" sx={{position: "absolute", top: 8, left: 8}} />}
        </Box>
        <CardContent sx={{p: {xs: 1.5, sm: 2}, "&:last-child": {pb: 0}}}>
            {category && <Typography variant="caption" color="text.secondary" noWrap title={category} sx={{display: "block", mb: 0.5}}>{category}</Typography>}
            <Typography component="h3" sx={{fontSize: {xs: "0.95rem", sm: "1.1rem"}, fontWeight: 600, lineHeight: 1.35, minHeight: "2.7em", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", overflowWrap: "anywhere"}}>{item.item_name}</Typography>
        </CardContent>
        </ItemCardLink>
        <Box sx={{display: "flex", alignItems: "center", justifyContent: "space-between", gap: 0.5, mt: "auto", px: {xs: 1.5, sm: 2}, pb: 1, pt: 0.5}}>
            <Typography sx={{minWidth: 0, overflowWrap: "anywhere", fontSize: {xs: "0.9rem", sm: "1rem"}, fontWeight: 700, color: "#79543f"}}>{item.sale_price.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</Typography>
            <Box sx={{flexShrink: 0, "& .MuiIconButton-root": {width: 44, height: 44, bgcolor: "#f5eee9", color: "#79543f", "&:hover": {bgcolor: "#eaddd3"}, "&.Mui-disabled": {color: "action.disabled"}}}}><AddToCartButton product={item} icon /></Box>
        </Box>
    </Card>;
}


