import { createFileRoute, redirect } from '@tanstack/react-router';
import { canManageStore } from '../features/auth/auth.types';
import StockManagement from '../features/stock/StockManagement';

export const Route = createFileRoute('/stock-management')({
    beforeLoad: ({context}) => {
        if (!context.auth.isAuthenticated) throw redirect({to: '/login'});
        if (!canManageStore(context.auth)) throw redirect({to: '/'});
    },
    component: StockManagement,
});
