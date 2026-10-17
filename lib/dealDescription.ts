/**
 * A deal's description, as the deal page shows it: the business's prose as
 * "About this deal", and any list it wrote ("- Breakfast each morning",
 * "• Late checkout") as "What's included". Lines are kept exactly as
 * written, only the list marks are dropped; nothing is invented when the
 * description has no list.
 */
const ITEM = /^\s*(?:[-–•*✓✔]|\d+[.)])\s+(.+)$/;

export function splitDescription(text: string | null | undefined): { paragraphs: string[]; included: string[] } {
  const paragraphs: string[] = [];
  const included: string[] = [];
  let current: string[] = [];
  const flush = () => {
    if (current.length) paragraphs.push(current.join(" "));
    current = [];
  };
  for (const raw of (text ?? "").replace(/\r\n?/g, "\n").split("\n")) {
    const line = raw.trim();
    const item = line.match(ITEM);
    if (item) {
      flush();
      included.push(item[1].trim());
    } else if (!line) {
      flush();
    } else {
      current.push(line);
    }
  }
  flush();
  // A "What's included:" line above the list is the section's own title.
  return { paragraphs: included.length ? paragraphs.filter((t) => !/^what(?:'|’)?s included:?$|^what is included:?$/i.test(t)) : paragraphs, included };
}
