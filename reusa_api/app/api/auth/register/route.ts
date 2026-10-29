import { parseBody, route } from "@/lib/http";
import { registerSchema } from "@/lib/schemas";
import { register } from "@/lib/services/auth";

export const POST = route(async (request) => {
  const { email, password, displayName, gender } = await parseBody(request, registerSchema);
  return Response.json(await register(email, password, displayName, gender), { status: 201 });
});
