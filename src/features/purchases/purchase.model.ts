import type { PurchasePerson } from './purchase.types';

// Existing audit timestamps without a timezone are stored as UTC.
export function formatPurchaseDate(value: string | null) {
    if (!value) return '—';
    const timestamp = value.endsWith('Z') || /[+-]\d\d:\d\d$/.test(value) ? value : `${value}Z`;
    return new Date(timestamp).toLocaleString();
}

export function purchaseAuthorName(id: string | null, people: PurchasePerson[]) {
    if (!id) return 'Not recorded';
    const person = people.find(row => row.customer_id === id);
    return [person?.first_name?.trim(), person?.last_name?.trim()].filter(Boolean).join(' ')
        || person?.email?.trim() || 'Staff details unavailable';
}
