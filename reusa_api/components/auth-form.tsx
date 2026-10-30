"use client";

import Link from "next/link";
import { useState } from "react";
import { Alert, buttonClass, inputClass } from "./ui";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isLogin = mode === "login";

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    try {
      if (isLogin) {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
          credentials: "include",
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error?.message ?? "Correo o contraseña incorrectos");
          setPending(false);
          return;
        }
        window.location.href =
          data.user?.role === "supervisor" || data.user?.role === "admin"
            ? "/supervisor"
            : "/items";
      } else {
        const displayName = String(formData.get("displayName") ?? "").trim();
        const gender = String(formData.get("gender") ?? "otro");
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password, displayName, gender }),
          credentials: "include",
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error?.message ?? "Error al crear la cuenta");
          setPending(false);
          return;
        }
        window.location.href = "/items";
      }
    } catch {
      setError("No se pudo conectar con el servicio de autenticación.");
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {!isLogin && (
        <>
          <label className="flex flex-col gap-1 text-sm font-medium">
            Nombre completo
            <input
              name="displayName"
              required
              minLength={2}
              placeholder="Ej: Laura Gómez"
              autoComplete="name"
              className={inputClass}
            />
          </label>

          <label className="flex flex-col gap-1 text-sm font-medium">
            Sexo
            <select name="gender" required className={inputClass}>
              <option value="femenino">Femenino</option>
              <option value="masculino">Masculino</option>
              <option value="otro">Otro / Prefiero no decir</option>
            </select>
          </label>
        </>
      )}

      <label className="flex flex-col gap-1 text-sm font-medium">
        Correo institucional / personal
        <input
          name="email"
          type="email"
          required
          placeholder="tu@correo.com"
          autoComplete="email"
          className={inputClass}
        />
      </label>

      <label className="flex flex-col gap-1 text-sm font-medium">
        Contraseña
        <input
          name="password"
          type="password"
          required
          placeholder="••••••••"
          minLength={isLogin ? 1 : 6}
          autoComplete={isLogin ? "current-password" : "new-password"}
          className={inputClass}
        />
      </label>

      {error && <Alert kind="error">{error}</Alert>}

      <button type="submit" disabled={pending} className={buttonClass}>
        {pending ? "Procesando…" : isLogin ? "Iniciar sesión" : "Crear cuenta de estudiante"}
      </button>

      <p className="text-center text-sm text-zinc-600 dark:text-zinc-400">
        {isLogin ? (
          <>
            ¿Aún no tienes cuenta?{" "}
            <Link href="/register" className="text-emerald-600 underline font-semibold">
              Regístrate aquí
            </Link>
          </>
        ) : (
          <>
            ¿Ya tienes cuenta?{" "}
            <Link href="/login" className="text-emerald-600 underline font-semibold">
              Inicia sesión
            </Link>
          </>
        )}
      </p>
    </form>
  );
}
