import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { Validator } from "@seriousme/openapi-schema-validator";
import { describe, expect, it } from "vitest";
import { GET as getSpec } from "@/app/api/openapi.json/route";
import { buildOpenApiSpec } from "@/lib/openapi";

type Operation = { security?: unknown[]; responses: Record<string, unknown> };
type Spec = { openapi: string; paths: Record<string, Record<string, Operation>> };

const spec = buildOpenApiSpec() as unknown as Spec;
const METHODS = ["get", "post", "put", "patch", "delete"];

function routesFromFiles(): Record<string, string[]> {
  const root = join(process.cwd(), "app", "api");
  const found: Record<string, string[]> = {};
  const walk = (dir: string) => {
    for (const name of readdirSync(dir)) {
      const full = join(dir, name);
      if (statSync(full).isDirectory()) walk(full);
      else if (name === "route.ts") {
        const urlPath =
          "/api/" +
          relative(root, dir)
            .split(sep)
            .filter(Boolean)
            .map((seg) => seg.replace(/^\[(.+)\]$/, "{$1}"))
            .join("/");
        const code = readFileSync(full, "utf8");
        const methods = [
          ...code.matchAll(/export (?:const|async function) (GET|POST|PUT|PATCH|DELETE)\b/g),
        ];
        found[urlPath.replace(/\/$/, "")] = methods.map((m) => m[1].toLowerCase()).sort();
      }
    }
  };
  walk(root);
  return found;
}

describe("Especificación OpenAPI de ReUsa", () => {
  it("es un documento OpenAPI 3.1 válido", async () => {
    const result = await new Validator().validate(spec as never);
    expect(result.errors ?? []).toEqual([]);
    expect(result.valid).toBe(true);
  });

  it("documenta exactamente las rutas y métodos que existen en app/api", () => {
    const documented = Object.fromEntries(
      Object.entries(spec.paths).map(([path, ops]) => [
        path,
        Object.keys(ops)
          .filter((k) => METHODS.includes(k))
          .sort(),
      ]),
    );
    expect(documented).toEqual(routesFromFiles());
  });

  it("toda operación protegida declara Bearer y respuesta 401", () => {
    const publicPaths = new Set([
      "/api/health",
      "/api/openapi.json",
      "/api/docs",
      "/api/auth/register",
      "/api/auth/login",
      "/api/auth/refresh",
    ]);

    for (const [path, ops] of Object.entries(spec.paths)) {
      for (const [method, op] of Object.entries(ops)) {
        const isPublicCover = path.endsWith("/cover") && method === "get";
        if (publicPaths.has(path) || isPublicCover) {
          expect(op.security, `${method} ${path}`).toEqual([]);
        } else {
          expect(op.security, `${method} ${path}`).toEqual([{ bearerAuth: [] }]);
          expect(op.responses["401"], `${method} ${path} sin 401`).toBeDefined();
        }
      }
    }
  });

  it("GET /api/openapi.json devuelve la especificación", async () => {
    const res = await getSpec();
    expect(res.status).toBe(200);
    const body = (await res.json()) as Spec;
    expect(body.openapi).toMatch(/^3\.1/);
    expect(Object.keys(body.paths)).toContain("/api/items");
    expect(Object.keys(body.paths)).toContain("/api/requests");
    expect(Object.keys(body.paths)).toContain("/api/reports");
  });
});
