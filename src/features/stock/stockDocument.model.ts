export type DocumentLine = {
    key: string; item_id: string; order_details_id: string;
    quantity: string; unit_price: string; batch_number: string; expiry_date: string;
};

export function newDocumentLine(): DocumentLine {
    return {key: crypto.randomUUID(), item_id: '', order_details_id: '', quantity: '1', unit_price: '', batch_number: '', expiry_date: ''};
}

export function lineTotal(line: DocumentLine) {
    const quantity = Number(line.quantity), price = Number(line.unit_price);
    return Number.isFinite(quantity) && Number.isFinite(price) ? Math.round(price * 100) * quantity / 100 : 0;
}

export function validateDocumentLines(lines: DocumentLine[], isReturn: boolean) {
    if (!lines.length) return 'Add at least one item before saving.';
    for (const [index, line] of lines.entries()) {
        const prefix = `Item ${index + 1}: `;
        if (!line.item_id || (isReturn && !line.order_details_id)) return prefix + 'select an item.';
        if (!/^\d+$/.test(line.quantity) || Number(line.quantity) < 1 || Number(line.quantity) > 2147483647) return prefix + 'quantity must be a positive whole number.';
        if (!isReturn && (!/^\d+(\.\d{1,2})?$/.test(line.unit_price) || !Number.isFinite(Number(line.unit_price)))) return prefix + 'enter a nonnegative price with up to two decimal places.';
    }
    return '';
}

export function documentLinesPayload(lines: DocumentLine[]) {
    return lines.map(line => ({item_id: line.item_id, order_details_id: line.order_details_id || null,
        quantity: Number(line.quantity), unit_price: Number(line.unit_price),
        batch_number: line.batch_number.trim() || null, expiry_date: line.expiry_date || null}));
}

export type DocumentLineInput = ReturnType<typeof documentLinesPayload>[number];
