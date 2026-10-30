import type { Metadata } from "next";
import { Suspense } from "react";
import { HighchartsDashboard } from "@/components/highcharts-dashboard";
import { buttonClass, inputClass } from "@/components/ui";
import { getReportsSummary, getStudentReport } from "@/lib/data/reports";
import type { Gender, StudentReport } from "@/lib/types";
import { requireWebUser } from "@/lib/web/session";

export const metadata: Metadata = { title: "Reportes de ReUsa" };

function StudentReportView({ report }: { report: StudentReport }) {
  return (
    <div className="flex flex-col gap-8">
      {/* Métricas del Estudiante */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <span className="text-xs text-zinc-500 block">Objetos Publicados</span>
          <strong className="text-2xl font-extrabold text-zinc-800 dark:text-zinc-100">
            {report.publishedItems.total}
          </strong>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <span className="text-xs text-zinc-500 block">Aprobados por Moderación</span>
          <strong className="text-2xl font-extrabold text-emerald-600">
            {report.publishedItems.approved}
          </strong>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <span className="text-xs text-zinc-500 block">Objetos Rechazados</span>
          <strong className="text-2xl font-extrabold text-rose-600">
            {report.publishedItems.rejected}
          </strong>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <span className="text-xs text-zinc-500 block">Donaciones Aprobadas a Otros</span>
          <strong className="text-2xl font-extrabold text-blue-600">
            {report.donationsGiven.approvedCount}
          </strong>
        </div>
      </div>

      {/* 1. Mis Objetos Puestos a Donar */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
          <span>📦</span> Mis Objetos Puestos a Donar (Aprobados, Pendientes y Rechazados)
        </h2>
        {report.publishedItems.items.length === 0 ? (
          <p className="text-sm text-zinc-500">Aún no has publicado objetos para donar.</p>
        ) : (
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
            {report.publishedItems.items.map((item) => (
              <div key={item.id} className="py-4 flex flex-col gap-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="font-semibold text-base text-zinc-900 dark:text-zinc-100">
                      {item.title}
                    </h3>
                    <span className="text-xs text-zinc-500">Categoría: {item.category}</span>
                  </div>
                  <div>
                    {item.status === "approved" ? (
                      <span className="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                        {item.available ? "✓ Aprobado en catálogo" : "✓ Donado / Confirmado"}
                      </span>
                    ) : item.status === "pending_approval" ? (
                      <span className="inline-flex items-center rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                        ⏳ En revisión de moderación
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
                        ✕ Rechazado por supervisor
                      </span>
                    )}
                  </div>
                </div>

                {item.status === "rejected" && (
                  <div className="rounded-xl border border-rose-200 bg-rose-50/70 p-4 text-xs text-rose-900 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200 mt-2">
                    <p className="font-bold flex items-center gap-1.5 text-sm">
                      <span>⚠️</span> Detalle del Rechazo por Moderación
                    </p>
                    <div className="mt-2 space-y-1">
                      <p>
                        <strong>Revisado por:</strong> {item.reviewedByName ?? "Supervisor ReUsa"}{" "}
                        {item.reviewedByEmail ? `(${item.reviewedByEmail})` : ""}
                      </p>
                      {item.reviewedAt && (
                        <p>
                          <strong>Fecha de revisión:</strong>{" "}
                          {new Date(item.reviewedAt).toLocaleString("es-CO")}
                        </p>
                      )}
                      <p>
                        <strong>Motivo de rechazo:</strong>{" "}
                        <span className="italic">{item.rejectionReason ?? "No especificado"}</span>
                      </p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 2. Donaciones Aprobadas a Compañeros */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
          <span>🤝</span> Compañeros a quienes les aprobé donar ({report.donationsGiven.recipients.length})
        </h2>
        {report.donationsGiven.recipients.length === 0 ? (
          <p className="text-sm text-zinc-500">
            Aún no has aprobado solicitudes de donación para tus objetos.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-zinc-200 dark:border-zinc-800 text-xs text-zinc-500 uppercase">
                <tr>
                  <th className="pb-3">Objeto</th>
                  <th className="pb-3">Estudiante Beneficiario</th>
                  <th className="pb-3">Contacto</th>
                  <th className="pb-3 text-center">Estado</th>
                  <th className="pb-3 text-right">Fecha Aprobación</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {report.donationsGiven.recipients.map((r) => (
                  <tr key={r.requestId}>
                    <td className="py-3 font-semibold">{r.itemTitle}</td>
                    <td className="py-3">{r.applicantName}</td>
                    <td className="py-3 text-xs text-zinc-500">
                      <div>{r.applicantEmail}</div>
                      {r.applicantPhone ? <div>Tel: {r.applicantPhone}</div> : null}
                    </td>
                    <td className="py-3 text-center">
                      <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                        {r.status === "delivered" ? "Entregado" : "Aprobado para donar"}
                      </span>
                    </td>
                    <td className="py-3 text-right text-xs text-zinc-500">
                      {r.resolvedAt
                        ? new Date(r.resolvedAt).toLocaleDateString("es-CO")
                        : new Date(r.requestedAt).toLocaleDateString("es-CO")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 3. Mis Solicitudes de Objetos Realizadas */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
          <span>🙋</span> Solicitudes que he realizado a otros compañeros ({report.requestsMade.total})
        </h2>
        {report.requestsMade.items.length === 0 ? (
          <p className="text-sm text-zinc-500">No has solicitado ningún objeto aún.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-zinc-200 dark:border-zinc-800 text-xs text-zinc-500 uppercase">
                <tr>
                  <th className="pb-3">Objeto Solicitado</th>
                  <th className="pb-3">Publicador / Donante</th>
                  <th className="pb-3 text-center">Estado</th>
                  <th className="pb-3 text-right">Fecha Solicitud</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {report.requestsMade.items.map((r) => (
                  <tr key={r.requestId}>
                    <td className="py-3 font-semibold">{r.itemTitle}</td>
                    <td className="py-3">
                      <div>{r.publisherName}</div>
                      <div className="text-xs text-zinc-500">{r.publisherEmail}</div>
                    </td>
                    <td className="py-3 text-center">
                      {r.status === "approved" ? (
                        <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
                          ✓ Aprobada por {r.publisherName}
                        </span>
                      ) : r.status === "rejected" ? (
                        <span className="inline-flex items-center rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-semibold text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">
                          ✕ Rechazada por {r.publisherName}
                        </span>
                      ) : r.status === "delivered" ? (
                        <span className="inline-flex items-center rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-semibold text-purple-800 dark:bg-purple-950/60 dark:text-purple-300">
                          🎉 Entregada
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">
                          ⏳ Pendiente de respuesta
                        </span>
                      )}
                    </td>
                    <td className="py-3 text-right text-xs text-zinc-500">
                      {new Date(r.requestedAt).toLocaleDateString("es-CO")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

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
  const user = await requireWebUser(["student", "supervisor", "admin"]);
  const params = await searchParams;

  // Si el usuario es un estudiante, se muestra su propio reporte detallado
  if (user.role === "student") {
    const studentReport = await getStudentReport(user.uid);
    return <StudentReportView report={studentReport} />;
  }

  // Vista para Administradores y Supervisores
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
          Métricas de impacto universitario: seguimiento a objetos donados, aprobaciones y solicitudes comunitarias.
        </p>
      </div>

      <Suspense fallback={<div className="h-64 animate-pulse rounded-2xl bg-zinc-200 dark:bg-zinc-800" />}>
        <ReportsContent searchParams={props.searchParams} />
      </Suspense>
    </div>
  );
}
