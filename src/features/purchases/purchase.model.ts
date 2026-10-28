// Existing audit timestamps without a timezone are stored as UTC.
export function formatPurchaseDate(value: string | null) {
    if (!value) return '—';
    const timestamp = value.endsWith('Z') || /[+-]\d\d:\d\d$/.test(value) ? value : `${value}Z`;
    return new Date(timestamp).toLocaleString();
}
