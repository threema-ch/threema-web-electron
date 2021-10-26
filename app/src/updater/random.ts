import * as crypto from "crypto";

export function getWeakRandomString(): string {
  const charset =
    "0123456789ABCDEFGHIJKLMNOPQRSTUVWXTZabcdefghiklmnopqrstuvwxyz";
  function randomStr(length = 15): string {
    return new Array(length)
      .fill(null)
      .map(() => charset.charAt(crypto.randomInt(charset.length)))
      .join("");
  }

  return randomStr();
}
