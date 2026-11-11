import { useMemo, useState } from "react";
import CollectionControls from "./CollectionControls";
import { emptyCollectionFilters, filterCollection } from "../item.filters";
import { useQuery } from "@tanstack/react-query";
import { Alert, Box, Button, CircularProgress, Typography } from "@mui/material";
import { getItemsQueryOption } from "../item.query";
import { getCategoryNameQueryOption } from "../../Categories/category.query";
import ItemCard from "./itemCard";

export default function ItemCollection() {
    const items = useQuery(getItemsQueryOption());
    const categories = useQuery(getCategoryNameQueryOption());
    const [search, setSearch] = useState("");
    const [filters, setFilters] = useState(emptyCollectionFilters);
    // Reuse the storefront cache; only submitted state drives this calculation.
    const visibleItems = useMemo(() => filterCollection(items.data ?? [], search, filters), [items.data, search, filters]);
    const narrowed = !!search || !!filters.categoryId || filters.minPrice !== "" || filters.maxPrice !== "" || filters.discountedOnly;
    return <Box sx={{pt: {xs: 9, md: 10}, pb: 10}}>
        <CollectionControls categories={categories.data ?? []} categoriesUnavailable={categories.isError || categories.isPending}
            filters={filters} onSearch={setSearch} onFilter={setFilters} />
        <Box sx={{p: {xs: 3, md: 6}, mb: 4, borderRadius: 4, bgcolor: "#f5eee9", color: "#49352b"}}>
            <Typography variant="overline" sx={{letterSpacing: 3}}>THE LITTLE LUXE COLLECTION</Typography>
            <Typography component="h1" sx={{fontFamily: "Georgia, serif", fontSize: {xs: "2.5rem", md: "3.5rem"}, my: 1}}>Little things. Everyday luxury.</Typography>
            <Typography sx={{maxWidth: 480, color: "#735b4c"}}>Discover thoughtfully chosen pieces that bring a little more joy to your everyday.</Typography>
        </Box>
        <Typography component="h2" variant="h5" sx={{mb: 3}}>Explore our collection</Typography>
        <Typography role="status" aria-live="polite" color="text.secondary" sx={{mb: 3}}>
            {items.isSuccess && `${visibleItems.length} ${visibleItems.length === 1 ? "item" : "items"}${search ? ` matching “${search}”` : ""}${narrowed ? " · Refine your search or filters anytime." : " to discover"}`}
        </Typography>
        {items.isPending && <CircularProgress aria-label="Loading collection" />}
        {items.error && <Alert severity="error">{items.error.message}<Button onClick={() => items.refetch()}>Retry</Button></Alert>}
        {categories.error && <Alert severity="warning" sx={{mb: 2}}>Category labels are temporarily unavailable.</Alert>}
        {items.isSuccess && visibleItems.length === 0 && <Box sx={{p: 5, textAlign: "center", border: "1px dashed #d7c5b8", borderRadius: 3}}>
            <Typography variant="h6">{narrowed ? "No little luxuries found." : "Something lovely is on its way."}</Typography>
            <Typography color="text.secondary">{narrowed ? "Try another name, category or price range." : "Our collection will appear here as soon as items are added."}</Typography>
        </Box>}
        <Box sx={{display: "grid", gridTemplateColumns: {xs: "repeat(2, minmax(0, 1fr))", lg: "repeat(3, minmax(0, 1fr))"}, gap: {xs: 1.5, sm: 3}}}>
            {visibleItems.map(item => <ItemCard key={item.item_id} item={item}
                category={categories.data?.find(category => category.item_category_id === item.item_category_id)?.category_name} />)}
        </Box>
    </Box>;
}


