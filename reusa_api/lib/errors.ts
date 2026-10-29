export type ErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHENTICATED"
  | "INVALID_CREDENTIALS"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "EMAIL_IN_USE"
  | "ALREADY_ACTIVE"
  | "ITEM_NOT_AVAILABLE"
  | "SELF_REQUEST_NOT_ALLOWED"
  | "INVALID_STATE"
  | "PAYLOAD_TOO_LARGE"
  | "RATE_LIMITED"
  | "CONFIG_ERROR"
  | "INTERNAL_ERROR";

/** Error de negocio con status HTTP y codigo estable para clientes web y moviles. */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: ErrorCode,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}
