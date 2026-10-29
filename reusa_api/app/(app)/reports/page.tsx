import type { Metadata } from "next";
import { Suspense } from "react";
import { HighchartsDashboard } from "@/components/highcharts-dashboard";
import { buttonClass, inputClass } from "@/components/ui";
import { getReportsSummary } from "@/lib/data/reports";
import type { Gender } from "@/lib/types";
import { requireWebUser } from "@/lib/web/session";

export const metadata: Metadata = { title: "Reportes de ReUsa · Administrador" };

async function ReportsContent({
  searchParams,
}: {
  searchParams: Promise<{
    startDate?: string;
    endDate?: string;
    userId?: string;
    category?: string;
    gender?: string;
  }>;
}) {
  await requireWebUser(["admin", "supervisor"]);
  const params = await searchParams;

  const summary = await getReportsSummary({
    startDate: params.startDate,
    endDate: params.endDate,
    userId: params.userId,
    category: params.category,
    gender: (params.gender as Gender) || undefined,
  });

  return (
    <div className="flex flex-col gap-8">
      {/* Formulario de Filtros */}
      <form className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 p-5 rounded-2xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <label className="flex flex-col gap-1 text-xs font-semibold text-zinc-600 dark:text-zinc-400">
          Fecha Inicial
          <input
            type="date"
            name="startDate"
            defaultValue={params.startDate ?? ""}
            className={inputClass}
          />
        </label>

        <label className="flex flex-col gap-1 text-xs font-semibold text-zinc-600 dark:text-zinc-400">
          Fecha Final
          <input
            type="date"
            name="endDate"
            defaultValue={params.endDate ?? ""}
            className={inputClass}
          />
        </label>

        <label className="flex flex-col gap-1 text-xs font-semibold text-zinc-600 dark:text-zinc-400">
          Categoría
          <input
            type="text"
            name="category"
            defaultValue={params.category ?? ""}
            placeholder="Ej: Libros, Tecnología..."
            className={inputClass}
          />
        </label>

        <label className="flex flex-col gap-1 text-xs font-semibold text-zinc-600 dark:text-zinc-400">
          Sexo del Donante
          <select name="gender" defaultValue={params.gender ?? ""} className={inputClass}>
            <option value="">Todos los sexos</option>
            <option value="femenino">Femenino</option>
            <option value="masculino">Masculino</option>
            <option value="otro">Otro</option>
          </select>
        </label>

        <div className="flex items-end">
          <button type="submit" className={`${buttonClass} w-full`}>
            Aplicar Filtros
          </button>
        </div>
      </form>

      {/* Tarjetas de Métricas Generales */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <span className="text-xs text-zinc-500 block">Total Publicados</span>
          <strong className="text-2xl font-extrabold text-zinc-800 dark:text-zinc-100">
            {summary.totalPublished}
          </strong>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <span className="text-xs text-zinc-500 block">Aprobados por Supervisor</span>
          <strong className="text-2xl font-extrabold text-emerald-600">
            {summary.totalApproved}
          </strong>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <span className="text-xs text-zinc-500 block">Pendientes de Revisión</span>
          <strong className="text-2xl font-extrabold text-amber-600">
            {summary.totalPending}
          </strong>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <span className="text-xs text-zinc-500 block">Peticiones de Interesados</span>
          <strong className="text-2xl font-extrabold text-blue-600">
            {summary.totalRequests}
          </strong>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <span className="text-xs text-zinc-500 block">Entregados con Éxito</span>
          <strong className="text-2xl font-extrabold text-purple-600">
            {summary.totalDelivered}
          </strong>
        </div>
      </div>

      {/* Dashboard Interactivo con Highcharts */}
      <div>
        <h2 className="text-lg font-bold mb-4">Gráficos Analíticos Interactivos (Highcharts)</h2>
        <HighchartsDashboard summary={summary} />
      </div>

      {/* Tabla 1: Objetos publicados por Usuario */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-lg font-bold mb-4">Objetos Publicados por Usuario</h2>
        {summary.byUser.length === 0 ? (
          <p className="text-sm text-zinc-500">No hay datos en el rango seleccionado.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-zinc-200 dark:border-zinc-800 text-xs text-zinc-500 uppercase">
                <tr>
                  <th className="pb-3">Usuario</th>
                  <th className="pb-3">Correo</th>
                  <th className="pb-3 text-center">Sexo</th>
                  <th className="pb-3 text-center">Total Donados</th>
                  <th className="pb-3 text-center">Aprobados</th>
                  <th className="pb-3 text-center">En Revisión</th>
                  <th className="pb-3 text-center">Entregados</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {summary.byUser.map((u) => (
                  <tr key={u.userId}>
                    <td className="py-3 font-medium">{u.userName}</td>
                    <td className="py-3 text-zinc-500">{u.userEmail}</td>
                    <td className="py-3 text-center capitalize">{u.gender}</td>
                    <td className="py-3 text-center font-bold">{u.totalPublished}</td>
                    <td className="py-3 text-center text-emerald-600 font-semibold">{u.approved}</td>
                    <td className="py-3 text-center text-amber-600">{u.pending}</td>
                    <td className="py-3 text-center text-purple-600 font-semibold">{u.delivered}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Tabla 2: Objetos por Categoría */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-lg font-bold mb-4">Distribución de Objetos por Categoría</h2>
        {summary.byCategory.length === 0 ? (
          <p className="text-sm text-zinc-500">No hay datos en el rango seleccionado.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-zinc-200 dark:border-zinc-800 text-xs text-zinc-500 uppercase">
                <tr>
                  <th className="pb-3">Categoría</th>
                  <th className="pb-3 text-center">Total Objetos</th>
                  <th className="pb-3 text-center">Aprobados</th>
                  <th className="pb-3 text-center">Entregados</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {summary.byCategory.map((c) => (
                  <tr key={c.category}>
                    <td className="py-3 font-medium">{c.category}</td>
                    <td className="py-3 text-center font-bold">{c.totalItems}</td>
                    <td className="py-3 text-center text-emerald-600 font-semibold">{c.approved}</td>
                    <td className="py-3 text-center text-purple-600 font-semibold">{c.delivered}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Tabla 3: Distribución por Sexo */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-lg font-bold mb-4">Distribución de Publicaciones por Sexo</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-zinc-200 dark:border-zinc-800 text-xs text-zinc-500 uppercase">
              <tr>
                <th className="pb-3">Sexo</th>
                <th className="pb-3 text-center">Total Objetos</th>
                <th className="pb-3 text-center">Aprobados</th>
                <th className="pb-3 text-center">Pendientes</th>
                <th className="pb-3 text-center">Entregados</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
              {summary.byGender.map((g) => (
                <tr key={g.gender}>
                  <td className="py-3 font-medium capitalize">{g.gender}</td>
                  <td className="py-3 text-center font-bold">{g.totalItems}</td>
                  <td className="py-3 text-center text-emerald-600 font-semibold">{g.approved}</td>
                  <td className="py-3 text-center text-amber-600">{g.pending}</td>
                  <td className="py-3 text-center text-purple-600 font-semibold">{g.delivered}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function ReportsPage(props: {
  searchParams: Promise<{
    startDate?: string;
    endDate?: string;
    userId?: string;
    category?: string;
    gender?: string;
  }>;
}) {
  return (
    <div className="max-w-6xl mx-auto flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Reportes de Actividad · ReUsa</h1>
        <p className="text-sm text-zinc-500">
          Métricas de impacto universitario: objetos publicados por usuario, categorías, sexo y rango de fechas.
        </p>
      </div>

      <Suspense fallback={<div className="h-64 animate-pulse rounded-2xl bg-zinc-200 dark:bg-zinc-800" />}>
        <ReportsContent searchParams={props.searchParams} />
      </Suspense>
    </div>
  );
}
