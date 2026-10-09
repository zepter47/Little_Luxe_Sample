import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { anonymousAuth } from "./features/auth/auth.types";

export const router = createRouter({
    routeTree,
    basepath: import.meta.env.BASE_URL,
    scrollRestoration: true,
    context: {auth: anonymousAuth},
});

declare module "@tanstack/react-router" {
    interface Register { router: typeof router }
}
