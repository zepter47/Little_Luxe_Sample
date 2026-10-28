import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { canManageStore } from "../features/auth/auth.types";
import CategoryForm from "../features/Categories/Components/CategoryForm";
export const Route = createFileRoute("/category")({
    beforeLoad: ({context}) => {
        if (!context.auth.isAuthenticated) throw redirect({to: "/login"});
        if (!canManageStore(context.auth)) throw redirect({to: "/"});
    },
    component: Category,
});
function Category() {
    const navigate = useNavigate();
    const close = () => {void navigate({to: "/admin/categories"});};
    return <CategoryForm onSaved={close} onCancel={close} />;
}
