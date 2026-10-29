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
export type ItemStatus = 'pending' | 'approved' | 'rejected';

export interface Item {
  id: string;
  title: string;
  category: string;
  description: string;
  state: 'nuevo' | 'usado_bueno' | 'usado_regular';
  sex?: Sex;
  available: boolean;
  publishedBy: string;
  publisherName?: string;
  status: ItemStatus;
  reviewedBy?: string | null;
  reviewedAt?: string | null;
  reviewComment?: string | null;
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
  userEmail: string;
  userName: string;
  status: RequestStatus;
  clientRequestId: string;
  requestedAt: string;
  resolvedAt: string | null;
  deliveredAt: string | null;
  updatedAt: string;
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
