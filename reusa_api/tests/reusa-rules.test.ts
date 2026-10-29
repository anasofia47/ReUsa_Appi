import { describe, expect, it } from "vitest";
import {
  applyRequestAction,
  applyReviewAction,
  assertCanRequestItem,
} from "@/lib/domain/reusa-rules";
import { ApiError } from "@/lib/errors";
import type { AuthUser, Item, ItemRequest } from "@/lib/types";

const now = new Date("2026-10-24T10:00:00.000Z");

describe("assertCanRequestItem", () => {
  const user: AuthUser = { uid: "u_solicitante", email: "a@tdea.edu.co", name: "Estudiante", role: "student" };
  const approvedItem: Pick<Item, "id" | "publisherId" | "status" | "available"> = {
    id: "item-1",
    publisherId: "u_dueno",
    status: "approved",
    available: true,
  };

  it("permite solicitar un objeto disponible y aprobado", () => {
    expect(() => assertCanRequestItem(user, approvedItem, [])).not.toThrow();
  });

  it("rechaza si el usuario intenta solicitar su propio producto (SELF_REQUEST_NOT_ALLOWED)", () => {
    const ownItem = { ...approvedItem, publisherId: user.uid };
    expect(() => assertCanRequestItem(user, ownItem, [])).toThrowError(ApiError);
  });

  it("rechaza con ITEM_NOT_AVAILABLE si el objeto no está aprobado o no disponible", () => {
    const pendingItem = { ...approvedItem, status: "pending_approval" as const };
    expect(() => assertCanRequestItem(user, pendingItem, [])).toThrowError(ApiError);

    const unavailableItem = { ...approvedItem, available: false };
    expect(() => assertCanRequestItem(user, unavailableItem, [])).toThrowError(ApiError);
  });

  it("rechaza con ALREADY_ACTIVE si el usuario ya tiene solicitud activa", () => {
    const activeReq: Pick<ItemRequest, "status">[] = [{ status: "requested" }];
    expect(() => assertCanRequestItem(user, approvedItem, activeReq)).toThrowError(ApiError);
  });
});

describe("applyReviewAction (Supervisor)", () => {
  const pendingItem = { status: "pending_approval" as const };

  it("aprueba publicación pendiente", () => {
    const res = applyReviewAction(pendingItem, "approve", "sup-1", now);
    expect(res.status).toBe("approved");
    expect(res.reviewedBy).toBe("sup-1");
  });

  it("rechaza publicación con motivo", () => {
    const res = applyReviewAction(pendingItem, "reject", "sup-1", now, "Foto borrosa");
    expect(res.status).toBe("rejected");
    expect(res.rejectionReason).toBe("Foto borrosa");
  });

  it("falla si el objeto ya no estaba pendiente", () => {
    expect(() => applyReviewAction({ status: "approved" }, "approve", "sup-1", now)).toThrowError(ApiError);
  });
});

describe("applyRequestAction (Publicador y entrega)", () => {
  it("acepta solicitud pendiente (approve)", () => {
    const res = applyRequestAction({ status: "requested" }, "approve", now);
    expect(res.status).toBe("approved");
    expect(res.resolvedAt).toBe(now.toISOString());
  });

  it("rechaza solicitud pendiente (reject)", () => {
    const res = applyRequestAction({ status: "requested" }, "reject", now);
    expect(res.status).toBe("rejected");
  });

  it("confirma entrega física (deliver)", () => {
    const res = applyRequestAction({ status: "approved" }, "deliver", now);
    expect(res.status).toBe("delivered");
    expect(res.deliveredAt).toBe(now.toISOString());
  });

  it("no permite entregar sin previa aprobación", () => {
    expect(() => applyRequestAction({ status: "requested" }, "deliver", now)).toThrowError(ApiError);
  });
});
