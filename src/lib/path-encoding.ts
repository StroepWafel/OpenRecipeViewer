/** URL-safe base64 encoding of UTF-8 library relative paths (e.g. `by-meal/dinner/foo__abc.json`). */

export function encodeRecipePath(relativePath: string): string {
  const utf8 = new TextEncoder().encode(relativePath);
  let bin = "";
  for (const b of utf8) bin += String.fromCharCode(b);
  const b64 = btoa(bin);
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decodeRecipePath(key: string): string | null {
  try {
    let b64 = key.replace(/-/g, "+").replace(/_/g, "/");
    while (b64.length % 4) b64 += "=";
    const bin = atob(b64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  } catch {
    return null;
  }
}
