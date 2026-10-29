import { getItem } from "@/lib/data/items";
import { requireUser } from "@/lib/guard";
import { route } from "@/lib/http";

export const GET = route(async (request, ctx: RouteContext<"/api/items/[id]">) => {
  await requireUser(request);
  const { id } = await ctx.params;
  return Response.json({ item: await getItem(id) });
});
