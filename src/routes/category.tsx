import { createFileRoute } from '@tanstack/react-router'
import CategoryForm from '../features/Categories/Components/categoryForm'

export const Route = createFileRoute('/category')({
  component: Category,
})

export function Category() {
  return(
    <div>
        <CategoryForm/>
    </div>
  )
}
