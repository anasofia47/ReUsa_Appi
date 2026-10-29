import { reviewItem } from "@/lib/data/items";
import { assertRole, requireUser } from "@/lib/guard";
import { parseBody, route } from "@/lib/http";
import { reviewItemSchema } from "@/lib/schemas";

export const PATCH = route(async (request, ctx: RouteContext<"/api/items/[id]/review">) => {
  const user = await requireUser(request);
  assertRole(user, ["supervisor", "admin"]);
  const { id } = await ctx.params;
  const { action, reason } = await parseBody(request, reviewItemSchema);

  const updated = await reviewItem(user, id, action, reason);
  return Response.json({ item: updated });
});
