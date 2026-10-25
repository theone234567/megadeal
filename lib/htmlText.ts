const ENTITIES: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ",
  ldquo: "\u201c", rdquo: "\u201d", lsquo: "\u2018", rsquo: "\u2019", sbquo: "\u201a", bdquo: "\u201e",
  laquo: "\u00ab", raquo: "\u00bb", ndash: "\u2013", mdash: "\u2014", hellip: "\u2026", middot: "\u00b7",
  bull: "\u2022", rarr: "\u2192", larr: "\u2190", uarr: "\u2191", darr: "\u2193", times: "\u00d7",
  divide: "\u00f7", deg: "\u00b0", copy: "\u00a9", reg: "\u00ae", trade: "\u2122", euro: "\u20ac",
  pound: "\u00a3", cent: "\u00a2", frac12: "\u00bd", frac14: "\u00bc", frac34: "\u00be", check: "\u2713",
  hearts: "\u2665", star: "\u2606", colon: ":", eacute: "\u00e9", egrave: "\u00e8", aacute: "\u00e1",
  amacr: "\u0101", emacr: "\u0113", imacr: "\u012b", omacr: "\u014d", umacr: "\u016b",
  Amacr: "\u0100", Emacr: "\u0112", Imacr: "\u012a", Omacr: "\u014c", Umacr: "\u016a",
  thinsp: "\u2009", ensp: "\u2002", emsp: "\u2003", zwj: "\u200d", zwnj: "\u200c", shy: "",
};

/** Turns HTML entities back into characters: named ones (curly quotes,
 *  dashes, macrons and the rest above), decimal and hex. Unknown names stay
 *  as written. One pass, so "&amp;lt;" becomes "&lt;", not "<". */
export function decodeHtmlEntities(text: string): string {
  return text.replace(/&(#\d+|#x[0-9a-f]+|[a-z][a-z0-9]*);/gi, (whole, code: string) => {
    if (code[0] === "#") {
      const n = code[1].toLowerCase() === "x" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(n) && n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : whole;
    }
    return ENTITIES[code] ?? ENTITIES[code.toLowerCase()] ?? whole;
  });
}

/**
 * A deal description (stored as simple HTML, lib/dealAdminEdit.ts
 * textToHtml) as one line of plain text, for structured data and the
 * public feed: tags removed, entities decoded, whitespace collapsed.
 */
export function htmlToText(html: string | null | undefined): string {
  if (!html) return "";
  return html
    .replace(/<(?:br|\/p|\/li|\/div)\s*\/?>/gi, " ")
    .replace(/<[^>]*>/g, "")
    .replace(/&[^;\s]+;/g, (m) => decodeHtmlEntities(m))
    .replace(/\s+/g, " ")
    .trim();
}
