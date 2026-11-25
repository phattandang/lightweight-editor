/** Errors that map 1:1 to an HTTP response. Thrown by services, rendered by the route wrapper. */
export class AppError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export const badRequest = (message: string, details?: Record<string, unknown>) =>
  new AppError(400, "bad_request", message, details);
export const unauthorized = () => new AppError(401, "unauthorized", "Please sign in to continue.");
export const forbidden = (message = "You don't have permission to do that.") =>
  new AppError(403, "forbidden", message);
export const notFound = (message = "Document not found.") => new AppError(404, "not_found", message);
export const conflict = (message: string, details?: Record<string, unknown>) =>
  new AppError(409, "conflict", message, details);
export const payloadTooLarge = (message: string) => new AppError(413, "payload_too_large", message);
export const unsupportedMedia = (message: string) => new AppError(415, "unsupported_media_type", message);
