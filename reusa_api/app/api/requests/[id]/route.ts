import { getRequest, transitionRequest } from "@/lib/data/requests";
import { requireUser } from "@/lib/guard";
import { parseBody, route } from "@/lib/http";
import { requestActionSchema } from "@/lib/schemas";

export const GET = route(async (request, ctx: RouteContext<"/api/requests/[id]">) => {
  const user = await requireUser(request);
  const { id } = await ctx.params;
  return Response.json({ request: await getRequest(user, id) });
});

export const PATCH = route(async (request, ctx: RouteContext<"/api/requests/[id]">) => {
  const user = await requireUser(request);
  const { id } = await ctx.params;
  const { action } = await parseBody(request, requestActionSchema);

  const updated = await transitionRequest(user, id, action);
  return Response.json({ request: updated });
});
