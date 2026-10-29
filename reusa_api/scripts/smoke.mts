import { randomUUID } from "node:crypto";
import { deflateSync, crc32 } from "node:zlib";
import { cert, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const RUN = Date.now();
const PASSWORD = `Tmp-${randomUUID()}`;

const STU1_EMAIL = `smoke-stu1-${RUN}@example.test`;
const STU2_EMAIL = `smoke-stu2-${RUN}@example.test`;
const SUP_EMAIL = `smoke-sup-${RUN}@example.test`;
const ADM_EMAIL = `smoke-adm-${RUN}@example.test`;

initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_PROJECT_ID!,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
    privateKey: process.env.FIREBASE_PRIVATE_KEY!.replace(/\\n/g, "\n"),
  }),
});

let failures = 0;
function check(name: string, ok: boolean, extra?: unknown) {
  console.log(`${ok ? " ✓" : " ✗"} ${name}${ok || extra === undefined ? "" : ` → ${JSON.stringify(extra)}`}`);
  if (!ok) failures++;
}

interface SmokeBody {
  user: { role: string; email?: string };
  tokens: { idToken: string; refreshToken?: string };
  item: { id: string; status: string; available: boolean; coverUrl: string | null };
  items: Array<{ id: string; title: string }>;
  request: { id: string; status: string };
  requests: Array<{ id: string }>;
  summary: { totalPublished: number; byUser: unknown[]; byCategory: unknown[] };
}

async function call(method: string, path: string, opts: { token?: string; body?: unknown } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      ...(opts.body !== undefined ? { "Content-Type": "application/json" } : {}),
      ...(opts.token ? { Authorization: `Bearer ${opts.token}` } : {}),
    },
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  const text = await res.text();
  let body = {} as SmokeBody;
  try {
    body = JSON.parse(text) as SmokeBody;
  } catch {
    // respuesta binaria
  }
  return { status: res.status, body, headers: res.headers };
}

function makePng(): Buffer {
  const size = 64;
  const raw = Buffer.alloc((size * 3 + 1) * size);
  for (let y = 0; y < size; y++) {
    const row = y * (size * 3 + 1);
    for (let x = 0; x < size; x++) {
      raw[row + 1 + x * 3] = (x * 4) % 256;
      raw[row + 2 + x * 3] = (y * 4) % 256;
      raw[row + 3 + x * 3] = 120;
    }
  }
  const chunk = (type: string, data: Buffer) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const b = Buffer.concat([Buffer.from(type), data]);
    const c = Buffer.alloc(4);
    c.writeUInt32BE(crc32(b));
    return Buffer.concat([len, b, c]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const createdItemIds: string[] = [];
const createdRequestIds: string[] = [];

async function createTempUser(email: string, displayName: string, role: "student" | "supervisor" | "admin") {
  const created = await getAuth().createUser({ email, password: PASSWORD, displayName });
  await getAuth().setCustomUserClaims(created.uid, { role });
  await getFirestore()
    .collection("users")
    .doc(created.uid)
    .set({ email, displayName, role, createdAt: new Date().toISOString() });
}

async function main() {
  console.log(`Iniciando prueba de humo contra ${BASE}\n`);

  await createTempUser(STU1_EMAIL, "Estudiante Publicador", "student");
  await createTempUser(STU2_EMAIL, "Estudiante Interesado", "student");
  await createTempUser(SUP_EMAIL, "Supervisor Campus", "supervisor");
  await createTempUser(ADM_EMAIL, "Admin ReUsa", "admin");

  console.log("1. Salud y Seguridad de Rutas");
  check("GET /api/health → 200", (await call("GET", "/api/health")).status === 200);
  check("GET /api/items sin token → 401", (await call("GET", "/api/items")).status === 401);

  console.log("\n2. Autenticación y Roles");
  const stu1Res = await call("POST", "/api/auth/login", { body: { email: STU1_EMAIL, password: PASSWORD } });
  check("login stu1 → 200 con role student", stu1Res.status === 200 && stu1Res.body.user.role === "student");
  const stu1Token = stu1Res.body.tokens.idToken;

  const stu2Res = await call("POST", "/api/auth/login", { body: { email: STU2_EMAIL, password: PASSWORD } });
  check("login stu2 → 200", stu2Res.status === 200);
  const stu2Token = stu2Res.body.tokens.idToken;

  const supRes = await call("POST", "/api/auth/login", { body: { email: SUP_EMAIL, password: PASSWORD } });
  check("login supervisor → 200 con role supervisor", supRes.status === 200 && supRes.body.user.role === "supervisor");
  const supToken = supRes.body.tokens.idToken;

  const admRes = await call("POST", "/api/auth/login", { body: { email: ADM_EMAIL, password: PASSWORD } });
  check("login admin → 200 con role admin", admRes.status === 200 && admRes.body.user.role === "admin");
  const admToken = admRes.body.tokens.idToken;

  console.log("\n3. Publicación y Aprobación por Supervisor");
  const newItem = await call("POST", "/api/items", {
    token: stu1Token,
    body: {
      title: `Regla T y Escuadras ${RUN}`,
      description: "Juego completo de dibujo técnico para ingeniería.",
      category: "Papelería y Dibujo",
      condition: "Buen estado",
      deliveryPoint: "Bloque 1 TdeA",
    },
  });
  check("publicar objeto → 201 en pending_approval", newItem.status === 201 && newItem.body.item?.status === "pending_approval");
  const itemId = newItem.body.item.id;
  createdItemIds.push(itemId);

  const catForStu2 = await call("GET", "/api/items", { token: stu2Token });
  check("objeto no aparece en catalogo regular antes de aprobar", !catForStu2.body.items?.some((i) => i.id === itemId));

  const supReview = await call("PATCH", `/api/items/${itemId}/review`, {
    token: supToken,
    body: { action: "approve" },
  });
  check("supervisor aprueba publicación → 200", supReview.status === 200 && supReview.body.item?.status === "approved");

  const catAfter = await call("GET", "/api/items", { token: stu2Token });
  check("ahora el objeto aparece en catalogo de estudiantes", Boolean(catAfter.body.items?.some((i) => i.id === itemId)));

  console.log("\n4. Petición de Objeto y Notificación al Publicador");
  const clientRid = `req-${RUN}-1`;
  const req1 = await call("POST", "/api/requests", {
    token: stu2Token,
    body: {
      itemId,
      clientRequestId: clientRid,
      applicantPhone: "3009876543",
      message: "Lo necesito urgente para la clase de dibujo técnico de esta tarde.",
    },
  });
  check("solicitar objeto → 201", req1.status === 201 && req1.body.request?.status === "requested");
  const reqId = req1.body.request.id;
  createdRequestIds.push(reqId);

  const reqDup = await call("POST", "/api/requests", {
    token: stu2Token,
    body: {
      itemId,
      clientRequestId: clientRid,
      applicantPhone: "3009876543",
      message: "Reintento de red",
    },
  });
  check("reintento idempotente con mismo clientRequestId → 200 y mismo id", reqDup.status === 200 && reqDup.body.request?.id === reqId);

  const receivedByPub = await call("GET", "/api/requests?type=received", { token: stu1Token });
  check("publicador recibe la petición en su bandeja", Boolean(receivedByPub.body.requests?.some((r) => r.id === reqId)));

  console.log("\n5. Aceptación y Confirmación de Entrega");
  const acceptRes = await call("PATCH", `/api/requests/${reqId}`, {
    token: stu1Token,
    body: { action: "approve" },
  });
  check("publicador acepta al interesado → approved", acceptRes.status === 200 && acceptRes.body.request?.status === "approved");

  const deliverRes = await call("PATCH", `/api/requests/${reqId}`, {
    token: stu1Token,
    body: { action: "deliver" },
  });
  check("publicador confirma entrega → delivered", deliverRes.status === 200 && deliverRes.body.request?.status === "delivered");

  const deliveredItem = await call("GET", `/api/items/${itemId}`, { token: stu2Token });
  check("objeto pasa a no disponible (available = false)", deliveredItem.body.item?.available === false);

  console.log("\n6. Reportes para Administrador con Rango de Fechas");
  const today = new Date().toISOString().split("T")[0];
  const reportsRes = await call("GET", `/api/reports?startDate=${today}&endDate=${today}`, { token: admToken });
  check("admin consulta reportes con rango de fechas → 200", reportsRes.status === 200 && (reportsRes.body.summary?.totalPublished ?? 0) >= 1);
  check("reporte agrupa por usuario y categoría", (reportsRes.body.summary?.byUser?.length ?? 0) > 0 && (reportsRes.body.summary?.byCategory?.length ?? 0) > 0);

  console.log("\n7. Portadas e Imágenes");
  const pngBase64 = makePng().toString("base64");
  const coverRes = await call("PUT", `/api/items/${itemId}/cover`, {
    token: stu1Token,
    body: { contentType: "image/png", data: pngBase64 },
  });
  check("subir portada PNG → 200", coverRes.status === 200 && Boolean(coverRes.body.item?.coverUrl));

  const getImg = await fetch(`${BASE}${coverRes.body.item.coverUrl}`);
  check("GET portada → image/png público", getImg.status === 200 && getImg.headers.get("content-type") === "image/png");
}

async function cleanup() {
  console.log("\nLimpiando datos de prueba...");
  const db = getFirestore();
  for (const id of createdRequestIds.filter(Boolean)) await db.collection("requests").doc(id).delete();
  for (const id of createdItemIds.filter(Boolean)) {
    await db.collection("items").doc(id).delete();
    await db.collection("itemCovers").doc(id).delete();
  }
  for (const email of [STU1_EMAIL, STU2_EMAIL, SUP_EMAIL, ADM_EMAIL]) {
    try {
      const u = await getAuth().getUserByEmail(email);
      await getAuth().deleteUser(u.uid);
      await db.collection("users").doc(u.uid).delete();
    } catch {
      // Ignorar si no se creó
    }
  }
  console.log("Limpieza terminada.");
}

try {
  await main();
} catch (err) {
  failures++;
  console.error("Error en ejecución de smoke test:", err);
} finally {
  await cleanup();
}

console.log(failures === 0 ? "\n✓ Todo OK en ReUsa API" : `\n✗ ${failures} error(es) en smoke test`);
process.exit(failures === 0 ? 0 : 1);
