import { useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Alert, Box, Button, MenuItem, Stack, TextField } from "@mui/material";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { itemSchema } from "../item.schema";
import { itemKeys, type item, type itemFormData } from "../item.types";
import { saveItemMutationOption } from "../item.query";
import type { category } from "../../Categories/category.types";

export default function ItemForm({item, categories, onSaved, onCancel}: {
    item?: item; categories: category[]; onSaved: () => void; onCancel: () => void;
}) {
    const queryClient = useQueryClient();
    const mutation = useMutation(saveItemMutationOption());
    const [imageError, setImageError] = useState("");
    const [readingImage, setReadingImage] = useState(false);
    const {control, handleSubmit, setValue, formState: {isSubmitting}} = useForm<itemFormData>({
        resolver: zodResolver(itemSchema),
        defaultValues: {item_name: item?.item_name || "", cost_price: item?.cost_price || 0,
            sale_price: item?.sale_price || 0, item_category_id: item?.item_category_id || "",
            product_notes: item?.product_notes || "", image_path: item?.image_path || ""},
    });
    const image = useWatch({control, name: "image_path"});

    async function onValidSubmit(data: itemFormData) {
        try {
            await mutation.mutateAsync({...data, item_id: item?.item_id,
                item_category_id: data.item_category_id || null, image_path: data.image_path || null});
            await queryClient.invalidateQueries({queryKey: itemKeys.all});
            onSaved();
        } catch { /* The mutation error is displayed below. */ }
    }

    async function uploadImage(file?: File) {
        if (!file) return;
        setImageError("");
        if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 2 * 1024 * 1024) {
            setImageError("Choose a PNG, JPEG or WebP image smaller than 2 MB.");
            return;
        }
        setReadingImage(true);
        try {
            const value = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(String(reader.result));
                reader.onerror = () => reject(new Error("Unable to read image"));
                reader.readAsDataURL(file);
            });
            setValue("image_path", value, {shouldValidate: true});
        } catch { setImageError("Unable to read this image. Please try again."); }
        finally { setReadingImage(false); }
    }

    return <Box component="form" onSubmit={handleSubmit(onValidSubmit)}>
        <Stack spacing={2.5}>
            {mutation.error && <Alert severity="error">{mutation.error.message}</Alert>}
            <Controller name="item_name" control={control} render={({field, fieldState}) =>
                <TextField {...field} label="Item name" fullWidth error={!!fieldState.error} helperText={fieldState.error?.message} />} />
            <Stack direction={{xs: "column", sm: "row"}} spacing={2}>
                {(["sale_price", "cost_price"] as const).map(name =>
                    <Controller key={name} name={name} control={control} render={({field, fieldState}) =>
                        <TextField {...field} onChange={event => field.onChange(event.target.value === "" ? NaN : Number(event.target.value))}
                            label={name === "sale_price" ? "Sale price" : "Cost price"} type="number" fullWidth
                            value={Number.isNaN(field.value) ? "" : field.value}
                            slotProps={{htmlInput: {min: 0, step: "0.01"}}}
                            error={!!fieldState.error} helperText={fieldState.error?.message} />} />)}
            </Stack>
            <Controller name="item_category_id" control={control} render={({field}) =>
                <TextField {...field} select label="Category" fullWidth>
                    <MenuItem value="">Uncategorized</MenuItem>
                    {categories.map(category => <MenuItem key={category.item_category_id} value={category.item_category_id}>{category.category_name}</MenuItem>)}
                </TextField>} />
            <Controller name="product_notes" control={control} render={({field}) =>
                <TextField {...field} label="Description" multiline minRows={3} fullWidth />} />
            <Controller name="image_path" control={control} render={({field, fieldState}) =>
                <TextField {...field} value={field.value.startsWith("data:") ? "" : field.value} label="Image URL" fullWidth error={!!fieldState.error}
                    helperText={fieldState.error?.message || (field.value.startsWith("data:") ? "Picture selected. Enter a URL to replace it." : "Optional. Leave empty to use the image placeholder.")} />} />
            <Button component="label" variant="outlined" disabled={readingImage}>
                {readingImage ? "Reading image…" : "Choose picture"}
                <input hidden type="file" accept="image/png,image/jpeg,image/webp"
                    onChange={event => {void uploadImage(event.target.files?.[0]); event.target.value = "";}} />
            </Button>
            {imageError && <Alert severity="error">{imageError}</Alert>}
            {image && <Box component="img" src={image} alt="Selected item picture" sx={{width: "100%", height: 180, objectFit: "contain", borderRadius: 2, bgcolor: "#f5eee9"}} />}
            {image && <Button onClick={() => setValue("image_path", "", {shouldValidate: true})}>Remove picture</Button>}
            <Stack direction="row" spacing={1} sx={{justifyContent: "flex-end"}}>
                <Button onClick={onCancel} disabled={isSubmitting}>Cancel</Button>
                <Button type="submit" variant="contained" disabled={isSubmitting || readingImage}>{isSubmitting ? "Saving…" : "Save item"}</Button>
            </Stack>
        </Stack>
    </Box>;
}

