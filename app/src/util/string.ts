/**
 * Checks whether `it` is a `string`.
 */
export function isString(it: unknown): it is string {
  return typeof it === "string";
}

/**
 * Checks whether `it` is `string` or `undefined`.
 */
export function isOptionalString(it: unknown): it is string | undefined {
  return isString(it) || it === undefined;
}
