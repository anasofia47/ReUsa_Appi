import { describe, expect, it } from "vitest";
import {
  coverSchema,
  createItemSchema,
  createRequestSchema,
  itemQuerySchema,
  loginSchema,
  registerSchema,
  reportQuerySchema,
} from "@/lib/schemas";

describe("loginSchema", () => {
  it("normaliza correos y recorta espacios", () => {
    expect(loginSchema.parse({ email: " Estudiante@TdeA.EDU.CO ", password: "x" }).email).toBe(
      "estudiante@tdea.edu.co",
    );
  });

  it("rechaza correos con formato inválido", () => {
    expect(loginSchema.safeParse({ email: "no-email", password: "x" }).success).toBe(false);
  });
});

describe("registerSchema", () => {
  it("exige al menos 6 caracteres en la contraseña", () => {
    expect(
      registerSchema.safeParse({ email: "a@b.co", password: "12345", displayName: "Ana" }).success,
    ).toBe(false);
    expect(
      registerSchema.safeParse({ email: "a@b.co", password: "123456", displayName: "Ana" }).success,
    ).toBe(true);
  });
});

describe("createItemSchema", () => {
  it("valida objeto con campos completos", () => {
    const valid = {
      title: "Calculadora Casio",
      description: "Calculadora en perfecto estado para cálculo diferencial.",
      category: "Tecnología",
      condition: "Buen estado",
      deliveryPoint: "Bloque 1 Cafetería",
    };
    expect(createItemSchema.safeParse(valid).success).toBe(true);
  });

  it("acepta objeto con foto opcional en base64", () => {
    const validWithCover = {
      title: "Calculadora Casio",
      description: "Calculadora en perfecto estado para cálculo diferencial.",
      category: "Tecnología",
      condition: "Buen estado",
      deliveryPoint: "Bloque 1 Cafetería",
      cover: {
        contentType: "image/jpeg" as const,
        data: "A".repeat(150),
      },
    };
    expect(createItemSchema.safeParse(validWithCover).success).toBe(true);
  });

  it("rechaza títulos o descripciones demasiado cortas", () => {
    expect(
      createItemSchema.safeParse({
        title: "ab",
        description: "corta",
        category: "Tec",
        condition: "Buen estado",
        deliveryPoint: "B1",
      }).success,
    ).toBe(false);
  });
});

describe("itemQuerySchema", () => {
  it("valida parámetros de búsqueda y filtro", () => {
    expect(itemQuerySchema.safeParse({ q: "calculadora", category: "Tecnología" }).success).toBe(true);
  });
});

describe("createRequestSchema", () => {
  it("valida formato de clientRequestId seguro", () => {
    expect(
      createRequestSchema.safeParse({
        itemId: "item-123",
        clientRequestId: "req-abc-123456",
        applicantPhone: "3001234567",
        message: "Lo necesito para mis prácticas",
      }).success,
    ).toBe(true);
  });

  it("rechaza caracteres no permitidos en clientRequestId", () => {
    expect(
      createRequestSchema.safeParse({
        itemId: "item-123",
        clientRequestId: "../../exploit",
        applicantPhone: "3001234567",
        message: "Mensaje de prueba",
      }).success,
    ).toBe(false);
  });
});

describe("coverSchema", () => {
  it("valida base64 e imágenes permitidas", () => {
    const data = "A".repeat(200);
    expect(coverSchema.safeParse({ contentType: "image/jpeg", data }).success).toBe(true);
    expect(coverSchema.safeParse({ contentType: "image/gif", data }).success).toBe(false);
  });
});

describe("reportQuerySchema", () => {
  it("valida formato YYYY-MM-DD", () => {
    expect(reportQuerySchema.safeParse({ startDate: "2026-10-24" }).success).toBe(true);
    expect(reportQuerySchema.safeParse({ startDate: "24/10/2026" }).success).toBe(false);
  });
});
