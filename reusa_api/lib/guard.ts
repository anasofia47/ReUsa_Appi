import "server-only";
import { ApiError } from "./errors";
import { verifyIdToken, verifySessionCookie } from "./services/auth";
import type { AuthUser, Role } from "./types";

export async function requireUser(request: Request): Promise<AuthUser> {
  const header = request.headers.get("authorization") ?? "";
  const [scheme, token] = header.split(" ");
  if (scheme?.toLowerCase() === "bearer" && token) {
    return verifyIdToken(token);
  }

  // Soporte para sesión web por cookie (cuando se llama desde fetch() en el navegador)
  const cookieHeader = request.headers.get("cookie") ?? "";
  const match = cookieHeader.match(/reusa_session=([^;]+)/);
  if (match?.[1]) {
    return verifySessionCookie(decodeURIComponent(match[1]));
  }

  throw new ApiError(401, "UNAUTHENTICATED", "Falta el token de autenticación");
}

export function assertRole(user: AuthUser, roles: Role | Role[]): void {
  const allowed = Array.isArray(roles) ? roles : [roles];
  if (!allowed.includes(user.role)) {
    throw new ApiError(403, "FORBIDDEN", "No tienes permisos para esta acción");
  }
}
