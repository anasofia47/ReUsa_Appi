import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/errors";

const verifyIdToken = vi.fn();
vi.mock("@/lib/services/auth", () => ({
  verifyIdToken: (t: string) => verifyIdToken(t),
}));

import { assertRole, requireUser } from "@/lib/guard";
import type { AuthUser } from "@/lib/types";

const req = (authorization?: string) =>
  new Request("http://localhost/api", {
    headers: authorization ? { authorization } : {},
  });

beforeEach(() => verifyIdToken.mockReset());

describe("requireUser", () => {
  it("rechaza peticiones sin cabecera Authorization con 401", async () => {
    await expect(requireUser(req())).rejects.toMatchObject({
      status: 401,
      code: "UNAUTHENTICATED",
    });
  });

  it("rechaza esquemas distintos de Bearer", async () => {
    await expect(requireUser(req("Basic dXNlcjpwYXNz"))).rejects.toMatchObject({
      status: 401,
    });
    expect(verifyIdToken).not.toHaveBeenCalled();
  });

  it("devuelve el usuario cuando el token es válido", async () => {
    const mockUser: AuthUser = { uid: "u1", email: "estudiante@tdea.edu.co", name: "Estudiante", role: "student" };
    verifyIdToken.mockResolvedValue(mockUser);
    await expect(requireUser(req("Bearer token-valido"))).resolves.toEqual(mockUser);
  });
});

describe("assertRole", () => {
  const studentUser: AuthUser = { uid: "u1", email: "stu@tdea.edu.co", name: "Estudiante", role: "student" };
  const supervisorUser: AuthUser = { uid: "u2", email: "sup@tdea.edu.co", name: "Supervisor", role: "supervisor" };

  it("permite el acceso si el rol coincide", () => {
    expect(() => assertRole(studentUser, "student")).not.toThrow();
    expect(() => assertRole(supervisorUser, ["supervisor", "admin"])).not.toThrow();
  });

  it("lanza 403 FORBIDDEN si el rol no tiene permisos", () => {
    try {
      assertRole(studentUser, "supervisor");
      throw new Error("debió fallar");
    } catch (e) {
      expect(e).toBeInstanceOf(ApiError);
      expect((e as ApiError).status).toBe(403);
    }
  });
});
