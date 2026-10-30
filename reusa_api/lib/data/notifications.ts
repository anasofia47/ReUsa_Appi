import "server-only";
import { db } from "../firebase";
import type { Notification, Role } from "../types";

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
  const usersSnap = await firestore.collection("users").where("role", "in", roles).get();

  const batch = firestore.batch();
  const now = new Date().toISOString();

  for (const userDoc of usersSnap.docs) {
    const notifRef = firestore.collection(NOTIFICATIONS).doc();
    batch.set(notifRef, {
      userId: userDoc.id,
      title: data.title,
      message: data.message,
      type: data.type,
      targetPath: data.targetPath,
      read: false,
      createdAt: now,
    });
  }

  await batch.commit();
}

export async function listUserNotifications(userId: string): Promise<{
  notifications: Notification[];
  unreadCount: number;
}> {
  const firestore = db();
  const snap = await firestore
    .collection(NOTIFICATIONS)
    .where("userId", "==", userId)
    .get();

  const notifications = snap.docs
    .map((d) => toNotification(d.id, d.data() as Omit<Notification, "id">))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const unreadCount = notifications.filter((n) => !n.read).length;
  return { notifications, unreadCount };
}

export async function markNotificationRead(id: string, userId: string): Promise<void> {
  const firestore = db();
  const docRef = firestore.collection(NOTIFICATIONS).doc(id);
  const snap = await docRef.get();
  if (snap.exists && snap.data()?.userId === userId) {
    await docRef.update({ read: true });
  }
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  const firestore = db();
  const snap = await firestore
    .collection(NOTIFICATIONS)
    .where("userId", "==", userId)
    .where("read", "==", false)
    .get();

  if (snap.empty) return;
  const batch = firestore.batch();
  for (const doc of snap.docs) {
    batch.update(doc.ref, { read: true });
  }
  await batch.commit();
}
