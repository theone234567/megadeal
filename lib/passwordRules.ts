/**
 * What a business's password has to be (T255), checked the same way in
 * the sign-up form and on the server (sign-up and password reset). On top
 * of the length rule: no spaces at either end (they're invisible, and
 * easy to get wrong next time), and not the account's own email address
 * or business name, the first things anyone would try.
 */
export const MIN_PASSWORD = 10;
export const MAX_PASSWORD = 200;

const squash = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

export function passwordRuleProblem(
  password: unknown,
  ctx: { email?: string | null; businessName?: string | null } = {},
): string | null {
  if (typeof password !== "string" || password.length < MIN_PASSWORD || password.length > MAX_PASSWORD) {
    return `Use at least ${MIN_PASSWORD} characters for your password.`;
  }
  if (password !== password.trim()) return "Your password can't start or end with a space.";
  const pw = squash(password);
  const email = (ctx.email ?? "").trim().toLowerCase();
  if (email) {
    const local = squash(email.split("@")[0] ?? "");
    if (password.toLowerCase() === email || pw === squash(email) || (local.length >= 4 && pw === local)) {
      return "Your password can't be your email address.";
    }
  }
  const name = squash(ctx.businessName ?? "");
  // The name, or the name with a few characters added ("kahikatea123").
  if (name.length >= 4 && pw.startsWith(name) && pw.length - name.length <= 4) {
    return "Your password can't be your business name.";
  }
  return null;
}
