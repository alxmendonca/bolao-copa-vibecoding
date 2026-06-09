/**
 * Algoritmo SHA-256 nativo do navegador usando Web Crypto API.
 */
export async function hashPassword(password: string): Promise<string> {
  const trimmed = password.trim();
  const encoder = new TextEncoder();
  const data = encoder.encode(trimmed);
  const hashBuffer = await window.crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
