/** Normalises unknown thrown values into a message we can show in a toast. */
export function errorMessage(error: unknown, fallback = "Something went wrong. Try again."): string {
  if (error instanceof Error && error.message) return error.message;
  if (typeof error === "string" && error.trim()) return error;
  return fallback;
}