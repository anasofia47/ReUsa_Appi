"use client";

import Highcharts from "highcharts";
import HighchartsReact from "highcharts-react-official";
import type { ReportSummary } from "@/lib/types";

interface Props {
  summary: ReportSummary;
}

export function HighchartsDashboard({ summary }: Props) {
  // 1. Opciones para Gráfico por Categoría
  const categoriesList = summary.byCategory.map((c) => c.category);
  const totalByCategory = summary.byCategory.map((c) => c.totalItems);
  const approvedByCategory = summary.byCategory.map((c) => c.approved);
  const deliveredByCategory = summary.byCategory.map((c) => c.delivered);

  const categoryChartOptions: Highcharts.Options = {
    chart: {
      type: "column",
      backgroundColor: "transparent",
      style: { fontFamily: "inherit" },
    },
    title: {
      text: "Objetos Publicados por Categoría",
      style: { fontWeight: "bold", fontSize: "16px" },
    },
    subtitle: {
      text: "Desglose de artículos donados, aprobados y entregados en el campus",
      style: { fontSize: "12px", color: "#64748b" },
    },
    xAxis: {
      categories: categoriesList.length > 0 ? categoriesList : ["Sin datos"],
      crosshair: true,
    },
    yAxis: {
      min: 0,
      title: { text: "Cantidad de Objetos" },
    },
    tooltip: {
      shared: true,
      valueSuffix: " objetos",
    },
    plotOptions: {
      column: {
        borderRadius: 4,
      },
    },
    series: [
      {
        name: "Total Publicados",
        type: "column",
        data: totalByCategory,
        color: "#0284c7",
      },
      {
        name: "Aprobados",
        type: "column",
        data: approvedByCategory,
        color: "#10b981",
      },
      {
        name: "Entregados",
        type: "column",
        data: deliveredByCategory,
        color: "#8b5cf6",
      },
    ],
    credits: { enabled: false },
  };

  // 2. Opciones para Gráfico por Sexo (Torta / Donut)
  const genderPieData = summary.byGender.map((g) => ({
    name: g.gender.charAt(0).toUpperCase() + g.gender.slice(1),
    y: g.totalItems,
    color:
      g.gender === "femenino"
        ? "#ec4899"
        : g.gender === "masculino"
        ? "#3b82f6"
        : "#a855f7",
  }));

  const genderChartOptions: Highcharts.Options = {
    chart: {
      type: "pie",
      backgroundColor: "transparent",
      style: { fontFamily: "inherit" },
    },
    title: {
      text: "Publicaciones según Sexo del Donante",
      style: { fontWeight: "bold", fontSize: "16px" },
    },
    subtitle: {
      text: "Masculino, Femenino y Otro",
      style: { fontSize: "12px", color: "#64748b" },
    },
    tooltip: {
      pointFormat: "{series.name}: <b>{point.y}</b> ({point.percentage:.1f}%)",
    },
    plotOptions: {
      pie: {
        innerSize: "55%",
        allowPointSelect: true,
        cursor: "pointer",
        dataLabels: {
          enabled: true,
          format: "<b>{point.name}</b>: {point.y} ({point.percentage:.1f}%)",
          style: { fontSize: "11px" },
        },
      },
    },
    series: [
      {
        name: "Objetos",
        type: "pie",
        data: genderPieData.length > 0 && summary.totalPublished > 0
          ? genderPieData
          : [{ name: "Sin datos", y: 1, color: "#e2e8f0" }],
      },
    ],
    credits: { enabled: false },
  };

  // 3. Opciones para Solicitudes de Publicación (Estado de moderación)
  const statusOptions: Highcharts.Options = {
    chart: {
      type: "bar",
      backgroundColor: "transparent",
      style: { fontFamily: "inherit" },
    },
    title: {
      text: "Estado de Solicitudes de Publicación",
      style: { fontWeight: "bold", fontSize: "16px" },
    },
    subtitle: {
      text: "Revisadas por el supervisor en el rango de fechas",
      style: { fontSize: "12px", color: "#64748b" },
    },
    xAxis: {
      categories: ["Aprobadas", "Pendientes de Revisión", "Rechazadas"],
    },
    yAxis: {
      min: 0,
      title: { text: "Total de Solicitudes" },
    },
    legend: { enabled: false },
    plotOptions: {
      bar: {
        borderRadius: 4,
        colorByPoint: true,
        colors: ["#10b981", "#f59e0b", "#ef4444"],
      },
    },
    series: [
      {
        name: "Solicitudes",
        type: "bar",
        data: [
          summary.publicationRequests.approved,
          summary.publicationRequests.pending,
          summary.publicationRequests.rejected,
        ],
      },
    ],
    credits: { enabled: false },
  };

  // 4. Opciones para Objetos Publicados por Usuario (Top)
  const topUsers = summary.byUser.slice(0, 7);
  const userChartOptions: Highcharts.Options = {
    chart: {
      type: "bar",
      backgroundColor: "transparent",
      style: { fontFamily: "inherit" },
    },
    title: {
      text: "Objetos Publicados por Usuario",
      style: { fontWeight: "bold", fontSize: "16px" },
    },
    subtitle: {
      text: "Estudiantes con mayor participación en donaciones",
      style: { fontSize: "12px", color: "#64748b" },
    },
    xAxis: {
      categories: topUsers.length > 0 ? topUsers.map((u) => u.userName) : ["Sin datos"],
    },
    yAxis: {
      min: 0,
      title: { text: "Artículos Donados" },
    },
    plotOptions: {
      bar: {
        borderRadius: 4,
      },
    },
    series: [
      {
        name: "Total Publicados",
        type: "bar",
        data: topUsers.map((u) => u.totalPublished),
        color: "#059669",
      },
      {
        name: "Entregados",
        type: "bar",
        data: topUsers.map((u) => u.delivered),
        color: "#6366f1",
      },
    ],
    credits: { enabled: false },
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <HighchartsReact highcharts={Highcharts} options={categoryChartOptions} />
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <HighchartsReact highcharts={Highcharts} options={genderChartOptions} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <HighchartsReact highcharts={Highcharts} options={statusOptions} />
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <HighchartsReact highcharts={Highcharts} options={userChartOptions} />
        </div>
      </div>
    </div>
  );
}
