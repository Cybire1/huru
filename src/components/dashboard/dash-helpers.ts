export function getRedirectUrl() {
  if (typeof window === "undefined") return "http://localhost:3000/auth/callback";
  return `${window.location.origin}/auth/callback`;
}

export function getApiErrorMessage(payload: Record<string, unknown> | null) {
  const error = payload?.error;
  if (!error || typeof error !== "object" || Array.isArray(error)) return null;
  const message = (error as { message?: unknown }).message;
  return typeof message === "string" ? message : null;
}
