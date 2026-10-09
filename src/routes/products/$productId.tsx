import { createFileRoute } from '@tanstack/react-router'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../services/db/database'

export const Route = createFileRoute('/products/$productId')({
  component: ProductDetailPage,
})

function ProductDetailPage() {

const{productId} = Route.useParams();

const product = useLiveQuery(() => db.productsStore.get(Number(productId)), [productId])

  return (
    <>
    <h1>{product?.name}</h1>
    <h5>UGX {product?.price}</h5>

    <p>{product?.description}</p>
    </>

  )
}