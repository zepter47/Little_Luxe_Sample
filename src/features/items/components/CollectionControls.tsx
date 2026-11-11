import { useState } from "react";
import {
    Alert, Badge, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle,
    Fab, FormControlLabel, IconButton, InputBase, MenuItem, Paper, Stack,
    SvgIcon, Switch, TextField, Typography,
} from "@mui/material";
import type { category } from "../../Categories/category.types";
import { emptyCollectionFilters, priceRangeError, type CollectionFilters } from "../item.filters";

function SearchIcon() {
    return <SvgIcon sx={{fill: "none", stroke: "currentColor", strokeWidth: 1.8}}><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5" /></SvgIcon>;
}
function FilterIcon() {
    return <SvgIcon sx={{fill: "none", stroke: "currentColor", strokeWidth: 1.8}}><path d="M4 6h16M7 12h10M10 18h4" /></SvgIcon>;
}
const coffee = {bgcolor: "#79543f", color: "white", "&:hover": {bgcolor: "#60412f"}};

type Props = {
    categories: category[];
    categoriesUnavailable: boolean;
    filters: CollectionFilters;
    onSearch: (name: string) => void;
    onFilter: (filters: CollectionFilters) => void;
};

export default function CollectionControls({categories, categoriesUnavailable, filters, onSearch, onFilter}: Props) {
    const [searchDraft, setSearchDraft] = useState("");
    const [filterDraft, setFilterDraft] = useState(filters);
    const [open, setOpen] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const count = Number(!!filters.categoryId) + Number(filters.minPrice !== "" || filters.maxPrice !== "") + Number(filters.discountedOnly);
    return <>
        <Box sx={{position: "fixed", top: {xs: 68, md: 20}, left: {xs: 16, md: 272}, right: {xs: 16, md: 24}, zIndex: theme => theme.zIndex.appBar - 1, pointerEvents: "none"}}>
            <Paper component="form" role="search" aria-label="Search collection" elevation={0}
                onSubmit={event => {event.preventDefault(); onSearch(searchDraft.trim());}}
                sx={{display: "flex", alignItems: "center", gap: 1, maxWidth: 640, mx: "auto", p: 0.75, pl: 2.5, borderRadius: 20,
                    border: "1px solid #e8dbd1", bgcolor: "rgba(255,252,249,.96)", backdropFilter: "blur(16px)",
                    boxShadow: "0 8px 32px #49352b1a", pointerEvents: "auto"}}>
                <InputBase value={searchDraft} onChange={event => setSearchDraft(event.target.value)} placeholder="Find your little luxury…"
                    inputProps={{"aria-label": "Search items by name", enterKeyHint: "search", maxLength: 200}}
                    sx={{flex: 1, minWidth: 0, fontSize: {xs: 16, sm: 17}, color: "#49352b"}} />
                {searchDraft && <IconButton size="small" aria-label="Clear search text" onClick={() => setSearchDraft("")}>
                    <SvgIcon fontSize="small"><path d="m6.4 5 5.6 5.6L17.6 5 19 6.4 13.4 12l5.6 5.6-1.4 1.4-5.6-5.6L6.4 19 5 17.6l5.6-5.6L5 6.4Z" /></SvgIcon>
                </IconButton>}
                <IconButton type="submit" aria-label="Search items" sx={{...coffee, width: 44, height: 44}}><SearchIcon /></IconButton>
            </Paper>
        </Box>
        <Fab variant="extended" aria-label="Open collection filters" aria-haspopup="dialog" aria-expanded={open}
            onClick={() => {setFilterDraft({...filters}); setError(null); setOpen(true);}}
            sx={{...coffee, position: "fixed", left: {xs: 16, md: 272}, bottom: "max(18dvh, env(safe-area-inset-bottom))", zIndex: theme => theme.zIndex.appBar - 1,
                gap: 1, px: 2.5, boxShadow: "0 8px 28px #49352b40", textTransform: "none"}}>
            <Badge badgeContent={count} color="error"><FilterIcon /></Badge> Filters
        </Fab>
        <Dialog open={open} onClose={() => setOpen(false)} aria-labelledby="collection-filter-title" fullWidth maxWidth="xs"
            slotProps={{paper: {sx: {borderRadius: 4, bgcolor: "#fffcf9", m: 2, width: "calc(100% - 32px)"}}}}>
            <Box component="form" onSubmit={event => {
                event.preventDefault();
                const message = priceRangeError(filterDraft);
                setError(message);
                if (!message) {onFilter({...filterDraft}); setOpen(false);}
            }}>
                <DialogTitle id="collection-filter-title" sx={{fontFamily: "Georgia, serif", fontSize: 28, color: "#49352b"}}>A little more you</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" color="text.secondary" sx={{mb: 3}}>Find your favourites. Apply when you’re ready.</Typography>
                    <Stack spacing={3}>
                        <TextField select label="Category" value={filterDraft.categoryId} disabled={categoriesUnavailable}
                            onChange={event => setFilterDraft({...filterDraft, categoryId: event.target.value})} fullWidth
                            helperText={categoriesUnavailable ? "Categories are temporarily unavailable." : undefined}>
                            <MenuItem value="">All categories</MenuItem>
                            {categories.map(category => <MenuItem key={category.item_category_id} value={category.item_category_id}>{category.category_name}</MenuItem>)}
                        </TextField>
                        <Box>
                            <Typography variant="subtitle2" sx={{mb: 1.5}}>Price range · UGX</Typography>
                            <Stack direction="row" spacing={2}>
                                {([['minPrice', 'Minimum price'], ['maxPrice', 'Maximum price']] as const).map(([field, label]) =>
                                    <TextField key={field} label={label} type="number" value={filterDraft[field]} fullWidth
                                        slotProps={{htmlInput: {min: 0, step: 1, inputMode: "numeric"}}}
                                        onChange={event => {setFilterDraft({...filterDraft, [field]: event.target.value}); setError(null);}} />)}
                            </Stack>
                            <Typography variant="caption" color="text.secondary">Uses the price after discounts. Leave blank for any price.</Typography>
                        </Box>
                        <FormControlLabel label="Discounted items only" control={<Switch checked={filterDraft.discountedOnly}
                            onChange={(_, checked) => setFilterDraft({...filterDraft, discountedOnly: checked})} />} />
                        {error && <Alert severity="error">{error}</Alert>}
                    </Stack>
                </DialogContent>
                <DialogActions sx={{px: 3, pb: 3, flexWrap: "wrap", gap: 1}}>
                    <Button onClick={() => {setFilterDraft({...emptyCollectionFilters}); setError(null);}} sx={{mr: "auto", color: "#79543f"}}>Reset</Button>
                    <Button onClick={() => setOpen(false)} sx={{color: "#735b4c"}}>Cancel</Button>
                    <Button type="submit" variant="contained" startIcon={<FilterIcon />} sx={{...coffee, borderRadius: 8, textTransform: "none"}}>Apply filters</Button>
                </DialogActions>
            </Box>
        </Dialog>
    </>;
}
