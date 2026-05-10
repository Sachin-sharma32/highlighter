import { ConvexError, type Value } from "convex/values";

/**
 * App-level error codes. The client maps these to friendly messages
 * (and may render different UI) without parsing strings.
 */
export type AppErrorCode =
  | "UNAUTHENTICATED"
  | "INVALID_EXTENSION_SESSION"
  | "NOT_FOUND"
  | "FORBIDDEN"
  | "PAIRING_CODE_INVALID"
  | "PAIRING_CODE_EXPIRED"
  | "FREE_LIMIT_REACHED"
  | "PAYMENTS_NOT_CONFIGURED"
  | "PAYMENT_VERIFICATION_FAILED"
  | "PAYMENT_PROVIDER_FAILED"
  | "INVALID_INPUT"
  | "TESTING_DISABLED";

export interface AppErrorData {
  code: AppErrorCode;
  message: string;
  meta?: Record<string, string | number | boolean>;
}

export function appError(
  code: AppErrorCode,
  message: string,
  meta?: AppErrorData["meta"],
): ConvexError<Value> {
  const payload: Value = {
    code,
    message,
    meta: meta ? { ...meta } : null,
  };
  return new ConvexError(payload);
}

// ---------------------------------------------------------------------------
// Client-safe helpers (importable from web/extension UI)
// ---------------------------------------------------------------------------

const GENERIC_FALLBACK =
  "Something went wrong on our end. Please try again in a moment.";

function isAppErrorData(data: unknown): data is AppErrorData {
  if (!data || typeof data !== "object") return false;
  const d = data as Record<string, unknown>;
  return typeof d.code === "string" && typeof d.message === "string";
}

export function friendlyErrorMessage(
  error: unknown,
  fallback: string = GENERIC_FALLBACK,
): string {
  if (!error) return fallback;

  const maybeData = (error as { data?: unknown }).data;
  if (isAppErrorData(maybeData)) return maybeData.message;
  if (typeof maybeData === "string" && maybeData.trim()) return maybeData;

  const msg =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "";
  if (!msg.trim()) return fallback;

  if (
    msg.includes("[CONVEX") ||
    msg.includes("Server Error") ||
    /\bat\s/.test(msg)
  ) {
    return fallback;
  }

  const match = msg.match(/Uncaught (?:Error|ConvexError):\s*([^\n]+)/);
  return match ? match[1].trim() : msg.trim();
}

export function appErrorCode(error: unknown): AppErrorCode | null {
  const data = (error as { data?: unknown } | null)?.data;
  return isAppErrorData(data) ? data.code : null;
}
