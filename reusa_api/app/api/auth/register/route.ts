import { parseBody, route } from "@/lib/http";
import { registerSchema } from "@/lib/schemas";
import { createSessionCookie, register } from "@/lib/services/auth";
import { setSessionCookie } from "@/lib/web/session";

export const POST = route(async (request) => {
  const { email, password, displayName, gender } = await parseBody(request, registerSchema);
  const result = await register(email, password, displayName, gender);
  try {
    const cookie = await createSessionCookie(result.tokens.idToken);
    await setSessionCookie(cookie);
  } catch (err) {
    console.warn("[auth/register] No se pudo crear cookie de sesión web (ignorable en móviles):", err);
  }
  return Response.json(result, { status: 201 });
});
