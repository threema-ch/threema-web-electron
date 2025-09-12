import log from "electron-log";
import {execSync} from "node:child_process";

/**
 * Read a property from the Windows Registry and return its value as a string.
 *
 * @param key Name of the Windows registry key to read in
 * `HKLM:\\SOFTWARE\\Threema\\ThreemaDesktopWeb`.
 */
export function getWindowsRegistryValue(key: string): string | undefined {
  const ps = `
    ErrorActionPreference = 'Stop'
    $keyPath = "HKLM:\\SOFTWARE\\Threema\\ThreemaDesktopWeb"
    $key = "${key}"

    try {
      $value = Get-ItemProperty -Path $keyPath -Name $key
      if ($value -ne $null) {
          Write-Output $value.$key
      } else {
          Write-Error "Registry value not found."
      }
    } catch {
      Write-Error "Error accessing the registry: $_"
    }
  `;

  let result = undefined;
  try {
    result = execSync(ps, {
      encoding: "utf8",
      shell: "powershell.exe",
      stdio: "pipe",
      windowsHide: true,
    });
  } catch (error: unknown) {
    log.error("Error executing PowerShell script: ", error);
  }

  return result;
}
