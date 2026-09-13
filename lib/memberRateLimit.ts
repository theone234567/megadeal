import { checkRateLimit } from "./rateLimit";

/**
 * Rate limit keyed on the signed-in member rather than their IP address.
 *
 * Every route that uses this has already verified who the caller is, and
 * the member id is the thing we actually checked — an IP is neither
 * reliable (a whole café, office or mobile network shares one) nor
 * necessary once identity is established. Keying on the member also means
 * one abusive account can't take the route down for everyone behind the
 * same address.
 *
 * Being signed in was previously treated as a budget of its own: these
 * routes write to Wix Data, upload media, create Stores products and send
 * email, and none of them counted. An account with a script behind it —
 * or a session someone else had taken — could run any of that in a loop
 * at no cost to themselves.
 *
 * Fails open. The limiter is backed by a KV namespace that may not be
 * bound in every environment, and refusing real merchants their own
 * portal because a counter is unavailable would be a worse outcome than
 * the abuse this guards against.
 */
export async function memberRateLimited(
  bucket: string,
  memberId: string,
  max: number,
  windowSeconds: number
): Promise<boolean> {
  const { limited } = await checkRateLimit(`${bucket}:${memberId}`, max, windowSeconds);
  return limited;
}

/** One hour, the window every caller here uses. */
export const HOUR = 60 * 60;
