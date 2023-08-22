import {isNumber} from "./number";
import {isString} from "./string";
import {isSymbol} from "./symbol";

/**
 * Union type of allowed {@link Record} keys.
 */
export type AnyKey = string | number | symbol;

/**
 * Whether `it` overlaps with {@link AnyKey}.
 */
export function isAnyKey(it: unknown): it is AnyKey {
  return isString(it) || isNumber(it) || isSymbol(it);
}

/**
 * Checks whether `it` has the shape of a {@link Record}.
 *
 * @param it Object to check.
 * @returns Whether `it` is a `Record`.
 */
export function isRecord(
  it: unknown,
): it is Record<string | number | symbol, unknown> {
  return typeof it === "object" && it !== null && !Array.isArray(it);
}

/**
 * Checks whether `it` has the shape of a {@link Record} and contains only
 * values that satisfy the given predicate.
 *
 * @param predicate The predicate to validate all values with.
 * @param it The object to check.
 * @returns Whether `it` is of type `Record<string, TValue>`.
 */
export function isRecordWhere<TKey extends AnyKey, TValue>(
  {
    key: keyPredicate,
    value: valuePredicate,
  }: {
    key?: (key: unknown) => key is TKey;
    value: (value: unknown) => value is TValue;
  },
  it: unknown,
): it is Record<TKey, TValue> {
  if (!isRecord(it)) {
    return false;
  }

  return Object.entries(it).every(
    ([key, value]) =>
      (keyPredicate ? keyPredicate(key) : isAnyKey(key)) &&
      valuePredicate(value),
  );
}
