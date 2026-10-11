/**
 * Reads the domain's email-protection records over DNS-over-HTTPS
 * (Cloudflare's resolver), for the admin launch checklist: DMARC's policy
 * (none = only reporting; quarantine or reject = failing mail is stopped)
 * and whether SPF exists. Read only, a few hundred bytes, no key needed.
 */
export interface EmailDnsFacts {
  /** The DMARC policy, or null when there's no DMARC record. */
  dmarcPolicy: "none" | "quarantine" | "reject" | null;
  spf: boolean;
}

async function txt(name: string): Promise<string[]> {
  const res = await fetch(`https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(name)}&type=TXT`, {
    headers: { accept: "application/dns-json" },
    signal: AbortSignal.timeout(4000),
  });
  if (!res.ok) throw new Error(`DNS lookup failed (${res.status})`);
  const out = (await res.json()) as { Answer?: { type: number; data: string }[] };
  // TXT data arrives quoted, long records split into quoted chunks.
  return (out.Answer ?? []).filter((a) => a.type === 16).map((a) => a.data.replace(/"\s*"/g, "").replace(/^"|"$/g, ""));
}

/** The policy from a DMARC record ("v=DMARC1; p=none; rua=…"). */
export function dmarcPolicy(records: string[]): EmailDnsFacts["dmarcPolicy"] {
  const rec = records.find((r) => /^v=DMARC1\b/i.test(r.trim()));
  if (!rec) return null;
  const p = rec.match(/(?:^|;)\s*p\s*=\s*(none|quarantine|reject)\b/i)?.[1]?.toLowerCase();
  return (p as EmailDnsFacts["dmarcPolicy"]) ?? "none";
}

export async function emailDnsFacts(domain: string): Promise<EmailDnsFacts | null> {
  try {
    const [dmarc, root] = await Promise.all([txt(`_dmarc.${domain}`), txt(domain)]);
    return { dmarcPolicy: dmarcPolicy(dmarc), spf: root.some((r) => /^v=spf1\b/i.test(r.trim())) };
  } catch (err) {
    console.error("[dnsCheck] lookup failed", err);
    return null;
  }
}
