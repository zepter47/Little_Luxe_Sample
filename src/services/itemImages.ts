import { supabase } from "../lib/supabase";

const bucket = "Fashion";
export const imageSizeLimit = 6 * 1024 * 1024;
const extensions: Record<string, string> = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp"};

export function validateItemImage(file: File) {
    if (!extensions[file.type] || file.size === 0 || file.size > imageSizeLimit) {
        throw new Error(`${file.name}: choose a JPEG, PNG or WebP image up to 6 MB.`);
    }
}

export function getItemImageUrl(path?: string | null) {
    if (!path) return "";
    // Preserve images saved by the previous URL/base64 form.
    if (/^(https?:\/\/|data:image\/)/i.test(path)) return path;
    return supabase.storage.from(bucket).getPublicUrl(path).data.publicUrl;
}

async function uploadImage(file: File, folder: string) {
    validateItemImage(file);
    const imageId = crypto.randomUUID();
    const path = `${folder}/${imageId}.${extensions[file.type]}`;
    const {data, error} = await supabase.storage.from(bucket).upload(path, file, {
        cacheControl: "3600", contentType: file.type, upsert: false,
    });
    if (error) throw error;
    return {imageId, path: data.path};
}

async function compensate(path: string, cause: {message: string}): Promise<never> {
    const {error} = await supabase.storage.from(bucket).remove([path]);
    throw new Error(`${cause.message}${error ? ` Uploaded file cleanup failed (${path}): ${error.message}` : ""}`);
}

export async function uploadItemProfileImage({itemId, file}: {itemId: string; file: File}) {
    const {data: current, error: readError} = await supabase.from("item").select("image_path").eq("item_id", itemId).single();
    if (readError) throw readError;
    const uploaded = await uploadImage(file, "profile_picture");
    const {error} = await supabase.from("item").update({image_path: uploaded.path}).eq("item_id", itemId).select("item_id").single();
    if (error) return compensate(uploaded.path, error);
    let warning: string | undefined;
    if (current.image_path?.startsWith("profile_picture/") && current.image_path !== uploaded.path) {
        const {error: cleanupError} = await supabase.storage.from(bucket).remove([current.image_path]);
        if (cleanupError) warning = `Profile picture saved, but the old file could not be removed: ${cleanupError.message}`;
    }
    return {path: uploaded.path, warning};
}

export async function uploadItemGalleryImages({itemId, files}: {itemId: string; files: File[]}) {
    const uploaded: {file: File; path: string}[] = [];
    const failed: {file: File; message: string}[] = [];
    for (const file of files) {
        try {
            const image = await uploadImage(file, "item_images");
            const {error} = await supabase.from("item_images").insert({image_id: image.imageId, item_id: itemId, storage_path: image.path});
            if (error) await compensate(image.path, error);
            uploaded.push({file, path: image.path});
        } catch (error) {
            failed.push({file, message: error instanceof Error ? error.message : String((error as {message?: string}).message || error)});
        }
    }
    return {uploaded, failed};
}

export async function getItemGalleryImages(itemId: string) {
    const {data, error} = await supabase.from("item_images").select("image_id, item_id, storage_path").eq("item_id", itemId).order("image_id");
    if (error) throw error;
    return data;
}
