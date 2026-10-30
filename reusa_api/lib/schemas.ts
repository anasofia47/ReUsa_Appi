import { z } from "zod";

z.config(z.locales.es());

const emailField = z.string().trim().toLowerCase().pipe(z.email("Correo inválido"));

export const loginSchema = z.object({
  email: emailField,
  password: z.string().min(1, "La contraseña es obligatoria"),
});

export const registerSchema = z
  .object({
    email: emailField,
    password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
    displayName: z.string().trim().min(2, "El nombre debe tener al menos 2 caracteres").max(80),
    gender: z.enum(["masculino", "femenino", "otro"]).optional(),
    sex: z.enum(["masculino", "femenino", "otro"]).optional(),
    role: z.enum(["student", "supervisor", "admin"]).optional(),
    supervisorSecret: z.string().optional(),
  })
  .transform((data) => ({
    ...data,
    gender: data.gender ?? data.sex ?? "otro",
  }));

export const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

/** Límite de imagen en base64: ~700KB para caber en 1MiB de Firestore */
export const MAX_COVER_BASE64_LENGTH = 700_000;

export const coverSchema = z.object({
  contentType: z.enum(["image/jpeg", "image/png", "image/webp"]),
  data: z
    .string()
    .min(100)
    .max(MAX_COVER_BASE64_LENGTH, "La imagen es demasiado grande")
    .regex(/^[A-Za-z0-9+/]+={0,2}$/, "Base64 inválido"),
});

export const createItemSchema = z
  .object({
    title: z.string().trim().min(3, "El título debe tener al menos 3 caracteres").max(120),
    description: z.string().trim().min(10, "La descripción debe tener al menos 10 caracteres").max(1000),
    category: z.string().trim().min(2, "Categoría inválida").max(50),
    condition: z.enum(["Nuevo", "Como nuevo", "Buen estado", "Aceptable"]).optional(),
    state: z.string().optional(),
    deliveryPoint: z.string().trim().min(3, "Punto de entrega requerido").max(100).optional(),
    sex: z.string().optional(),
    cover: z.any().optional(),
  })
  .transform((data) => {
    let cond = data.condition;
    if (!cond && data.state) {
      if (data.state === "nuevo" || data.state === "Nuevo") cond = "Nuevo";
      else if (data.state === "usado_bueno" || data.state === "Buen estado") cond = "Buen estado";
      else if (data.state === "usado_regular" || data.state === "Aceptable") cond = "Aceptable";
      else if (data.state === "Como nuevo") cond = "Como nuevo";
    }
    const cover =
      data.cover && typeof data.cover === "object" && "data" in data.cover && typeof data.cover.data === "string"
        ? {
            contentType: (data.cover.contentType ?? "image/jpeg") as "image/jpeg" | "image/png" | "image/webp",
            data: data.cover.data as string,
          }
        : undefined;
    return {
      title: data.title,
      description: data.description,
      category: data.category,
      condition: cond ?? "Buen estado",
      deliveryPoint: data.deliveryPoint ?? "Campus TdeA - Biblioteca / Cafetería",
      cover,
    };
  });

export const reviewItemSchema = z.object({
  action: z.enum(["approve", "reject"]),
  reason: z.string().trim().max(300).optional(),
});

export const itemQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  category: z.string().trim().max(60).optional(),
  status: z.enum(["pending_approval", "approved", "rejected"]).optional(),
  updatedSince: z.iso.datetime().optional(),
});

export const createRequestSchema = z.object({
  itemId: z.string().min(1).max(120),
  clientRequestId: z
    .string()
    .min(8)
    .max(100)
    .regex(/^[A-Za-z0-9_-]+$/, "Formato de clientRequestId inválido"),
  applicantPhone: z.string().trim().min(7, "Teléfono inválido").max(20),
  message: z.string().trim().min(5, "Indica por qué necesitas el objeto").max(500),
});

export const requestActionSchema = z.object({
  action: z.enum(["approve", "reject", "deliver"]),
});

export const requestQuerySchema = z.object({
  type: z.enum(["all", "sent", "received"]).optional(),
  status: z.enum(["requested", "approved", "rejected", "delivered"]).optional(),
  updatedSince: z.iso.datetime().optional(),
});

export const reportQuerySchema = z.object({
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de fecha YYYY-MM-DD").optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Formato de fecha YYYY-MM-DD").optional(),
  userId: z.string().trim().optional(),
  category: z.string().trim().optional(),
  gender: z.enum(["masculino", "femenino", "otro"]).optional(),
});

