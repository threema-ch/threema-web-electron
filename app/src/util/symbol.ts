/**
 * Checks whether `it` is a `symbol`.
 */
export function isSymbol(it: unknown): it is symbol {
  return typeof it === "symbol";
}
