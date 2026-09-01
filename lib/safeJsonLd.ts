/**
 * JSON.stringify output embedded in a <script type="application/ld+json">
 * via dangerouslySetInnerHTML is NOT safe by default. If any string value
 * inside it — a merchant's business name, bio, or a deal's name/description,
 * all of which end up in these blocks — ever contains a literal
 * "</script>" sequence, the browser's HTML parser closes the script tag
 * right there and renders whatever follows as real markup. That turns any
 * of those merchant-controlled fields into a stored XSS vector on a public
 * page the moment the deal or profile is field is set. Escaping every "<"
 * as a unicode escape defeats this regardless of case or exact tag —
 * "<" is the only character the parser needs to see to end (or start) one.
 */
export function safeJsonLd(data: unknown): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}
