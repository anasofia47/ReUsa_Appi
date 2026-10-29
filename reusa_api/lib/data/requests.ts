import "server-only";
import { db } from "../firebase";
import { ApiError } from "../errors";
import { applyRequestAction, assertCanRequestItem } from "../domain/reusa-rules";
import type { AuthUser, ItemRequest, RequestAction, RequestStatus } from "../types";
import { ITEMS, toItem } from "./items";

export const REQUESTS = "requests";

function toRequest(id: string, data: Omit<ItemRequest, "id">): ItemRequest {
  return { id, ...data };
}

export async function createRequest(
  applicant: AuthUser,
  itemId: string,
  clientRequestId: string,
  applicantPhone: string,
  message: string,
): Promise<{ request: ItemRequest; created: boolean }> {
  const firestore = db();
  const requestId = `${applicant.uid}_${clientRequestId}`;
  const requestRef = firestore.collection(REQUESTS).doc(requestId);
  const itemRef = firestore.collection(ITEMS).doc(itemId);

  return firestore.runTransaction(async (tx) => {
    // 1. Idempotencia: si ya existe por clientRequestId, se devuelve la existente
    const existing = await tx.get(requestRef);
    if (existing.exists) {
      return { request: toRequest(existing.id, existing.data() as Omit<ItemRequest, "id">), created: false };
    }

    const [itemSnap, userRequestsSnap] = await Promise.all([
      tx.get(itemRef),
      tx.get(
        firestore
          .collection(REQUESTS)
          .where("itemId", "==", itemId)
          .where("applicantId", "==", applicant.uid),
      ),
    ]);

    if (!itemSnap.exists) throw new ApiError(404, "NOT_FOUND", "Objeto no encontrado");
    const item = toItem(itemSnap.id, itemSnap.data() as never);

    const activeUserRequests = userRequestsSnap.docs.map((d) => d.data() as ItemRequest);
    assertCanRequestItem(applicant, item, activeUserRequests);

    const now = new Date().toISOString();
    const data: Omit<ItemRequest, "id"> = {
      itemId,
      itemTitle: item.title,
      publisherId: item.publisherId,
      publisherEmail: item.publisherEmail,
      publisherName: item.publisherName,
      applicantId: applicant.uid,
      applicantEmail: applicant.email,
      applicantName: applicant.name,
      applicantPhone,
      message,
      status: "requested",
      clientRequestId,
      requestedAt: now,
      resolvedAt: null,
      deliveredAt: null,
      updatedAt: now,
    };

    tx.set(requestRef, data);
    return { request: toRequest(requestId, data), created: true };
  });
}

export async function listRequests(
  user: AuthUser,
  options: { type?: "all" | "sent" | "received"; status?: RequestStatus; updatedSince?: string } = {},
): Promise<ItemRequest[]> {
  const firestore = db();
  let query: FirebaseFirestore.Query = firestore.collection(REQUESTS);

  if (options.updatedSince) {
    query = query.where("updatedAt", ">", options.updatedSince);
  }

  const isPrivileged = user.role === "supervisor" || user.role === "admin";
  const type = options.type ?? (isPrivileged ? "all" : "received");

  if (type === "sent") {
    query = query.where("applicantId", "==", user.uid);
  } else if (type === "received") {
    query = query.where("publisherId", "==", user.uid);
  } else if (type === "all") {
    if (!isPrivileged) {
      throw new ApiError(403, "FORBIDDEN", "Solo supervisores o administradores pueden ver todas las solicitudes");
    }
  }

  if (options.status) {
    query = query.where("status", "==", options.status);
  }

  const snap = await query.get();
  const list = snap.docs.map((d) => toRequest(d.id, d.data() as Omit<ItemRequest, "id">));
  return list.sort((a, b) => b.requestedAt.localeCompare(a.requestedAt));
}

export async function getRequest(user: AuthUser, id: string): Promise<ItemRequest> {
  const snap = await db().collection(REQUESTS).doc(id).get();
  if (!snap.exists) throw new ApiError(404, "NOT_FOUND", "Solicitud no encontrada");
  const data = toRequest(snap.id, snap.data() as Omit<ItemRequest, "id">);

  const isParty = data.applicantId === user.uid || data.publisherId === user.uid;
  const isPrivileged = user.role === "supervisor" || user.role === "admin";

  if (!isParty && !isPrivileged) {
    throw new ApiError(404, "NOT_FOUND", "Solicitud no encontrada");
  }

  return data;
}

export async function transitionRequest(
  user: AuthUser,
  id: string,
  action: RequestAction,
): Promise<ItemRequest> {
  const firestore = db();
  const requestRef = firestore.collection(REQUESTS).doc(id);

  return firestore.runTransaction(async (tx) => {
    const snap = await tx.get(requestRef);
    if (!snap.exists) throw new ApiError(404, "NOT_FOUND", "Solicitud no encontrada");
    const current = toRequest(snap.id, snap.data() as Omit<ItemRequest, "id">);

    const isOwner = current.publisherId === user.uid;
    const isAdmin = user.role === "admin";
    if (!isOwner && !isAdmin) {
      throw new ApiError(403, "FORBIDDEN", "Solo el dueño de la publicación o un administrador puede responder a esta solicitud");
    }

    const now = new Date();
    const result = applyRequestAction(current, action, now);
    const nowIso = now.toISOString();

    tx.update(requestRef, {
      ...result,
      updatedAt: nowIso,
    });

    // Si se entrega, marcamos el objeto como no disponible y rechazamos las otras solicitudes pendientes
    if (action === "deliver") {
      const itemRef = firestore.collection(ITEMS).doc(current.itemId);
      tx.update(itemRef, {
        available: false,
        updatedAt: nowIso,
      });

      // Rechazar otras peticiones que estaban esperando este mismo objeto
      const othersSnap = await tx.get(
        firestore
          .collection(REQUESTS)
          .where("itemId", "==", current.itemId)
          .where("status", "in", ["requested", "approved"]),
      );

      for (const otherDoc of othersSnap.docs) {
        if (otherDoc.id !== current.id) {
          tx.update(otherDoc.ref, {
            status: "rejected",
            resolvedAt: nowIso,
            updatedAt: nowIso,
          });
        }
      }
    }

    return { ...current, ...result, updatedAt: nowIso };
  });
}
