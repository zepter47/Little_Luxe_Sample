import type { Customer } from './customer.types';

export function customerDisplayName(customer: Pick<Customer, 'first_name' | 'last_name' | 'email'>) {
    return [customer.first_name?.trim(), customer.last_name?.trim()].filter(Boolean).join(' ')
        || customer.email?.trim() || 'Customer details unavailable';
}
