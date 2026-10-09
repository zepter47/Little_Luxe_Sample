import { canManageStore } from "../features/auth/auth.types";
import { createFileRoute, redirect } from '@tanstack/react-router'
import CategoryForm from '../features/Categories/Components/categoryForm'

export const Route = createFileRoute('/category')({
  beforeLoad: ({context}) => {
    if (!context.auth.isAuthenticated) throw redirect({to: "/login"});
    if (!canManageStore(context.auth)) throw redirect({to: "/"});
  },
  component: Category,
})

export function Category() {
  return(
    <div>
        <CategoryForm/>
    </div>
  )
}
