export type Role = 'student' | 'supervisor' | 'admin' | 'librarian';
export type Sex = 'masculino' | 'femenino' | 'otro';

export interface User {
  uid: string;
  email: string;
  name: string;
  role: Role;
  sex?: Sex;
}

export interface TokenSet {
  idToken: string;
  refreshToken: string;
  /** Segundos de vigencia del idToken. */
  expiresIn: number;
}

export interface AuthResult {
  tokens: TokenSet;
  user: User;
}

/** Objeto/producto donado en ReUsa */
export type ItemStatus = 'pending' | 'approved' | 'rejected' | 'pending_approval';

export interface Item {
  id: string;
  title: string;
  category: string;
  description: string;
  state: 'nuevo' | 'usado_bueno' | 'usado_regular' | string;
  condition?: string;
  sex?: Sex;
  publisherGender?: Sex;
  available: boolean;
  publishedBy: string;
  publisherId?: string;
  publisherName?: string;
  publisherEmail?: string;
  deliveryPoint?: string;
  status: ItemStatus;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  reviewComment?: string | null;
  rejectionReason?: string | null;
  coverUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

// Alias Book para mantener compatibilidad con nomenclatura de la guía
export type Book = {
  id: string;
  title: string;
  author: string;
  category: string;
  year: number;
  description: string;
  totalCopies: number;
  availableCopies: number;
  coverUrl: string | null;
  updatedAt: string;
};

export type RequestStatus = 'requested' | 'approved' | 'rejected' | 'delivered';
export type RequestAction = 'approve' | 'reject' | 'deliver';

// Alias Loan para compatibilidad con la guía
export type LoanStatus = 'requested' | 'approved' | 'rejected' | 'returned';
export type LoanAction = 'approve' | 'reject' | 'return';

export type SyncState = 'synced' | 'pending' | 'conflict';

export interface ProductRequest {
  id: string;
  itemId: string;
  itemTitle: string;
  publisherId: string;
  userId: string;
  applicantId?: string;
  userEmail: string;
  applicantEmail?: string;
  userName: string;
  applicantName?: string;
  status: RequestStatus;
  clientRequestId: string;
  requestedAt: string;
  resolvedAt: string | null;
  deliveredAt: string | null;
  updatedAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'item_submitted' | 'item_reviewed' | 'item_requested' | 'request_resolved';
  targetPath: string;
  read: boolean;
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
      status: string;
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
      status: string;
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
      status: string;
      requestedAt: string;
      resolvedAt: string | null;
    }>;
  };
}

export interface LocalRequest extends ProductRequest {
  syncState: SyncState;
  syncError: string | null;
}

export interface Loan {
  id: string;
  bookId: string;
  bookTitle: string;
  userId: string;
  userEmail: string;
  userName: string;
  status: LoanStatus;
  clientRequestId: string;
  requestedAt: string;
  resolvedAt: string | null;
  dueDate: string | null;
  returnedAt: string | null;
  updatedAt: string;
}

export interface LocalLoan extends Loan {
  syncState: SyncState;
  syncError: string | null;
}
