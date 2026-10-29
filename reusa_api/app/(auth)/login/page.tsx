import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { AuthForm } from "@/components/auth-form";
import { getWebUser } from "@/lib/web/session";

export const metadata: Metadata = { title: "Iniciar sesión" };

async function RedirectIfSignedIn() {
  if (await getWebUser()) redirect("/items");
  return null;
}

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-md pt-8">
      <Suspense>
        <RedirectIfSignedIn />
      </Suspense>
      <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="text-center mb-6">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700 text-2xl font-bold mb-3 dark:bg-emerald-950 dark:text-emerald-300">
            ♻
          </div>
          <h1 className="text-2xl font-bold">Bienvenido a ReUsa</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Inicia sesión para solicitar y donar objetos universitarios
          </p>
        </div>
        <AuthForm mode="login" />
      </div>
    </div>
  );
}
