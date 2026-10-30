import { NextResponse } from "next/server";
import { parseBody, route } from "@/lib/http";
import { loginSchema } from "@/lib/schemas";
import { createSessionCookie, login, SESSION_MAX_AGE_MS } from "@/lib/services/auth";
import { SESSION_COOKIE } from "@/lib/web/session";

export const POST = route(async (request) => {
  const { email, password } = await parseBody(request, loginSchema);
  const result = await login(email, password);
  const response = NextResponse.json(result);
  try {
    const cookie = await createSessionCookie(result.tokens.idToken);
    response.cookies.set(SESSION_COOKIE, cookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_MAX_AGE_MS / 1000,
    });
  } catch (err) {
    console.warn("[auth/login] No se pudo adjuntar cookie web:", err);
  }
  return response;
});
