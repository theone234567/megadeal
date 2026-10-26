/** How long the links that set a password work (T255), in one place so
 *  the emails and the reset page say the same (they said an hour and 30
 *  minutes). Safe for the browser: no server code here. */

/** "Forgot password": an hour from when it's emailed. */
export const RESET_LINK_MINUTES = 60;

/** The invitation to set a password after the move off Wix: 3 days (was
 *  a week; a live link shouldn't sit in an inbox longer than it needs). */
export const INVITE_LINK_HOURS = 72;
