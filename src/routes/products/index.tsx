import { canManageStore } from "../../features/auth/auth.types";
import { createFileRoute } from '@tanstack/react-router'
import Header from '../../components/Header'
import ProductForm from '../../features/products/components/ProductForm'
import ProductGrid from '../../features/products/components/ProductGrid'

export const Route = createFileRoute('/products/')({
  component: Products,
})

function Products() {
  const {auth} = Route.useRouteContext();
  return (
    <>
    <Header/>

    <div>
      {canManageStore(auth) && <ProductForm/>}
      <ProductGrid/>
    </div>
    </>

  )
}
