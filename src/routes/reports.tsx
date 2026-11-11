import { createFileRoute, redirect } from '@tanstack/react-router';
import { canManageStore } from '../features/auth/auth.types';
import Reports from '../features/reports/Reports';
export const Route = createFileRoute('/reports')({
    beforeLoad: ({context}) => {
        if (!context.auth.isAuthenticated) throw redirect({to: '/login'});
        if (!canManageStore(context.auth)) throw redirect({to: '/'});
    },
    component: ReportsRoute,
});
function ReportsRoute() {
    const {auth} = Route.useRouteContext();
    return <Reports key={auth.userId} userId={auth.userId!} />;
}
