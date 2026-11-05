import SaveConfirmation from "./SaveConfirmation";
import LabeledTextField from "./LabeledTextField";
import { useEffect, useMemo, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Alert, Box, Button, Checkbox, FormControlLabel, MenuItem, Stack, Typography } from "@mui/material";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { itemSchema } from "../item.schema";
import { itemKeys, type AdminItem, type itemFormData } from "../item.types";
import { getItemImagesQueryOption, saveItemMutationOption } from "../item.query";
import type { category } from "../../Categories/category.types";
import type { Unit } from "../../units/unit.types";
import { getItemImageUrl, uploadItemProfileImage, uploadItemGalleryImages, validateItemImage } from "../../../services/itemImages";

import { useAuth } from '../../auth/auth';
import { useFormDraft } from '../../../services/drafts/useFormDraft';
import { itemDraftRepository } from '../item.draft';
import type { ItemDraftExtra } from '../item.draft.schema';
import ItemDraftStatus from './ItemDraftStatus';

type ItemFormProps = {
    item?: AdminItem; categories: category[]; units: Unit[];
    onSaved: (warning?: string) => void; onCancel: () => void;
};
export default function ItemForm(props: ItemFormProps) {
    const {user, loading} = useAuth();
    if (loading || !user) return null;
    return <ItemEditor key={`${user.id}:${props.item?.item_id || 'new'}`} {...props} userId={user.id} />;
}

function SelectedImage({file}: {file: File}) {
    const imageRef = useRef<HTMLImageElement>(null);
    useEffect(() => {
        const preview = URL.createObjectURL(file);
        if (imageRef.current) imageRef.current.src = preview;
        return () => URL.revokeObjectURL(preview);
    }, [file]);
    return <Box component="img" ref={imageRef} alt={file.name} sx={{width: 100, height: 100, objectFit: "contain"}} />;
}

function ItemEditor({item, categories, units, onSaved, onCancel, userId}: {userId: string} & {
    item?: AdminItem; categories: category[]; units: Unit[]; onSaved: (warning?: string) => void; onCancel: () => void;
}) {
    const queryClient = useQueryClient();
    const [approvedDraft, setApprovedDraft] = useState<itemFormData | null>(null);
    const [saving, setSaving] = useState(false);
    const savingRef = useRef(false);
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
    const form = useForm<itemFormData>({
        resolver: zodResolver(itemSchema),
        defaultValues: {is_active: item?.is_active ?? true, item_name: item?.item_name || "",
            sale_price: item?.sale_price || 0, item_discount: item?.item_discount ?? 0, item_category_id: item?.item_category_id || "",
            product_notes: item?.product_notes || "", uom_id: item?.uom_id || ""},
    });

    const {control, handleSubmit, formState: {isSubmitting}} = form;
    const extra = useMemo(() => ({savedId, profile, profilePath, gallery, warning}),
        [savedId, profile, profilePath, gallery, warning]);
    function restoreExtra(value: ItemDraftExtra) {
        setSavedId(value.savedId);
        setProfile(value.profile);
        setProfilePath(value.profilePath);
        setGallery(value.gallery);
        setWarning(value.warning);
    }
    const draft = useFormDraft({userId, form, repository: itemDraftRepository,
        extra, restoreExtra, enabled: !item});
    const [closing, setClosing] = useState(false);
    const pending = isSubmitting || saving || closing;
    const disabled = pending || !draft.ready || draft.finished;
    async function closeKeepingDraft() {
        if (closing) return;
        setClosing(true);
        try {if (draft.finished || await draft.saveNow()) onCancel();}
        finally {setClosing(false);}
    }
    async function discardDraft() {
        if (!window.confirm('Discard this item draft and its selected images?')) return;
        setClosing(true);
        try {if (await draft.discard()) onCancel();}
        finally {setClosing(false);}
    }

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
        let recovery: ItemDraftExtra = {...extra};
        setImageError("");
        try {
            if (!await draft.saveNow()) return;
            const itemId = await mutation.mutateAsync({p_item_id: savedId, p_item_name: data.item_name,
                p_sale_price: data.sale_price, p_item_discount: data.item_discount, p_category_id: data.item_category_id || null,
                p_uom_id: data.uom_id, p_product_notes: data.product_notes, p_is_active: data.is_active,
                p_image_path: profilePath});
            setSavedId(itemId);
            currentId = itemId;
            recovery = {...recovery, savedId: itemId};
            // Once the item exists, reopening must update it, not create it again.
            if (!await draft.saveNow({values: form.getValues(), extra: recovery})) return;
            if (profile) {
                const result = await profileMutation.mutateAsync({itemId: itemId, file: profile});
                setProfilePath(result.path);
                setProfile(undefined);
                if (result.warning) {cleanupWarning = result.warning; setWarning(result.warning);}
                recovery = {...recovery, profilePath: result.path, profile: undefined,
                    warning: cleanupWarning || ''};
                if (!await draft.saveNow({values: form.getValues(), extra: recovery})) return;
            }
            if (gallery.length) {
                const result = await galleryMutation.mutateAsync({itemId: itemId, files: gallery});
                const remaining = result.failed.map(failure => failure.file);
                setGallery(remaining);
                recovery = {...recovery, gallery: remaining};
                if (!await draft.saveNow({values: form.getValues(), extra: recovery})) return;
                if (result.failed.length) {
                    setImageError(`Item saved. Retry failed images: ${result.failed.map(failure => `${failure.file.name}: ${failure.message}`).join("; ")}`);
                    return;
                }
            }
            if (await draft.complete()) onSaved(cleanupWarning);
        } catch (error) {
            setImageError(`${currentId ? "The item exists; retry saving to finish. " : ""}${error instanceof Error ? error.message : String((error as {message?: string}).message || error)}`);
        } finally {
            await queryClient.invalidateQueries({queryKey: itemKeys.all});
        }
    }

    async function saveApprovedDraft() {
        if (!approvedDraft || savingRef.current || disabled) return;
        savingRef.current = true;
        setSaving(true);
        const data = approvedDraft;
        setApprovedDraft(null);
        try {await onValidSubmit(data);}
        finally {savingRef.current = false; setSaving(false);}
    }

    return <Box component="form" noValidate onBlur={() => {if (draft.ready && !draft.finished) void draft.saveNow();}} onSubmit={handleSubmit(values => setApprovedDraft(values))}>
        <Stack spacing={2.5}>
            {!item && <ItemDraftStatus {...draft} disabled={pending}
                onRetry={() => {void (draft.finished ? draft.complete().then(done => {if (done) onSaved(warning || undefined);}) : draft.saveNow());}}
                onDiscard={() => {void discardDraft();}} />}
            {imageError && <Alert severity="error">{imageError}</Alert>}
            {warning && <Alert severity="warning">{warning}</Alert>}
            <Box component="fieldset" disabled={disabled} sx={{border: 0, p: 0, m: 0, minWidth: 0}}>
            <Stack spacing={2.5}>
            <Controller name="item_name" control={control} render={({field: {ref, ...field}, fieldState}) =>
                <LabeledTextField {...field} inputRef={ref} label="Item name" fullWidth error={!!fieldState.error} helperText={fieldState.error?.message} />} />
            <Controller name="sale_price" control={control} render={({field: {ref, ...field}, fieldState}) =>
                <LabeledTextField {...field} inputRef={ref} onChange={event => field.onChange(event.target.value === "" ? NaN : Number(event.target.value))}
                    label="Sale price" type="number" fullWidth value={Number.isNaN(field.value) ? "" : field.value}
                    slotProps={{htmlInput: {min: 0, step: 1}}}
                    error={!!fieldState.error} helperText={fieldState.error?.message} />} />
            <Controller name="item_discount" control={control} render={({field: {ref, ...field}, fieldState}) =>
                <LabeledTextField {...field} inputRef={ref} label="Online discount (%)" type="number" fullWidth
                    value={Number.isNaN(field.value) ? "" : field.value}
                    onChange={event => field.onChange(event.target.value === "" ? NaN : Number(event.target.value))}
                    slotProps={{htmlInput: {min: 0, max: 100, step: 1}}}
                    error={!!fieldState.error} helperText={fieldState.error?.message || "Whole percentage, 0–100. A 100% discount makes the item free."} />} />
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
            <Controller name="is_active" control={control} render={({field}) =>
                <FormControlLabel label="Active product (visible in storefront)" control={<Checkbox checked={field.value}
                    onChange={(_, checked) => field.onChange(checked)} />} />} />
            <Controller name="product_notes" control={control} render={({field: {ref, ...field}}) =>
                <LabeledTextField {...field} inputRef={ref} label="Description" multiline minRows={3} fullWidth />} />
            <Typography variant="subtitle1">Profile picture</Typography>
            <Button component="label" variant="outlined" disabled={disabled}>
                Add profile picture
                <input hidden type="file" accept="image/png,image/jpeg,image/webp" disabled={disabled}
                    onChange={event => {const files = Array.from(event.target.files || []); if (files.length) chooseImages(files, true); event.target.value = "";}} />
            </Button>
            {profile ? <Stack direction="row" spacing={1} sx={{alignItems: "center"}}><SelectedImage file={profile} />
                <Button onClick={() => setProfile(undefined)}>Remove selection</Button></Stack>
                : profilePath && <Box component="img" src={getItemImageUrl(profilePath)} alt="Current profile picture" sx={{height: 180, objectFit: "contain"}} />}
            <Typography variant="subtitle1">Other images</Typography>
            <Button component="label" variant="outlined" disabled={disabled}>
                Add other images
                <input hidden type="file" multiple accept="image/png,image/jpeg,image/webp" disabled={disabled}
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
                <Button onClick={() => {void closeKeepingDraft();}} disabled={pending || (!draft.ready && !draft.finished)}>{item ? "Cancel" : "Close and keep draft"}</Button>
                <Button type="submit" variant="contained" disabled={disabled || !units.length}>{pending ? "Saving item and images…" : "Save item"}</Button>
            </Stack>
        </Stack>
        <SaveConfirmation open={approvedDraft !== null} pending={pending} label="item"
            onNo={() => setApprovedDraft(null)} onYes={() => {void saveApprovedDraft();}} />
    </Box>;
}

