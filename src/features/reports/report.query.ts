import { queryOptions } from '@tanstack/react-query';
import { getSalesReport } from './report.api';
export const salesReportQueryOptions = (userId: string, start: string, end: string) => queryOptions({
    queryKey: ['reports', 'sales', userId, start, end],
    queryFn: () => getSalesReport(start, end), enabled: !!userId, refetchInterval: 60000,
});
