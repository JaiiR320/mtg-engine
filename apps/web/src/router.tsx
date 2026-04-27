import { createRootRoute, createRoute, createRouter, Link, Outlet } from "@tanstack/react-router";
import { App, GamePage, HomePage } from "./App.js";

const rootRoute = createRootRoute({
  component: () => (
    <App>
      <Outlet />
    </App>
  ),
});

const homeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: HomePage,
});

const gameRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/games/$gameId",
  component: GamePage,
});

const notFoundRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "*",
  component: () => (
    <section className="table-pane">
      <div className="hero-card">
        <h1>Not Found</h1>
        <Link to="/">Create a game</Link>
      </div>
    </section>
  ),
});

const routeTree = rootRoute.addChildren([homeRoute, gameRoute, notFoundRoute]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
