import { getItem, getItemCover, saveItemCover } from "@/lib/data/items";
import { ApiError } from "@/lib/errors";
import { requireUser } from "@/lib/guard";
import { parseBody, route } from "@/lib/http";
import { sniffImageType } from "@/lib/image";
import { coverSchema } from "@/lib/schemas";

export const GET = route(async (_request, ctx: RouteContext<"/api/items/[id]/cover">) => {
  const { id } = await ctx.params;
  const { contentType, bytes } = await getItemCover(id);
  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
});

export const PUT = route(async (request, ctx: RouteContext<"/api/items/[id]/cover">) => {
  const user = await requireUser(request);
  const { id } = await ctx.params;
  const item = await getItem(id);

  // Solo el creador del producto o supervisor/admin puede cambiar la foto
  const isOwner = item.publisherId === user.uid;
  const isPrivileged = user.role === "supervisor" || user.role === "admin";
  if (!isOwner && !isPrivileged) {
    throw new ApiError(403, "FORBIDDEN", "No tienes permisos para modificar la imagen de este objeto");
  }

  const { contentType, data } = await parseBody(request, coverSchema);
  const real = sniffImageType(Buffer.from(data, "base64"));
  if (real !== contentType) {
    throw new ApiError(400, "VALIDATION_ERROR", "El archivo no es una imagen JPEG, PNG o WebP válida");
  }

  console.info(`[cover] ${user.uid} actualizó imagen de objeto ${id}`);
  return Response.json({ item: await saveItemCover(id, contentType, data) });
});
