export type Role = "student" | "supervisor" | "admin";
export type Gender = "masculino" | "femenino" | "otro";

export interface AuthUser {
  uid: string;
  email: string;
  name: string;
  role: Role;
  gender?: Gender;
}

export type ItemStatus = "pending_approval" | "approved" | "rejected";

export interface Item {
  id: string;
  title: string;
  description: string;
  category: string;
  condition: string;
  deliveryPoint: string;
  publisherId: string;
  publisherEmail: string;
  publisherName: string;
  publisherGender?: Gender;
  status: ItemStatus;
  available: boolean;
  coverUrl: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  rejectionReason: string | null;
  createdAt: string;
  /** ISO 8601. Se usa como cursor para sincronizacion incremental (?updatedSince=). */
  updatedAt: string;
}

export type RequestStatus = "requested" | "approved" | "rejected" | "delivered";

export interface ItemRequest {
  id: string;
  itemId: string;
  itemTitle: string;
  publisherId: string;
  publisherEmail: string;
  publisherName: string;
  applicantId: string;
  applicantEmail: string;
  applicantName: string;
  applicantPhone: string;
  message: string;
  status: RequestStatus;
  /** Llave de idempotencia generada por el cliente (soporte offline). */
  clientRequestId: string;
  requestedAt: string;
  resolvedAt: string | null;
  deliveredAt: string | null;
  updatedAt: string;
}

export type RequestAction = "approve" | "reject" | "deliver";
export type ReviewAction = "approve" | "reject";

export interface TokenSet {
  idToken: string;
  refreshToken: string;
  /** Segundos de vigencia del idToken. */
  expiresIn: number;
}

export interface ReportItemByUser {
  userId: string;
  userEmail: string;
  userName: string;
  gender: string;
  totalPublished: number;
  approved: number;
  pending: number;
  delivered: number;
}

export interface ReportItemByCategory {
  category: string;
  totalItems: number;
  approved: number;
  pending: number;
  delivered: number;
}

export interface ReportItemByGender {
  gender: string;
  totalItems: number;
  approved: number;
  pending: number;
  delivered: number;
}

export interface ReportPublicationRequests {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  byUser: { userId: string; userName: string; count: number }[];
  byCategory: { category: string; count: number }[];
  byGender: { gender: string; count: number }[];
}

export interface ReportSummary {
  startDate: string;
  endDate: string;
  totalPublished: number;
  totalApproved: number;
  totalPending: number;
  totalRequests: number;
  totalDelivered: number;
  byUser: ReportItemByUser[];
  byCategory: ReportItemByCategory[];
  byGender: ReportItemByGender[];
  publicationRequests: ReportPublicationRequests;
}
