import { ApiError } from "../errors";
import type { AuthUser, Item, ItemRequest, RequestAction, ReviewAction } from "../types";

export const ACTIVE_REQUEST_STATUSES: ItemRequest["status"][] = ["requested", "approved"];

export function isRequestActive(req: Pick<ItemRequest, "status">): boolean {
  return ACTIVE_REQUEST_STATUSES.includes(req.status);
}

/**
 * Valida que un usuario pueda solicitar un objeto.
 */
export function assertCanRequestItem(
  user: AuthUser,
  item: Pick<Item, "id" | "publisherId" | "status" | "available">,
  userRequestsForThisItem: Pick<ItemRequest, "status">[],
): void {
  if (item.publisherId === user.uid) {
    throw new ApiError(400, "SELF_REQUEST_NOT_ALLOWED", "No puedes solicitar un objeto que tú mismo publicaste");
  }

  if (item.status !== "approved" || !item.available) {
    throw new ApiError(409, "ITEM_NOT_AVAILABLE", "El objeto no está disponible para solicitar");
  }

  if (userRequestsForThisItem.some((r) => isRequestActive(r))) {
    throw new ApiError(409, "ALREADY_ACTIVE", "Ya tienes una solicitud activa para este objeto");
  }
}

/**
 * Aplica la decisión del supervisor sobre una publicación pendiente.
 */
export function applyReviewAction(
  item: Pick<Item, "status">,
  action: ReviewAction,
  supervisorId: string,
  now: Date,
  reason?: string,
): { status: Item["status"]; reviewedBy: string; reviewedAt: string; rejectionReason: string | null } {
  if (item.status !== "pending_approval") {
    throw new ApiError(409, "INVALID_STATE", "Solo se pueden revisar publicaciones pendientes de aprobación");
  }

  const iso = now.toISOString();
  if (action === "approve") {
    return {
      status: "approved",
      reviewedBy: supervisorId,
      reviewedAt: iso,
      rejectionReason: null,
    };
  }

  return {
    status: "rejected",
    reviewedBy: supervisorId,
    reviewedAt: iso,
    rejectionReason: reason ?? "No cumple con las políticas de publicación de ReUsa",
  };
}

/**
 * Aplica acciones del publicador sobre las peticiones recibidas: approve, reject, deliver.
 */
export function applyRequestAction(
  request: Pick<ItemRequest, "status">,
  action: RequestAction,
  now: Date,
): { status: ItemRequest["status"]; resolvedAt?: string; deliveredAt?: string } {
  const iso = now.toISOString();

  if (action === "approve") {
    if (request.status !== "requested") {
      throw new ApiError(409, "INVALID_STATE", "Solo se puede aceptar una petición pendiente");
    }
    return {
      status: "approved",
      resolvedAt: iso,
    };
  }

  if (action === "reject") {
    if (request.status !== "requested") {
      throw new ApiError(409, "INVALID_STATE", "Solo se puede rechazar una petición pendiente");
    }
    return {
      status: "rejected",
      resolvedAt: iso,
    };
  }

  if (action === "deliver") {
    if (request.status !== "approved") {
      throw new ApiError(409, "INVALID_STATE", "Solo se puede marcar como entregado un objeto con solicitud aprobada");
    }
    return {
      status: "delivered",
      deliveredAt: iso,
    };
  }

  throw new ApiError(400, "VALIDATION_ERROR", "Acción no reconocida");
}
