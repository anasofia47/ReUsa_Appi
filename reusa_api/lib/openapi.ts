import { z } from "zod";
import {
  coverSchema,
  createItemSchema,
  createRequestSchema,
  itemQuerySchema,
  loginSchema,
  refreshSchema,
  registerSchema,
  reportQuerySchema,
  requestActionSchema,
  requestQuerySchema,
  reviewItemSchema,
} from "./schemas";

type Json = Record<string, unknown>;

function toSchema(schema: z.ZodType, io: "input" | "output" = "input"): Json {
  const { $schema, ...rest } = z.toJSONSchema(schema, {
    target: "draft-2020-12",
    io,
    unrepresentable: "any",
  }) as Json;
  void $schema;
  return rest;
}

function withEmailFormat(schema: Json): Json {
  const props = schema.properties as Record<string, Json> | undefined;
  if (props?.email) props.email = { ...props.email, format: "email" };
  return schema;
}

const ref = (name: string) => ({ $ref: `#/components/schemas/${name}` });

const ROLES = ["student", "supervisor", "admin"] as const;
const ITEM_STATUSES = ["pending_approval", "approved", "rejected"] as const;
const REQUEST_STATUSES = ["requested", "approved", "rejected", "delivered"] as const;

const ERROR_CODES = [
  "VALIDATION_ERROR",
  "UNAUTHENTICATED",
  "INVALID_CREDENTIALS",
  "FORBIDDEN",
  "NOT_FOUND",
  "EMAIL_IN_USE",
  "ALREADY_ACTIVE",
  "ITEM_NOT_AVAILABLE",
  "SELF_REQUEST_NOT_ALLOWED",
  "INVALID_STATE",
  "PAYLOAD_TOO_LARGE",
  "RATE_LIMITED",
  "CONFIG_ERROR",
  "INTERNAL_ERROR",
] as const;

const iso = z.string().meta({ format: "date-time" });

const GENDERS = ["masculino", "femenino", "otro"] as const;

const User = z.object({
  uid: z.string(),
  email: z.string().meta({ format: "email" }),
  name: z.string(),
  role: z.enum(ROLES),
  gender: z.enum(GENDERS).optional(),
});

const AuthResult = z.object({
  tokens: z.object({
    idToken: z.string().describe("JWT de Firebase; Authorization: Bearer <idToken>"),
    refreshToken: z.string().describe("Token de refresco para /api/auth/refresh"),
    expiresIn: z.number().int().describe("Segundos de vigencia"),
  }),
  user: User,
});

const Item = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  category: z.string(),
  condition: z.string(),
  deliveryPoint: z.string(),
  publisherId: z.string(),
  publisherEmail: z.string(),
  publisherName: z.string(),
  publisherGender: z.enum(GENDERS).optional(),
  status: z.enum(ITEM_STATUSES),
  available: z.boolean(),
  coverUrl: z.string().nullable(),
  reviewedBy: z.string().nullable(),
  reviewedAt: iso.nullable(),
  rejectionReason: z.string().nullable(),
  createdAt: iso,
  updatedAt: iso,
});

const ItemRequest = z.object({
  id: z.string(),
  itemId: z.string(),
  itemTitle: z.string(),
  publisherId: z.string(),
  publisherEmail: z.string(),
  publisherName: z.string(),
  applicantId: z.string(),
  applicantEmail: z.string(),
  applicantName: z.string(),
  applicantPhone: z.string(),
  message: z.string(),
  status: z.enum(REQUEST_STATUSES),
  clientRequestId: z.string(),
  requestedAt: iso,
  resolvedAt: iso.nullable(),
  deliveredAt: iso.nullable(),
  updatedAt: iso,
});

const ErrorBody = z.object({
  error: z.object({
    code: z.enum(ERROR_CODES),
    message: z.string(),
    details: z.unknown().optional(),
  }),
});

const json = (schema: Json) => ({ "application/json": { schema } });
const bearer = [{ bearerAuth: [] }];
const idParam = {
  name: "id",
  in: "path",
  required: true,
  schema: { type: "string" },
  description: "Identificador del recurso",
};

function queryParams(schema: z.ZodType): Json[] {
  const props = (toSchema(schema).properties ?? {}) as Record<string, Json>;
  return Object.entries(props).map(([name, s]) => ({
    name,
    in: "query",
    required: false,
    schema: s,
  }));
}

const errorResponse = (description: string) => ({
  description,
  content: json(ref("ErrorBody")),
});

const RESPONSES = {
  BadRequest: errorResponse("Datos inválidos (VALIDATION_ERROR)"),
  Unauthorized: errorResponse("Falta token o sesión expirada (UNAUTHENTICATED)"),
  Forbidden: errorResponse("Permisos insuficientes para esta acción (FORBIDDEN)"),
  NotFound: errorResponse("Recurso no encontrado (NOT_FOUND)"),
  Conflict: errorResponse("Conflicto con el estado actual (ALREADY_ACTIVE, ITEM_NOT_AVAILABLE, etc.)"),
};

const r = (name: keyof typeof RESPONSES) => ({ $ref: `#/components/responses/${name}` });

export function buildOpenApiSpec(): Json {
  return {
    openapi: "3.1.0",
    info: {
      title: "API de ReUsa",
      version: "1.0.0",
      description: [
        "API REST de ReUsa: plataforma de economía circular para el intercambio y reutilización de objetos en campus universitario.",
        "",
        "Roles soportados: Estudiante (student), Supervisor (supervisor), Administrador (admin).",
        "Incluye catálogo con aprobación de publicaciones por supervisores, solicitudes de objetos y reportes por rango de fechas.",
      ].join("\n"),
    },
    servers: [{ url: "/", description: "Servidor actual" }],
    tags: [
      { name: "Sistema" },
      { name: "Autenticación" },
      { name: "Objetos" },
      { name: "Solicitudes" },
      { name: "Reportes" },
    ],
    paths: {
      "/api/health": {
        get: {
          tags: ["Sistema"],
          summary: "Comprueba el estado del servicio",
          security: [],
          responses: {
            "200": {
              description: "Servidor activo",
              content: json({
                type: "object",
                properties: { status: { const: "ok" }, service: { type: "string" } },
              }),
            },
          },
        },
      },
      "/api/openapi.json": {
        get: {
          tags: ["Sistema"],
          summary: "Especificación OpenAPI 3.1",
          security: [],
          responses: {
            "200": { description: "Especificación OpenAPI", content: json({ type: "object" }) },
          },
        },
      },
      "/api/docs": {
        get: {
          tags: ["Sistema"],
          summary: "Documentación interactiva Swagger UI",
          security: [],
          responses: {
            "200": {
              description: "Página Swagger UI",
              content: { "text/html": { schema: { type: "string" } } },
            },
          },
        },
      },
      "/api/auth/register": {
        post: {
          tags: ["Autenticación"],
          summary: "Registra un nuevo usuario con rol Estudiante",
          security: [],
          requestBody: { required: true, content: json(withEmailFormat(toSchema(registerSchema))) },
          responses: {
            "201": { description: "Cuenta creada", content: json(ref("AuthResult")) },
            "400": r("BadRequest"),
            "409": errorResponse("Correo ya registrado (EMAIL_IN_USE)"),
          },
        },
      },
      "/api/auth/login": {
        post: {
          tags: ["Autenticación"],
          summary: "Inicia sesión con correo y contraseña",
          security: [],
          requestBody: { required: true, content: json(withEmailFormat(toSchema(loginSchema))) },
          responses: {
            "200": { description: "Tokens y perfil", content: json(ref("AuthResult")) },
            "400": r("BadRequest"),
            "401": errorResponse("Credenciales incorrectas (INVALID_CREDENTIALS)"),
          },
        },
      },
      "/api/auth/refresh": {
        post: {
          tags: ["Autenticación"],
          summary: "Renueva el idToken con un refreshToken",
          security: [],
          requestBody: { required: true, content: json(toSchema(refreshSchema)) },
          responses: {
            "200": { description: "Tokens renovados", content: json(ref("AuthResult")) },
            "400": r("BadRequest"),
            "401": errorResponse("Token de refresco inválido"),
          },
        },
      },
      "/api/auth/me": {
        get: {
          tags: ["Autenticación"],
          summary: "Obtiene el perfil y rol del usuario autenticado",
          security: bearer,
          responses: {
            "200": {
              description: "Datos del usuario",
              content: json({ type: "object", properties: { user: ref("User") } }),
            },
            "401": r("Unauthorized"),
          },
        },
      },
      "/api/items": {
        get: {
          tags: ["Objetos"],
          summary: "Lista catálogo de objetos o pendientes de aprobación",
          security: bearer,
          parameters: queryParams(itemQuerySchema),
          responses: {
            "200": {
              description: "Lista de objetos",
              content: json({
                type: "object",
                properties: {
                  items: { type: "array", items: ref("Item") },
                  categories: { type: "array", items: { type: "string" } },
                  serverTime: { type: "string", format: "date-time" },
                },
              }),
            },
            "400": r("BadRequest"),
            "401": r("Unauthorized"),
          },
        },
        post: {
          tags: ["Objetos"],
          summary: "Publica una nueva solicitud de donación de objeto (queda pendiente de aprobación)",
          security: bearer,
          requestBody: { required: true, content: json(toSchema(createItemSchema)) },
          responses: {
            "201": { description: "Objeto creado", content: json({ type: "object", properties: { item: ref("Item") } }) },
            "400": r("BadRequest"),
            "401": r("Unauthorized"),
          },
        },
      },
      "/api/items/{id}": {
        get: {
          tags: ["Objetos"],
          summary: "Detalle de un objeto",
          security: bearer,
          parameters: [idParam],
          responses: {
            "200": {
              description: "Detalle del objeto",
              content: json({ type: "object", properties: { item: ref("Item") } }),
            },
            "401": r("Unauthorized"),
            "404": r("NotFound"),
          },
        },
      },
      "/api/items/{id}/review": {
        patch: {
          tags: ["Objetos"],
          summary: "El supervisor o administrador aprueba o rechaza una publicación",
          security: bearer,
          parameters: [idParam],
          requestBody: { required: true, content: json(toSchema(reviewItemSchema)) },
          responses: {
            "200": {
              description: "Objeto revisado",
              content: json({ type: "object", properties: { item: ref("Item") } }),
            },
            "400": r("BadRequest"),
            "401": r("Unauthorized"),
            "403": r("Forbidden"),
            "404": r("NotFound"),
            "409": r("Conflict"),
          },
        },
      },
      "/api/items/{id}/cover": {
        get: {
          tags: ["Objetos"],
          summary: "Imagen de portada del objeto",
          security: [],
          parameters: [idParam],
          responses: {
            "200": {
              description: "Imagen",
              content: {
                "image/jpeg": { schema: { type: "string", format: "binary" } },
                "image/png": { schema: { type: "string", format: "binary" } },
                "image/webp": { schema: { type: "string", format: "binary" } },
              },
            },
            "404": r("NotFound"),
          },
        },
        put: {
          tags: ["Objetos"],
          summary: "Sube o actualiza la imagen del objeto",
          security: bearer,
          parameters: [idParam],
          requestBody: { required: true, content: json(toSchema(coverSchema)) },
          responses: {
            "200": {
              description: "Objeto con imagen actualizada",
              content: json({ type: "object", properties: { item: ref("Item") } }),
            },
            "400": r("BadRequest"),
            "401": r("Unauthorized"),
            "403": r("Forbidden"),
            "404": r("NotFound"),
          },
        },
      },
      "/api/requests": {
        get: {
          tags: ["Solicitudes"],
          summary: "Lista solicitudes de petición recibidas o enviadas",
          security: bearer,
          parameters: queryParams(requestQuerySchema),
          responses: {
            "200": {
              description: "Lista de solicitudes",
              content: json({
                type: "object",
                properties: {
                  requests: { type: "array", items: ref("ItemRequest") },
                  serverTime: { type: "string", format: "date-time" },
                },
              }),
            },
            "400": r("BadRequest"),
            "401": r("Unauthorized"),
          },
        },
        post: {
          tags: ["Solicitudes"],
          summary: "Crea una solicitud de petición para un objeto (idempotente)",
          security: bearer,
          requestBody: { required: true, content: json(toSchema(createRequestSchema)) },
          responses: {
            "200": { description: "Solicitud ya existente (reintento)", content: json({ type: "object", properties: { request: ref("ItemRequest") } }) },
            "201": { description: "Solicitud creada", content: json({ type: "object", properties: { request: ref("ItemRequest") } }) },
            "400": r("BadRequest"),
            "401": r("Unauthorized"),
            "404": r("NotFound"),
            "409": r("Conflict"),
          },
        },
      },
      "/api/requests/{id}": {
        get: {
          tags: ["Solicitudes"],
          summary: "Obtiene una solicitud por ID",
          security: bearer,
          parameters: [idParam],
          responses: {
            "200": {
              description: "Detalle de la solicitud",
              content: json({ type: "object", properties: { request: ref("ItemRequest") } }),
            },
            "401": r("Unauthorized"),
            "404": r("NotFound"),
          },
        },
        patch: {
          tags: ["Solicitudes"],
          summary: "El publicador acepta, rechaza o marca entrega del producto",
          security: bearer,
          parameters: [idParam],
          requestBody: { required: true, content: json(toSchema(requestActionSchema)) },
          responses: {
            "200": {
              description: "Solicitud actualizada",
              content: json({ type: "object", properties: { request: ref("ItemRequest") } }),
            },
            "400": r("BadRequest"),
            "401": r("Unauthorized"),
            "403": r("Forbidden"),
            "404": r("NotFound"),
            "409": r("Conflict"),
          },
        },
      },
      "/api/reports": {
        get: {
          tags: ["Reportes"],
          summary: "Reportes de objetos publicados por usuario, categoría y rango de fechas (admin/supervisor)",
          security: bearer,
          parameters: queryParams(reportQuerySchema),
          responses: {
            "200": {
              description: "Resumen de reportes",
              content: json({
                type: "object",
                properties: {
                  summary: {
                    type: "object",
                    properties: {
                      startDate: { type: "string" },
                      endDate: { type: "string" },
                      totalPublished: { type: "number" },
                      totalApproved: { type: "number" },
                      totalPending: { type: "number" },
                      totalRequests: { type: "number" },
                      totalDelivered: { type: "number" },
                    },
                  },
                },
              }),
            },
            "400": r("BadRequest"),
            "401": r("Unauthorized"),
            "403": r("Forbidden"),
          },
        },
      },
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "idToken de Firebase Authentication",
        },
      },
      schemas: {
        User: toSchema(User, "output"),
        AuthResult: toSchema(AuthResult, "output"),
        Item: toSchema(Item, "output"),
        ItemRequest: toSchema(ItemRequest, "output"),
        ErrorBody: toSchema(ErrorBody, "output"),
      },
      responses: RESPONSES,
    },
  };
}
