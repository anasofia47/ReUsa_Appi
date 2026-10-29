import { buildOpenApiSpec } from "@/lib/openapi";

export async function GET() {
  return Response.json(buildOpenApiSpec());
}
