import { markNotificationRead } from "@/lib/data/notifications";
import { requireUser } from "@/lib/guard";
import { route } from "@/lib/http";

export const PATCH = route<{ params: Promise<{ id: string }> }>(async (request, context) => {
  const user = await requireUser(request);
  const { id } = await context.params;
  await markNotificationRead(id, user);
  return Response.json({ ok: true });
});
