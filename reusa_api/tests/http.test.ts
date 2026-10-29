import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { ApiError } from "@/lib/errors";
import { parseBody, route } from "@/lib/http";

describe("route()", () => {
  it("traduce ApiError a formato JSON uniforme con su status HTTP", async () => {
    const handler = route(async () => {
      throw new ApiError(409, "ALREADY_ACTIVE", "Ya solicitaste este objeto");
    });
    const res = await handler(new Request("http://localhost/api"), undefined);
    expect(res.status).toBe(409);
    expect(await res.json()).toMatchObject({
      error: { code: "ALREADY_ACTIVE", message: "Ya solicitaste este objeto" },
    });
  });

  it("traduce ZodError a 400 con código VALIDATION_ERROR", async () => {
    const handler = route(async (req) => {
      await parseBody(req, z.object({ count: z.number() }));
      return Response.json({ ok: true });
    });
    const res = await handler(
      new Request("http://localhost/api", {
        method: "POST",
        body: JSON.stringify({ count: "invalido" }),
      }),
      undefined,
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  it("oculta información interna del servidor en errores no controlados (500)", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const handler = route(async () => {
      throw new Error("clave-secreta-interna-de-base-de-datos");
    });
    const res = await handler(new Request("http://localhost/api"), undefined);
    expect(res.status).toBe(500);
    const text = await res.text();
    expect(text).not.toContain("clave-secreta");
    spy.mockRestore();
  });
});
