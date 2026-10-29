import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifySessionCookie, SESSION_MAX_AGE_MS } from "../services/auth";
import type { AuthUser, Role } from "../types";

export const SESSION_COOKIE = "reusa_session";

export async function setSessionCookie(value: string): Promise<void> {
  (await cookies()).set(SESSION_COOKIE, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_MS / 1000,
  });
}

export async function clearSessionCookie(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}

export const getWebUser = cache(async (): Promise<AuthUser | null> => {
  const value = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!value) return null;
  try {
    return await verifySessionCookie(value);
  } catch {
    return null;
  }
});

export async function requireWebUser(allowedRoles?: Role | Role[]): Promise<AuthUser> {
  const user = await getWebUser();
  if (!user) redirect("/login");

  if (allowedRoles) {
    const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];
    if (!roles.includes(user.role)) {
      redirect("/items");
    }
  }

  return user;
}
