/**
 * A request's JSON body, read no further than `maxBytes`: anything larger
 * is refused before it's buffered or parsed (security audit of 10 Oct
 * 2026, finding 6). "too_large" for an oversized body; null for one that
 * isn't JSON.
 */
export async function readJsonBody(req: Request, maxBytes: number): Promise<unknown | null | "too_large"> {
  if (Number(req.headers.get("content-length") ?? 0) > maxBytes) return "too_large";
  if (!req.body) return null;
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) {
      await reader.cancel().catch(() => {});
      return "too_large";
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const c of chunks) {
    bytes.set(c, offset);
    offset += c.byteLength;
  }
  try {
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return null;
  }
}
