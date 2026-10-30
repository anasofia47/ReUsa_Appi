import { listUserNotifications, markAllNotificationsRead } from "@/lib/data/notifications";
import { requireUser } from "@/lib/guard";
import { route } from "@/lib/http";

export const GET = route(async (request) => {
  const user = await requireUser(request);
  const { notifications, unreadCount } = await listUserNotifications(user.uid);
  return Response.json({ notifications, unreadCount });
});

export const POST = route(async (request) => {
  const user = await requireUser(request);
  await markAllNotificationsRead(user.uid);
  return Response.json({ ok: true });
});
