import LabeledTextField from "../../../components/forms/LabeledTextField";
import { useEffect, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Alert, Box, Button, MenuItem, Stack, Typography } from "@mui/material";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { itemSchema } from "../item.schema";
import { itemKeys, type item, type itemFormData } from "../item.types";
import { getItemImagesQueryOption, saveItemMutationOption } from "../item.query";
import type { category } from "../../Categories/category.types";
import type { Unit } from "../../units/unit.query";
import { getItemImageUrl, uploadItemProfileImage, uploadItemGalleryImages, validateItemImage } from "../../../services/itemImages";

function SelectedImage({file}: {file: File}) {
    const imageRef = useRef<HTMLImageElement>(null);
    useEffect(() => {
        const preview = URL.createObjectURL(file);
        if (imageRef.current) imageRef.current.src = preview;
        return () => URL.revokeObjectURL(preview);
    }, [file]);
    return <Box component="img" ref={imageRef} alt={file.name} sx={{width: 100, height: 100, objectFit: "contain"}} />;
}

export default function ItemForm({item, categories, units, onSaved, onCancel}: {
    item?: item; categories: category[]; units: Unit[]; onSaved: (warning?: string) => void; onCancel: () => void;
}) {
    const queryClient = useQueryClient();
    const mutation = useMutation(saveItemMutationOption());
    const profileMutation = useMutation({mutationFn: uploadItemProfileImage});
    const galleryMutation = useMutation({mutationFn: uploadItemGalleryImages});
    const [savedId, setSavedId] = useState(item?.item_id);
    const [profile, setProfile] = useState<File>();
    const [profilePath, setProfilePath] = useState(item?.image_path || "");
    const [gallery, setGallery] = useState<File[]>([]);
    const [imageError, setImageError] = useState("");
    const [warning, setWarning] = useState("");
    const existingImages = useQuery({...getItemImagesQueryOption(savedId || ""), enabled: !!savedId});
    const {control, handleSubmit, formState: {isSubmitting}} = useForm<itemFormData>({
        resolver: zodResolver(itemSchema),
        defaultValues: {item_name: item?.item_name || "",
            sale_price: item?.sale_price || 0, item_category_id: item?.item_category_id || "",
            product_notes: item?.product_notes || "", uom_id: item?.uom_id || ""},
    });

    function chooseImages(files: File[], isProfile: boolean) {
        try {
            files.forEach(validateItemImage);
            setImageError("");
            if (isProfile) setProfile(files[0]);
            else setGallery(previous => [...previous, ...files.filter(file => !previous.some(existing => existing.name === file.name && existing.size === file.size && existing.lastModified === file.lastModified))]);
        } catch (error) {setImageError(error instanceof Error ? error.message : "Unable to select image.");}
    }

    async function onValidSubmit(data: itemFormData) {
        let currentId = savedId;
        let cleanupWarning = warning || undefined;
        setImageError("");
        try {
            const saved = await mutation.mutateAsync({...data, item_id: savedId,
                item_category_id: data.item_category_id || null});
            setSavedId(saved.item_id);
            currentId = saved.item_id;
            if (profile) {
                const result = await profileMutation.mutateAsync({itemId: saved.item_id, file: profile});
                setProfilePath(result.path);
                setProfile(undefined);
                if (result.warning) {cleanupWarning = result.warning; setWarning(result.warning);}
            }
            if (gallery.length) {
                const result = await galleryMutation.mutateAsync({itemId: saved.item_id, files: gallery});
                setGallery(result.failed.map(failure => failure.file));
                if (result.failed.length) {
                    setImageError(`Item saved. Retry failed images: ${result.failed.map(failure => `${failure.file.name}: ${failure.message}`).join("; ")}`);
                    return;
                }
            }
            onSaved(cleanupWarning);
        } catch (error) {
            setImageError(`${currentId ? "The item exists; retry saving to finish. " : ""}${error instanceof Error ? error.message : String((error as {message?: string}).message || error)}`);
        } finally {
            await queryClient.invalidateQueries({queryKey: itemKeys.all});
        }
    }

    return <Box component="form" onSubmit={handleSubmit(onValidSubmit)}>
        <Stack spacing={2.5}>
            {imageError && <Alert severity="error">{imageError}</Alert>}
            {warning && <Alert severity="warning">{warning}</Alert>}
            <Box component="fieldset" disabled={isSubmitting} sx={{border: 0, p: 0, m: 0, minWidth: 0}}>
            <Stack spacing={2.5}>
            <Controller name="item_name" control={control} render={({field: {ref, ...field}, fieldState}) =>
                <LabeledTextField {...field} inputRef={ref} label="Item name" fullWidth error={!!fieldState.error} helperText={fieldState.error?.message} />} />
            <Controller name="sale_price" control={control} render={({field: {ref, ...field}, fieldState}) =>
                <LabeledTextField {...field} inputRef={ref} onChange={event => field.onChange(event.target.value === "" ? NaN : Number(event.target.value))}
                    label="Sale price" type="number" fullWidth value={Number.isNaN(field.value) ? "" : field.value}
                    slotProps={{htmlInput: {min: 0, step: "0.01"}}}
                    error={!!fieldState.error} helperText={fieldState.error?.message} />} />
            <Controller name="item_category_id" control={control} render={({field: {ref, ...field}}) =>
                <LabeledTextField {...field} inputRef={ref} select label="Category" fullWidth>
                    <MenuItem value="">Uncategorized</MenuItem>
                    {categories.map(category => <MenuItem key={category.item_category_id} value={category.item_category_id}>{category.category_name}</MenuItem>)}
                </LabeledTextField>} />
            <Controller name="uom_id" control={control} render={({field: {ref, ...field}, fieldState}) =>
                <LabeledTextField {...field} inputRef={ref} select required label="Unit of measure" fullWidth error={!!fieldState.error}
                    helperText={fieldState.error?.message || (!units.length ? "Add a unit of measure in the admin panel first." : undefined)}>
                    <MenuItem value="" disabled>Select a unit</MenuItem>
                    {units.map(unit => <MenuItem key={unit.uom_id} value={unit.uom_id}>{unit.uom_name}</MenuItem>)}
                </LabeledTextField>} />
            <Controller name="product_notes" control={control} render={({field: {ref, ...field}}) =>
                <LabeledTextField {...field} inputRef={ref} label="Description" multiline minRows={3} fullWidth />} />
            <Typography variant="subtitle1">Profile picture</Typography>
            <Button component="label" variant="outlined" disabled={isSubmitting}>
                Add profile picture
                <input hidden type="file" accept="image/png,image/jpeg,image/webp" disabled={isSubmitting}
                    onChange={event => {const files = Array.from(event.target.files || []); if (files.length) chooseImages(files, true); event.target.value = "";}} />
            </Button>
            {profile ? <Stack direction="row" spacing={1} sx={{alignItems: "center"}}><SelectedImage file={profile} />
                <Button onClick={() => setProfile(undefined)}>Remove selection</Button></Stack>
                : profilePath && <Box component="img" src={getItemImageUrl(profilePath)} alt="Current profile picture" sx={{height: 180, objectFit: "contain"}} />}
            <Typography variant="subtitle1">Other images</Typography>
            <Button component="label" variant="outlined" disabled={isSubmitting}>
                Add other images
                <input hidden type="file" multiple accept="image/png,image/jpeg,image/webp" disabled={isSubmitting}
                    onChange={event => {chooseImages(Array.from(event.target.files || []), false); event.target.value = "";}} />
            </Button>
            <Typography variant="caption" color="text.secondary">JPEG, PNG or WebP, up to 6 MB each. Selected pictures upload when you save.</Typography>
            {existingImages.isError && <Alert severity="warning">Unable to load existing images. <Button onClick={() => {void existingImages.refetch();}}>Retry</Button></Alert>}
            <Stack direction="row" spacing={1} sx={{flexWrap: "wrap"}}>
                {existingImages.data?.filter(image => image.storage_path).map(image => <Box key={image.image_id} component="img" src={getItemImageUrl(image.storage_path)} alt="Saved gallery picture" sx={{width: 100, height: 100, objectFit: "contain"}} />)}
            </Stack>
            {gallery.map((file, index) => <Stack key={index} direction="row" spacing={1} sx={{alignItems: "center"}}>
                <SelectedImage file={file} /><Typography sx={{flex: 1}}>{file.name}</Typography>
                <Button aria-label={`Remove ${file.name}`} onClick={() => setGallery(previous => previous.filter((_, i) => i !== index))}>Remove</Button>
            </Stack>)}
            </Stack></Box>
            <Stack direction="row" spacing={1} sx={{justifyContent: "flex-end"}}>
                <Button onClick={onCancel} disabled={isSubmitting}>Cancel</Button>
                <Button type="submit" variant="contained" disabled={isSubmitting || !units.length}>{isSubmitting ? "Saving item and images…" : "Save item"}</Button>
            </Stack>
        </Stack>
    </Box>;
}
