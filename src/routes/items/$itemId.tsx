import { createFileRoute } from "@tanstack/react-router";
import ItemDetails from "../../features/items/components/ItemDetails";

export const Route = createFileRoute("/items/$itemId")({component: ItemPage});
function ItemPage() {
    const {itemId} = Route.useParams();
    return <ItemDetails key={itemId} itemId={itemId} />;
}
