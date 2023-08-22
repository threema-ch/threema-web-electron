/**
 * Checks whether `it` is a `number`.
 */
export function isNumber(it: unknown): it is number {
  return typeof it === "number";
}
