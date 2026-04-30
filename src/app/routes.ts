export interface AppRouteDefinition {
  readonly id: string;
  readonly label: string;
  readonly path: AppRoutePath;
}

export const appRoutes = [
  { id: "arena", label: "Arena", path: "/arena" },
  { id: "animations", label: "Animations", path: "/animations" },
  { id: "login", label: "Login", path: "/login" },
  { id: "profile", label: "Profile", path: "/profile" },
  { id: "messages", label: "Messages", path: "/messages" },
  { id: "settings", label: "Settings", path: "/settings" },
] as const;

export type AppRoutePath = (typeof appRoutes)[number]["path"];

export const defaultRoutePath: AppRoutePath = "/arena";

const routePaths = new Set<AppRoutePath>(
  appRoutes.map((route) => route.path),
);

export function normalizeRoutePath(pathname: string): AppRoutePath {
  const withoutTrailingSlash = pathname.replace(/\/+$/, "");
  const normalizedPath = withoutTrailingSlash === "" ? "/" : withoutTrailingSlash;

  if (normalizedPath === "/") {
    return defaultRoutePath;
  }

  if (routePaths.has(normalizedPath as AppRoutePath)) {
    return normalizedPath as AppRoutePath;
  }

  return defaultRoutePath;
}

export function getRouteByPath(path: AppRoutePath): AppRouteDefinition {
  const route = appRoutes.find((candidate) => candidate.path === path);

  if (!route) {
    throw new Error(`Unknown app route: ${path}`);
  }

  return route;
}
