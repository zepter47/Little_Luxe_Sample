export function prepareUnitRows<T>(rows: T[], search: string, getSearchText: (row: T) => string,
    sortField: string | undefined, direction: 'asc' | 'desc' | null | undefined,
    getSortValue: (row: T, field: string) => string | number) {
    const term = search.trim().toLocaleLowerCase();
    const visible = term ? rows.filter(row => getSearchText(row).toLocaleLowerCase().includes(term)) : [...rows];
    if (sortField && direction) {
        visible.sort((a, b) => {
            const left = getSortValue(a, sortField);
            const right = getSortValue(b, sortField);
            const result = typeof left === 'number' && typeof right === 'number'
                ? left - right : String(left).localeCompare(String(right), undefined, {numeric: true, sensitivity: 'base'});
            return direction === 'asc' ? result : -result;
        });
    }
    return visible;
}

export function clampUnitPage(page: number, pageSize: number, count: number) {
    return Math.min(page, Math.max(0, Math.ceil(count / pageSize) - 1));
}
