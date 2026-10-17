import { cookies } from "next/headers";
import { ADMIN_COOKIE_NAME, verifyAdminSessionToken } from "./adminSession";

/**
 * True when the person viewing the page is signed in as an admin. For
 * showing admin-only previews on public pages (a test business's deals
 * among the homepage's examples), never for deciding an admin action:
 * the admin API routes check the session themselves.
 */
export async function isAdminViewer(): Promise<boolean> {
  try {
    return await verifyAdminSessionToken((await cookies()).get(ADMIN_COOKIE_NAME)?.value);
  } catch {
    return false;
  }
}
