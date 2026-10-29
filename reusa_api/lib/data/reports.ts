import "server-only";
import { db } from "../firebase";
import type {
  Gender,
  ReportItemByCategory,
  ReportItemByGender,
  ReportItemByUser,
  ReportPublicationRequests,
  ReportSummary,
} from "../types";
import { ITEMS, toItem } from "./items";
import { REQUESTS } from "./requests";

export interface ReportFilter {
  startDate?: string;
  endDate?: string;
  userId?: string;
  category?: string;
  gender?: Gender;
}

export async function getReportsSummary(filter: ReportFilter = {}): Promise<ReportSummary> {
  const firestore = db();
  const [itemsSnap, requestsSnap, usersSnap] = await Promise.all([
    firestore.collection(ITEMS).get(),
    firestore.collection(REQUESTS).get(),
    firestore.collection("users").get(),
  ]);

  // Mapa de usuarios y sus géneros
  const userGenderMap = new Map<string, Gender>();
  for (const doc of usersSnap.docs) {
    const uData = doc.data();
    if (uData.gender) {
      userGenderMap.set(doc.id, uData.gender as Gender);
    }
  }

  let items = itemsSnap.docs.map((d) => {
    const item = toItem(d.id, d.data() as never);
    const resolvedGender: Gender =
      item.publisherGender ?? userGenderMap.get(item.publisherId) ?? "otro";
    return { ...item, publisherGender: resolvedGender };
  });

  let requests = requestsSnap.docs.map((d) => d.data() as {
    itemId: string;
    applicantId: string;
    publisherId: string;
    status: string;
    requestedAt: string;
    deliveredAt?: string | null;
  });

  // Filtro por fecha inicial (YYYY-MM-DD o ISO)
  if (filter.startDate) {
    const startIso = new Date(filter.startDate).toISOString();
    items = items.filter((i) => i.createdAt >= startIso);
    requests = requests.filter((r) => r.requestedAt >= startIso);
  }

  // Filtro por fecha final (YYYY-MM-DD o ISO)
  if (filter.endDate) {
    const end = new Date(filter.endDate);
    end.setHours(23, 59, 59, 999);
    const endIso = end.toISOString();
    items = items.filter((i) => i.createdAt <= endIso);
    requests = requests.filter((r) => r.requestedAt <= endIso);
  }

  // Filtro por usuario específico
  if (filter.userId) {
    items = items.filter((i) => i.publisherId === filter.userId);
  }

  // Filtro por categoría específica
  if (filter.category) {
    items = items.filter((i) => i.category.toLowerCase() === filter.category!.toLowerCase());
  }

  // Filtro por sexo específico
  if (filter.gender) {
    items = items.filter((i) => (i.publisherGender ?? "otro") === filter.gender);
  }

  // Métricas generales
  const totalPublished = items.length;
  const totalApproved = items.filter((i) => i.status === "approved").length;
  const totalPending = items.filter((i) => i.status === "pending_approval").length;
  const totalDelivered = items.filter((i) => !i.available && i.status === "approved").length;
  const totalRequests = requests.length;

  // Agrupación por usuario
  const usersMap = new Map<string, ReportItemByUser>();
  for (const item of items) {
    const key = item.publisherId;
    if (!usersMap.has(key)) {
      usersMap.set(key, {
        userId: key,
        userEmail: item.publisherEmail,
        userName: item.publisherName,
        gender: item.publisherGender ?? "otro",
        totalPublished: 0,
        approved: 0,
        pending: 0,
        delivered: 0,
      });
    }
    const stat = usersMap.get(key)!;
    stat.totalPublished++;
    if (item.status === "approved") stat.approved++;
    if (item.status === "pending_approval") stat.pending++;
    if (!item.available && item.status === "approved") stat.delivered++;
  }

  // Agrupación por categoría
  const categoryMap = new Map<string, ReportItemByCategory>();
  for (const item of items) {
    const cat = item.category || "General";
    if (!categoryMap.has(cat)) {
      categoryMap.set(cat, {
        category: cat,
        totalItems: 0,
        approved: 0,
        pending: 0,
        delivered: 0,
      });
    }
    const catStat = categoryMap.get(cat)!;
    catStat.totalItems++;
    if (item.status === "approved") catStat.approved++;
    if (item.status === "pending_approval") catStat.pending++;
    if (!item.available && item.status === "approved") catStat.delivered++;
  }

  // Agrupación por sexo (masculino, femenino, otro)
  const genderMap: Record<Gender, ReportItemByGender> = {
    masculino: { gender: "masculino", totalItems: 0, approved: 0, pending: 0, delivered: 0 },
    femenino: { gender: "femenino", totalItems: 0, approved: 0, pending: 0, delivered: 0 },
    otro: { gender: "otro", totalItems: 0, approved: 0, pending: 0, delivered: 0 },
  };

  for (const item of items) {
    const g = (item.publisherGender as Gender) ?? "otro";
    const bucket = genderMap[g] ?? genderMap.otro;
    bucket.totalItems++;
    if (item.status === "approved") bucket.approved++;
    if (item.status === "pending_approval") bucket.pending++;
    if (!item.available && item.status === "approved") bucket.delivered++;
  }

  // Solicitudes de publicación (totales, aprobadas, pendientes, rechazadas)
  const rejectedPubs = items.filter((i) => i.status === "rejected").length;

  const pubRequestsByUser = Array.from(usersMap.values()).map((u) => ({
    userId: u.userId,
    userName: u.userName,
    count: u.totalPublished,
  }));

  const pubRequestsByCategory = Array.from(categoryMap.values()).map((c) => ({
    category: c.category,
    count: c.totalItems,
  }));

  const pubRequestsByGender = Object.values(genderMap).map((g) => ({
    gender: g.gender,
    count: g.totalItems,
  }));

  const publicationRequests: ReportPublicationRequests = {
    total: totalPublished,
    pending: totalPending,
    approved: totalApproved,
    rejected: rejectedPubs,
    byUser: pubRequestsByUser.sort((a, b) => b.count - a.count),
    byCategory: pubRequestsByCategory.sort((a, b) => b.count - a.count),
    byGender: pubRequestsByGender,
  };

  return {
    startDate: filter.startDate ?? "",
    endDate: filter.endDate ?? "",
    totalPublished,
    totalApproved,
    totalPending,
    totalRequests,
    totalDelivered,
    byUser: Array.from(usersMap.values()).sort((a, b) => b.totalPublished - a.totalPublished),
    byCategory: Array.from(categoryMap.values()).sort((a, b) => b.totalItems - a.totalItems),
    byGender: Object.values(genderMap),
    publicationRequests,
  };
}
