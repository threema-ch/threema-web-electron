/**
 * Ensure a caught error is an actual `Error` instance.
 */
export function ensureError(it: unknown): Error {
  if (it instanceof Error) {
    return it;
  }

  return new Error(`${String(it)}`);
}
