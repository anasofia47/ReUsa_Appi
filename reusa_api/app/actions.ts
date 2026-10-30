"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createItem, reviewItem, saveItemCover } from "@/lib/data/items";
import { createRequest, transitionRequest } from "@/lib/data/requests";
import { ApiError } from "@/lib/errors";
import { sniffImageType } from "@/lib/image";
import {
  createItemSchema,
  createRequestSchema,
  loginSchema,
  registerSchema,
  requestActionSchema,
  reviewItemSchema,
  MAX_COVER_BASE64_LENGTH,
} from "@/lib/schemas";
import { createSessionCookie, login, register } from "@/lib/services/auth";
import { clearSessionCookie, requireWebUser, setSessionCookie } from "@/lib/web/session";

export interface FormState {
  error?: string;
  ok?: string;
}

function messageOf(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  console.error("[web] error no controlado:", err);
  return err instanceof Error ? err.message : "Ocurrió un error inesperado. Inténtalo de nuevo.";
}

export async function loginAction(_prev: FormState, formData: FormData): Promise<FormState> {
  console.log("[loginAction] step 1: parsing form");
  const parsed = loginSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };

  try {
    console.log("[loginAction] step 2: calling login()");
    const { tokens } = await login(parsed.data.email, parsed.data.password);
    console.log("[loginAction] step 3: login ok, creating session cookie");
    const sessionCookie = await createSessionCookie(tokens.idToken);
    console.log("[loginAction] step 4: cookie created, setting cookie");
    await setSessionCookie(sessionCookie);
    console.log("[loginAction] step 5: cookie set, redirecting");
  } catch (err) {
    console.error("[loginAction] catch error:", err);
    return { error: messageOf(err) };
  }
  console.log("[loginAction] step 6: calling redirect");
  redirect("/items");
}

export async function registerAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = registerSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };

  try {
    const { email, password, displayName, gender } = parsed.data;
    const { tokens } = await register(email, password, displayName, gender);
    await setSessionCookie(await createSessionCookie(tokens.idToken));
  } catch (err) {
    return { error: messageOf(err) };
  }
  redirect("/items");
}

export async function logoutAction(): Promise<void> {
  await clearSessionCookie();
  redirect("/login");
}

export async function publishItemAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireWebUser();
  const raw = Object.fromEntries(formData);
  delete raw.cover;
  const parsed = createItemSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Datos inválidos" };

  const file = formData.get("cover");
  let coverData: { contentType: "image/jpeg" | "image/png" | "image/webp"; data: string } | undefined;

  if (file instanceof File && file.size > 0) {
    if (file.size > MAX_COVER_BYTES) {
      return { error: `La foto supera el límite de ${Math.round(MAX_COVER_BYTES / 1024)} KB` };
    }
    const bytes = new Uint8Array(await file.arrayBuffer());
    const detectedType = sniffImageType(bytes);
    if (!detectedType) {
      return { error: "La foto debe ser una imagen válida (JPEG, PNG o WebP)" };
    }
    coverData = {
      contentType: detectedType,
      data: Buffer.from(bytes).toString("base64"),
    };
  }

  try {
    await createItem(user, { ...parsed.data, cover: coverData });
    revalidatePath("/items");
    revalidatePath("/supervisor");
  } catch (err) {
    return { error: messageOf(err) };
  }
  redirect("/items?published=true");
}

export async function reviewItemAction(
  itemId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireWebUser(["supervisor", "admin"]);
  const parsed = reviewItemSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Acción inválida" };

  try {
    await reviewItem(user, itemId, parsed.data.action, parsed.data.reason);
    revalidatePath("/supervisor");
    revalidatePath("/items");
    revalidatePath(`/items/${itemId}`);
    return { ok: parsed.data.action === "approve" ? "Publicación aprobada" : "Publicación rechazada" };
  } catch (err) {
    return { error: messageOf(err) };
  }
}

export async function requestItemAction(
  itemId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const user = await requireWebUser();
  const raw = {
    itemId,
    clientRequestId: randomUUID(),
    applicantPhone: String(formData.get("applicantPhone") ?? ""),
    message: String(formData.get("message") ?? ""),
  };

  const parsed = createRequestSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Completa todos los campos" };

  try {
    const { created } = await createRequest(
      user,
      itemId,
      parsed.data.clientRequestId,
      parsed.data.applicantPhone,
      parsed.data.message,
    );
    revalidatePath("/requests");
    return {
      ok: created
        ? "¡Solicitud enviada! El publicador recibirá tu petición y número de contacto."
        : "Ya tenías una solicitud activa para este objeto.",
    };
  } catch (err) {
    return { error: messageOf(err) };
  }
}

export async function requestTransitionAction(requestId: string, action: string): Promise<FormState> {
  const user = await requireWebUser();
  const parsed = requestActionSchema.safeParse({ action });
  if (!parsed.success) return { error: "Acción inválida" };

  try {
    await transitionRequest(user, requestId, parsed.data.action);
    revalidatePath("/requests");
    revalidatePath("/items");
    return { ok: "Estado de la solicitud actualizado" };
  } catch (err) {
    return { error: messageOf(err) };
  }
}

const MAX_COVER_BYTES = Math.floor((MAX_COVER_BASE64_LENGTH * 3) / 4) - 4;

export async function uploadCoverAction(
  itemId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireWebUser();
  const file = formData.get("cover");
  if (!(file instanceof File) || file.size === 0) return { error: "Selecciona una imagen" };
  if (file.size > MAX_COVER_BYTES) {
    return { error: `La imagen supera los ${Math.round(MAX_COVER_BYTES / 1024)} KB permitidos` };
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = sniffImageType(bytes);
  if (!type) return { error: "El archivo debe ser una imagen JPEG, PNG o WebP válida" };

  try {
    await saveItemCover(itemId, type, Buffer.from(bytes).toString("base64"));
    revalidatePath(`/items/${itemId}`);
    revalidatePath("/items");
    return { ok: "Foto actualizada con éxito" };
  } catch (err) {
    return { error: messageOf(err) };
  }
}
