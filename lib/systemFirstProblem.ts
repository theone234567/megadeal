/** What the System checks page has (lib/systemChecks.ts), as far as this needs it. */
interface Checked {
  sections: { title: string; checks: { label: string; state: string; detail: string }[] }[];
}

/** The first thing missing, said as "Section: check. What to do", or null when nothing is. */
export function firstProblem(r: Checked): string | null {
  for (const s of r.sections) {
    const c = s.checks.find((x) => x.state === "missing");
    if (c) return `${s.title}: ${c.label}. ${c.detail}`;
  }
  return null;
}
