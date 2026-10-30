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
  /** Compatibilidad con ReUsaApp */
  state?: string;
  deliveryPoint: string;
  publisherId: string;
  /** Compatibilidad con ReUsaApp */
  publishedBy?: string;
  publisherEmail: string;
  publisherName: string;
  publisherGender?: Gender;
  /** Compatibilidad con ReUsaApp */
  sex?: Gender;
  status: ItemStatus;
  available: boolean;
  coverUrl: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
  rejectionReason: string | null;
  /** Compatibilidad con ReUsaApp */
  reviewComment?: string | null;
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
  /** Compatibilidad con ReUsaApp */
  userId?: string;
  userEmail?: string;
  userName?: string;
  applicantPhone: string;
  message: string;
  status: RequestStatus;
  rejectionReason?: string | null;
  /** Llave de idempotencia generada por el cliente (soporte offline). */
  clientRequestId: string;
  requestedAt: string;
  resolvedAt: string | null;
  deliveredAt: string | null;
  updatedAt: string;
}

export type RequestAction = "approve" | "reject" | "deliver";
export type ReviewAction = "approve" | "reject";

export interface Notification {
  id: string;
  userId?: string;
  targetRole?: Role;
  title: string;
  message: string;
  type: "item_submitted" | "item_reviewed" | "item_requested" | "request_resolved";
  targetPath: string;
  read: boolean;
  readBy?: string[];
  createdAt: string;
}

export interface StudentReport {
  publishedItems: {
    total: number;
    approved: number;
    pending: number;
    rejected: number;
    items: Array<{
      id: string;
      title: string;
      category: string;
      status: ItemStatus;
      rejectionReason: string | null;
      reviewedBy: string | null;
      reviewedByName: string | null;
      reviewedByEmail: string | null;
      reviewedAt: string | null;
      available: boolean;
      createdAt: string;
    }>;
  };
  donationsGiven: {
    total: number;
    approvedCount: number;
    deliveredCount: number;
    recipients: Array<{
      requestId: string;
      itemId: string;
      itemTitle: string;
      applicantId: string;
      applicantName: string;
      applicantEmail: string;
      applicantPhone: string;
      status: RequestStatus;
      requestedAt: string;
      resolvedAt: string | null;
      deliveredAt: string | null;
    }>;
  };
  requestsMade: {
    total: number;
    approved: number;
    pending: number;
    rejected: number;
    delivered: number;
    items: Array<{
      requestId: string;
      itemId: string;
      itemTitle: string;
      publisherId: string;
      publisherName: string;
      publisherEmail: string;
      status: RequestStatus;
      requestedAt: string;
      resolvedAt: string | null;
      rejectionReason?: string | null;
    }>;
  };
}

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
