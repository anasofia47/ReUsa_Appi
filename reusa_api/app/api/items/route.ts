import { createItem, listCategories, listItems } from "@/lib/data/items";
import { ApiError } from "@/lib/errors";
import { requireUser } from "@/lib/guard";
import { parseBody, parseQuery, route } from "@/lib/http";
import { sniffImageType } from "@/lib/image";
import { createItemSchema, itemQuerySchema } from "@/lib/schemas";

export const GET = route(async (request) => {
  // Autenticación requerida para acceder al catálogo
  const user = await requireUser(request);
  const filter = parseQuery(request, itemQuerySchema);
  const serverTime = new Date().toISOString();

  const [items, categories] = await Promise.all([
    listItems(user, filter),
    listCategories(),
  ]);

  return Response.json({ items, categories, serverTime });
});

export const POST = route(async (request) => {
  const user = await requireUser(request);
  const body = await parseBody(request, createItemSchema);

  if (body.cover) {
    const real = sniffImageType(Buffer.from(body.cover.data, "base64"));
    if (real !== body.cover.contentType) {
      throw new ApiError(400, "VALIDATION_ERROR", "La imagen no es un archivo JPEG, PNG o WebP válido");
    }
  }

  const item = await createItem(user, body);
  return Response.json({ item }, { status: 201 });
});
