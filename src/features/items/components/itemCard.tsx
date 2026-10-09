import { Box, Card, CardContent, Chip, SvgIcon, Typography } from "@mui/material";
import { useState } from "react";
import type { item } from "../item.types";

export default function ItemCard({item, category}: {item: item; category?: string}) {
    const [failedImage, setFailedImage] = useState<string | null>(null);
    return <Card variant="outlined" sx={{borderRadius: 4, overflow: "hidden", height: "100%"}}>
        <Box sx={{aspectRatio: "4 / 3", bgcolor: "#f5eee9", display: "grid", placeItems: "center"}}>
            {item.image_path && failedImage !== item.image_path
                ? <Box component="img" src={item.image_path} alt={item.item_name} onError={() => setFailedImage(item.image_path)}
                    sx={{width: "100%", height: "100%", objectFit: "cover"}} />
                : <Box sx={{textAlign: "center", color: "#9d8272"}}>
                    <SvgIcon sx={{fontSize: 48, fill: "none", stroke: "currentColor", strokeWidth: 1}}>
                        <path d="M4 4h16v16H4ZM4 16l5-5 4 4 3-3 4 4M15 8h.01" />
                    </SvgIcon>
                    <Typography variant="caption" sx={{display: "block"}}>Image coming soon</Typography>
                </Box>}
        </Box>
        <CardContent>
            {category && <Chip label={category} size="small" sx={{mb: 1, bgcolor: "#f5eee9"}} />}
            <Typography variant="h6" component="h3">{item.item_name}</Typography>
            <Typography color="text.secondary" sx={{mt: 1, whiteSpace: "pre-wrap"}}>{item.product_notes || "A little luxury for every day."}</Typography>
            <Typography sx={{mt: 2, fontWeight: 700, color: "#79543f"}}>{item.sale_price.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</Typography>
        </CardContent>
    </Card>;
}

