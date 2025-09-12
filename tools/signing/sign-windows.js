import path from "node:path";
import {execFileSync} from "node:child_process";

/**
 * Returns the full path to `signtool.exe`.
 */
export function getWindowsSigntoolPath() {
  // For more information on how to determine some of the env variables below,
  // and for documentation on the syntax used, please refer to
  // https://stackoverflow.com/a/54439759/284318
  const signtoolPath = process.env.SIGNTOOL_EXE_PATH;
  if (signtoolPath === undefined) {
    throw new Error("Missing SIGNTOOL_EXE_PATH env var");
  }

  return signtoolPath;
}

/**
 * Returns options for `signtool.exe` as an object.
 *
 * @example
 * ```js
 * // Get options.
 * const signtoolPath = ...;
 * const pathToSign = ...;
 * const {d, du} = getWindowsSigntoolOptions(flavor);
 *
 * // Sign binary.
 * execFileSync(
 *   signtoolPath,
 *   [
 *     'sign',
 *     '/d', d,
 *     '/du', du,
 *     // ...
 *     pathToSign,
 *  ],
 *   {encoding: "utf8"},
 * );
 * ```
 */
export function getWindowsSigntoolOptions(flavor) {
  const certificatePath = process.env.WIN_SIGN_CERT_PATH;
  if (certificatePath === undefined) {
    throw new Error("Missing WIN_SIGN_CERT_PATH env var");
  }

  const cryptographicProvider = process.env.WIN_SIGN_CRYPTO_PROVIDER;
  if (cryptographicProvider === undefined) {
    throw new Error("Missing WIN_SIGN_CRYPTO_PROVIDER env var");
  }

  const privateKeyContainerName = process.env.WIN_SIGN_CONTAINER_NAME;
  if (privateKeyContainerName === undefined) {
    throw new Error("Missing WIN_SIGN_CONTAINER_NAME env var");
  }

  const tokenReader = process.env.WIN_SIGN_TOKEN_READER;
  if (tokenReader === undefined) {
    throw new Error("Missing WIN_SIGN_TOKEN_READER env var");
  }

  const tokenPassword = process.env.WIN_SIGN_TOKEN_PASSWORD;
  if (tokenPassword === undefined) {
    throw new Error("Missing WIN_SIGN_TOKEN_PASSWORD env var");
  }

  const description = determineAppName(flavor);
  const url = "https://threema.ch/";
  const fileDigest = "sha512";
  const timestampDigest = "sha512";
  const timestampUrl = "http://timestamp.sectigo.com";
  const keyContainer = `[${tokenReader}{{${tokenPassword}}}]=${privateKeyContainerName}`;

  return {
    d: description,
    du: url,
    fd: fileDigest,
    td: timestampDigest,
    tr: timestampUrl,
    f: certificatePath,
    csp: cryptographicProvider,
    kc: keyContainer,
  };
}

/**
 * Sign a Windows Binary (.exe) or Package (.msix).
 */
export function signWindowsBinaryOrPackage(pathToSign, flavor) {
  const filename = path.basename(pathToSign);

  console.log(`Start signing binary "${filename}"`);

  const signtoolPath = getWindowsSigntoolPath();
  const {d, du, fd, td, tr, f, csp, kc} = getWindowsSigntoolOptions(flavor);

  execFileSync(
    signtoolPath,
    // prettier-ignore
    [
      'sign',
      '/d', d,
      '/du', du,
      '/fd', fd,
      '/td', td,
      '/tr', tr,
      '/f', f,
      '/csp', csp,
      '/kc', kc,
      pathToSign,
    ],
    {encoding: "utf8"},
  );

  console.log(`Signing binary "${filename}" complete`);
}

function determineAppName(flavor) {
  switch (flavor) {
    case "blue":
      return "Threema Blue Desktop";
    case "work":
      return "Threema Work Desktop";
    case "consumer":
      return "Threema Desktop";
    default:
      throw new Error(`Invalid signing flavor: ${flavor}`);
  }
}
