/**
 * The highest price a deal can have. The database stores prices as
 * numeric(10,2) (deals.price_now, price_was), so anything above this can't
 * be saved: refused with a message rather than failing the save. Far above
 * any real deal.
 */
export const MAX_DEAL_PRICE = 99_999_999.99;

export const PRICE_TOO_HIGH_MESSAGE = "That price is too high. Check the number and try again.";
