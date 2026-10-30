import { parseBody, route } from "@/lib/http";
import { loginSchema } from "@/lib/schemas";
import { createSessionCookie, login } from "@/lib/services/auth";
import { setSessionCookie } from "@/lib/web/session";

export const POST = route(async (request) => {
  const { email, password } = await parseBody(request, loginSchema);
  const result = await login(email, password);
  try {
    const cookie = await createSessionCookie(result.tokens.idToken);
    await setSessionCookie(cookie);
  } catch (err) {
    console.warn("[auth/login] No se pudo crear cookie de sesión web (ignorable en móviles):", err);
  }
  return Response.json(result);
});
