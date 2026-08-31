export type Route = "home" | "chat" | "dashboard";

const routes: Record<string, Route> = {
  "": "home",
  "/": "home",
  "/chat": "chat",
  "/dashboard": "dashboard",
};

export function parseHash(): Route {
  const h = window.location.hash.replace(/^#/, "");
  return routes[h] ?? "home";
}

export function navigate(route: Route) {
  window.location.hash = route === "home" ? "/" : `/${route}`;
}
