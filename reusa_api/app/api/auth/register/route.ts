import { NextResponse } from "next/server";
import { parseBody, route } from "@/lib/http";
import { registerSchema } from "@/lib/schemas";
import { createSessionCookie, register, SESSION_MAX_AGE_MS } from "@/lib/services/auth";
import { SESSION_COOKIE } from "@/lib/web/session";

export const POST = route(async (request) => {
  const { email, password, displayName, gender } = await parseBody(request, registerSchema);
  const result = await register(email, password, displayName, gender);
  const response = NextResponse.json(result, { status: 201 });
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
    console.warn("[auth/register] No se pudo adjuntar cookie web:", err);
  }
  return response;
});
