import "server-only";
import { db } from "../firebase";
import { ApiError } from "../errors";
import { applyReviewAction } from "../domain/reusa-rules";
import type { AuthUser, Item, ItemStatus, ReviewAction } from "../types";

export const ITEMS = "items";
export const ITEM_COVERS = "itemCovers";

type ItemDoc = Omit<Item, "id" | "coverUrl"> & { coverVersion?: number };

export function toItem(id: string, data: ItemDoc): Item {
  const { coverVersion = 0, ...rest } = data;
  return {
    id,
    ...rest,
    coverUrl: coverVersion > 0 ? `/api/items/${id}/cover?v=${coverVersion}` : null,
  };
}

export interface ItemFilter {
  q?: string;
  category?: string;
  status?: ItemStatus;
  updatedSince?: string;
  publisherId?: string;
}

const normalize = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

export async function listItems(user?: AuthUser, filter: ItemFilter = {}): Promise<Item[]> {
  let query: FirebaseFirestore.Query = db().collection(ITEMS);

  if (filter.updatedSince) {
    query = query.where("updatedAt", ">", filter.updatedSince);
  }

  const snap = await query.get();
  let items = snap.docs.map((d) => toItem(d.id, d.data() as ItemDoc));

  // Filtro por rol / visibilidad:
  // Si no es supervisor ni admin, por defecto solo ve los objetos aprobados (a menos que consulte sus propios objetos publicados)
  const isPrivileged = user?.role === "supervisor" || user?.role === "admin";

  if (filter.publisherId) {
    items = items.filter((i) => i.publisherId === filter.publisherId);
  } else if (filter.status) {
    if (!isPrivileged && filter.status !== "approved") {
      throw new ApiError(403, "FORBIDDEN", "Solo supervisores o administradores pueden filtrar por estados pendientes o rechazados");
    }
    items = items.filter((i) => i.status === filter.status);
  } else if (!isPrivileged) {
    // Para usuarios regulares o app móvil: solo objetos aprobados
    items = items.filter((i) => i.status === "approved");
  }

  if (filter.category) {
    items = items.filter((i) => i.category.toLowerCase() === filter.category!.toLowerCase());
  }

  if (filter.q) {
    const q = normalize(filter.q);
    items = items.filter((i) => normalize(`${i.title} ${i.description} ${i.category}`).includes(q));
  }

  return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getItem(id: string): Promise<Item> {
  const snap = await db().collection(ITEMS).doc(id).get();
  if (!snap.exists) {
    throw new ApiError(404, "NOT_FOUND", "Objeto no encontrado");
  }
  return toItem(snap.id, snap.data() as ItemDoc);
}

export async function listCategories(): Promise<string[]> {
  const snap = await db().collection(ITEMS).get();
  const categories = snap.docs.map((d) => (d.data() as ItemDoc).category).filter(Boolean);
  return [...new Set(categories)].sort((a, b) => a.localeCompare(b, "es"));
}

export async function createItem(
  user: AuthUser,
  data: {
    title: string;
    description: string;
    category: string;
    condition: string;
    deliveryPoint: string;
    cover?: {
      contentType: string;
      data: string;
    };
  },
): Promise<Item> {
  const firestore = db();
  const slug = `${normalize(data.title).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")}-${Date.now().toString(36)}`;
  const itemRef = firestore.collection(ITEMS).doc(slug);
  const coverRef = firestore.collection(ITEM_COVERS).doc(slug);
  const now = new Date().toISOString();

  const hasCover = Boolean(data.cover?.data && data.cover?.contentType);

  if (hasCover && data.cover) {
    await coverRef.set({
      contentType: data.cover.contentType,
      data: data.cover.data,
      updatedAt: now,
    });
  }

  const itemDoc: ItemDoc = {
    title: data.title,
    description: data.description,
    category: data.category,
    condition: data.condition,
    deliveryPoint: data.deliveryPoint,
    publisherId: user.uid,
    publisherEmail: user.email,
    publisherName: user.name,
    publisherGender: user.gender ?? "otro",
    status: "pending_approval", // Requiere aprobación del supervisor
    available: true,
    coverVersion: hasCover ? 1 : 0,
    reviewedBy: null,
    reviewedAt: null,
    rejectionReason: null,
    createdAt: now,
    updatedAt: now,
  };

  await itemRef.set(itemDoc);
  return toItem(slug, itemDoc);
}

export async function reviewItem(
  supervisor: AuthUser,
  itemId: string,
  action: ReviewAction,
  reason?: string,
): Promise<Item> {
  const firestore = db();
  const itemRef = firestore.collection(ITEMS).doc(itemId);

  return firestore.runTransaction(async (tx) => {
    const snap = await tx.get(itemRef);
    if (!snap.exists) throw new ApiError(404, "NOT_FOUND", "Objeto no encontrado");
    const current = snap.data() as ItemDoc;

    const result = applyReviewAction(current, action, supervisor.uid, new Date(), reason);
    const now = new Date().toISOString();

    tx.update(itemRef, {
      status: result.status,
      reviewedBy: result.reviewedBy,
      reviewedAt: result.reviewedAt,
      rejectionReason: result.rejectionReason,
      updatedAt: now,
    });

    return toItem(itemId, { ...current, ...result, updatedAt: now });
  });
}

export async function saveItemCover(
  itemId: string,
  contentType: string,
  data: string,
): Promise<Item> {
  const firestore = db();
  const itemRef = firestore.collection(ITEMS).doc(itemId);
  const coverRef = firestore.collection(ITEM_COVERS).doc(itemId);

  await firestore.runTransaction(async (tx) => {
    const snap = await tx.get(itemRef);
    if (!snap.exists) throw new ApiError(404, "NOT_FOUND", "Objeto no encontrado");
    const current = snap.data() as ItemDoc;
    const now = new Date().toISOString();

    tx.set(coverRef, { contentType, data, updatedAt: now });
    tx.update(itemRef, {
      coverVersion: (current.coverVersion ?? 0) + 1,
      updatedAt: now,
    });
  });

  return getItem(itemId);
}

export async function getItemCover(
  itemId: string,
): Promise<{ contentType: string; bytes: Buffer }> {
  const snap = await db().collection(ITEM_COVERS).doc(itemId).get();
  if (!snap.exists) throw new ApiError(404, "NOT_FOUND", "El objeto no tiene imagen");
  const { contentType, data } = snap.data() as { contentType: string; data: string };
  return { contentType, bytes: Buffer.from(data, "base64") };
}
