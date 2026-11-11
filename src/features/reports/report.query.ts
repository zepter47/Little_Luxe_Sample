import { queryOptions } from '@tanstack/react-query';
import { getDailySalesReport, getWeeklySalesReport, getMonthlySalesReport } from './report.api';
import type { ReportPeriod } from './report.types';
export const salesReportQueryOptions = (userId: string, date: string, period: ReportPeriod) => queryOptions({
    queryKey: ['reports', 'sales', userId, period, date],
    queryFn: () => {
        switch (period) {
            case 'daily': return getDailySalesReport(date);
            case 'weekly': return getWeeklySalesReport(date);
            case 'monthly': return getMonthlySalesReport(date);
        }
    },
    enabled: !!userId,
    refetchInterval: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
});
