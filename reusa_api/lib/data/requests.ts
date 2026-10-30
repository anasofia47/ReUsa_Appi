import "server-only";
import { db } from "../firebase";
import { ApiError } from "../errors";
import { applyRequestAction, assertCanRequestItem } from "../domain/reusa-rules";
import type { AuthUser, ItemRequest, RequestAction, RequestStatus } from "../types";
import { ITEMS, toItem } from "./items";
import { createNotification } from "./notifications";

export const REQUESTS = "requests";

function toRequest(id: string, data: Omit<ItemRequest, "id">): ItemRequest {
  return {
    id,
    ...data,
    userId: data.applicantId,
    userEmail: data.applicantEmail,
    userName: data.applicantName,
    rejectionReason: (data as any).rejectionReason ?? null,
  };
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

  const out = await firestore.runTransaction(async (tx) => {
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

  if (out.created) {
    // Notificar al donante que recibió una solicitud
    createNotification({
      userId: out.request.publisherId,
      title: "Nueva solicitud de donación",
      message: `${applicant.name} solicitó tu objeto "${out.request.itemTitle}".`,
      targetPath: "/requests",
      type: "item_requested",
    }).catch((err) => console.error("Error enviando notificación:", err));
  }

  return out;
}

export async function listRequests(
  user: AuthUser,
  options: { type?: "all" | "sent" | "received"; status?: RequestStatus; updatedSince?: string } = {},
): Promise<ItemRequest[]> {
  const firestore = db();
  const isPrivileged = user.role === "supervisor" || user.role === "admin";

  // Si no se especifica 'type' y es un estudiante, retornar tanto las peticiones recibidas como las enviadas
  if (!options.type && !isPrivileged) {
    let qReceived = firestore.collection(REQUESTS).where("publisherId", "==", user.uid);
    let qSent = firestore.collection(REQUESTS).where("applicantId", "==", user.uid);

    if (options.updatedSince) {
      qReceived = qReceived.where("updatedAt", ">", options.updatedSince);
      qSent = qSent.where("updatedAt", ">", options.updatedSince);
    }
    if (options.status) {
      qReceived = qReceived.where("status", "==", options.status);
      qSent = qSent.where("status", "==", options.status);
    }

    const [receivedSnap, sentSnap] = await Promise.all([qReceived.get(), qSent.get()]);
    const seen = new Set<string>();
    const list: ItemRequest[] = [];
    for (const d of [...receivedSnap.docs, ...sentSnap.docs]) {
      if (!seen.has(d.id)) {
        seen.add(d.id);
        list.push(toRequest(d.id, d.data() as Omit<ItemRequest, "id">));
      }
    }
    return list.sort((a, b) => b.requestedAt.localeCompare(a.requestedAt));
  }

  let query: FirebaseFirestore.Query = firestore.collection(REQUESTS);

  if (options.updatedSince) {
    query = query.where("updatedAt", ">", options.updatedSince);
  }

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

  interface AutoRejected {
    applicantId: string;
    itemTitle: string;
  }
  const autoRejectedList: AutoRejected[] = [];

  const out = await firestore.runTransaction(async (tx) => {
    const snap = await tx.get(requestRef);
    if (!snap.exists) throw new ApiError(404, "NOT_FOUND", "Solicitud no encontrada");
    const current = toRequest(snap.id, snap.data() as Omit<ItemRequest, "id">);

    const isOwner = current.publisherId === user.uid;
    const isAdmin = user.role === "admin";
    if (!isOwner && !isAdmin) {
      throw new ApiError(403, "FORBIDDEN", "Solo el dueño de la publicación o un administrador puede responder a esta solicitud");
    }

    // Firestore requiere que todas las lecturas se ejecuten antes de cualquier escritura
    let othersDocs: FirebaseFirestore.QueryDocumentSnapshot[] = [];
    if (action === "approve" || action === "deliver") {
      const othersSnap = await tx.get(
        firestore
          .collection(REQUESTS)
          .where("itemId", "==", current.itemId)
          .where("status", "in", ["requested", "approved", "delivered"]),
      );
      othersDocs = othersSnap.docs;
    }

    // Si se intenta aceptar ('approve'), impedir si el objeto ya fue aceptado o entregado a otra persona
    if (action === "approve") {
      const alreadyCommitted = othersDocs.some(
        (d) => d.id !== current.id && (d.data().status === "approved" || d.data().status === "delivered"),
      );
      if (alreadyCommitted) {
        throw new ApiError(409, "ITEM_NOT_AVAILABLE", "Este objeto ya fue aceptado o donado a otro estudiante");
      }
    }

    const now = new Date();
    const result = applyRequestAction(current, action, now);
    const nowIso = now.toISOString();

    tx.update(requestRef, {
      ...result,
      updatedAt: nowIso,
    });

    // Si se aprueba la donación o se entrega, marcamos el objeto como no disponible (oculto del catálogo)
    if (action === "approve" || action === "deliver") {
      const itemRef = firestore.collection(ITEMS).doc(current.itemId);
      tx.update(itemRef, {
        available: false,
        updatedAt: nowIso,
      });
    }

    // Al aceptar (approve) o entregar (deliver), rechazar automáticamente cualquier otra petición de este objeto
    if (action === "approve" || action === "deliver") {
      for (const otherDoc of othersDocs) {
        if (otherDoc.id !== current.id && otherDoc.data().status === "requested") {
          tx.update(otherDoc.ref, {
            status: "rejected",
            rejectionReason: "Objeto ya donado a otro solicitante",
            resolvedAt: nowIso,
            updatedAt: nowIso,
          });
          const d = otherDoc.data();
          autoRejectedList.push({ applicantId: d.applicantId, itemTitle: d.itemTitle });
        }
      }
    }

    return { ...current, ...result, updatedAt: nowIso };
  });

  // Notificar a los otros solicitantes que el objeto ya fue asignado/donado
  for (const rejected of autoRejectedList) {
    createNotification({
      userId: rejected.applicantId,
      title: "Objeto ya donado a otro solicitante",
      message: `El objeto "${rejected.itemTitle}" que solicitaste fue asignado y donado a otro estudiante.`,
      targetPath: "/requests",
      type: "request_resolved",
    }).catch((err) => console.error("Error enviando notificación de objeto ya donado:", err));
  }

  // Notificar al solicitante principal según la acción realizada
  if (action === "approve") {
    createNotification({
      userId: out.applicantId,
      title: "¡Tu solicitud fue aprobada!",
      message: `${user.name} aprobó tu solicitud para "${out.itemTitle}". Ya puedes coordinar la entrega.`,
      targetPath: "/requests",
      type: "request_resolved",
    }).catch((err) => console.error("Error enviando notificación:", err));
  } else if (action === "reject") {
    createNotification({
      userId: out.applicantId,
      title: "Solicitud de donación no aceptada",
      message: `${user.name} no pudo aceptar tu solicitud para "${out.itemTitle}".`,
      targetPath: "/requests",
      type: "request_resolved",
    }).catch((err) => console.error("Error enviando notificación:", err));
  } else if (action === "deliver") {
    createNotification({
      userId: out.applicantId,
      title: "¡Entrega de donación completada!",
      message: `Se confirmó la entrega de "${out.itemTitle}". ¡Que disfrutes tu nuevo artículo de estudio!`,
      targetPath: "/requests",
      type: "request_resolved",
    }).catch((err) => console.error("Error enviando notificación:", err));
  }

  return out;
}
