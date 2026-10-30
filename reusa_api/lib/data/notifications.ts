import "server-only";
import { db } from "../firebase";
import type { AuthUser, Notification, Role } from "../types";

export const NOTIFICATIONS = "notifications";

function toNotification(id: string, data: Omit<Notification, "id">): Notification {
  return { id, ...data };
}

export async function createNotification(data: {
  userId: string;
  title: string;
  message: string;
  type: Notification["type"];
  targetPath: string;
}): Promise<Notification> {
  const firestore = db();
  const docRef = firestore.collection(NOTIFICATIONS).doc();
  const payload: Omit<Notification, "id"> = {
    userId: data.userId,
    title: data.title,
    message: data.message,
    type: data.type,
    targetPath: data.targetPath,
    read: false,
    readBy: [],
    createdAt: new Date().toISOString(),
  };

  await docRef.set(payload);
  return toNotification(docRef.id, payload);
}

export async function notifyUsersWithRoles(
  roles: Role[],
  data: {
    title: string;
    message: string;
    type: Notification["type"];
    targetPath: string;
  },
): Promise<void> {
  const firestore = db();
  const now = new Date().toISOString();

  // Una única notificación por targetRole para supervisores/administradores (evita duplicados)
  const targetRole = roles.includes("supervisor") ? "supervisor" : roles[0];

  await firestore.collection(NOTIFICATIONS).add({
    targetRole,
    title: data.title,
    message: data.message,
    type: data.type,
    targetPath: data.targetPath,
    read: false,
    readBy: [],
    createdAt: now,
  });
}

export async function listUserNotifications(user: AuthUser): Promise<{
  notifications: Notification[];
  unreadCount: number;
}> {
  const firestore = db();
  const queries = [
    firestore.collection(NOTIFICATIONS).where("userId", "==", user.uid).get(),
  ];

  if (user.role === "supervisor" || user.role === "admin") {
    queries.push(
      firestore.collection(NOTIFICATIONS).where("targetRole", "==", "supervisor").get(),
    );
    if (user.role === "admin") {
      queries.push(
        firestore.collection(NOTIFICATIONS).where("targetRole", "==", "admin").get(),
      );
    }
  }

  const snaps = await Promise.all(queries);
  const seenIds = new Set<string>();
  const seenFingerprints = new Set<string>();
  const notifications: Notification[] = [];

  for (const snap of snaps) {
    for (const doc of snap.docs) {
      if (seenIds.has(doc.id)) continue;
      seenIds.add(doc.id);
      const data = doc.data();

      // Deduplicar notificaciones con el mismo contenido y ruta (p. ej. si se guardó tanto por targetRole como por UID)
      const fingerprint = `${data.title}|${data.message}|${data.targetPath}|${(data.createdAt || "").slice(0, 16)}`;
      if (seenFingerprints.has(fingerprint)) continue;
      seenFingerprints.add(fingerprint);

      const readBy = (data.readBy as string[]) || [];
      const isRead = Boolean(data.read || (user.uid && readBy.includes(user.uid)));

      notifications.push({
        id: doc.id,
        userId: data.userId ?? user.uid,
        targetRole: data.targetRole,
        title: data.title,
        message: data.message,
        type: data.type,
        targetPath: data.targetPath,
        read: isRead,
        readBy,
        createdAt: data.createdAt ?? new Date().toISOString(),
      });
    }
  }

  notifications.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const unreadCount = notifications.filter((n) => !n.read).length;
  return { notifications, unreadCount };
}

export async function markNotificationRead(id: string, user: AuthUser): Promise<void> {
  const firestore = db();
  const docRef = firestore.collection(NOTIFICATIONS).doc(id);
  const snap = await docRef.get();
  if (!snap.exists) return;

  const data = snap.data();
  if (data?.targetRole) {
    const readBy = (data.readBy as string[]) || [];
    if (!readBy.includes(user.uid)) {
      await docRef.update({
        readBy: [...readBy, user.uid],
        read: true,
      });
    }
  } else if (data?.userId === user.uid) {
    await docRef.update({ read: true });
  }
}

export async function markAllNotificationsRead(user: AuthUser): Promise<void> {
  const firestore = db();
  const { notifications } = await listUserNotifications(user);
  if (notifications.length === 0) return;

  const batch = firestore.batch();
  for (const n of notifications) {
    if (!n.read) {
      const docRef = firestore.collection(NOTIFICATIONS).doc(n.id);
      if (n.targetRole) {
        const readBy = n.readBy || [];
        batch.update(docRef, { readBy: [...readBy, user.uid], read: true });
      } else {
        batch.update(docRef, { read: true });
      }
    }
  }

  await batch.commit();
}
