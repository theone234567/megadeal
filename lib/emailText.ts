/**
 * The plain-text version of an HTML email. Sent alongside the HTML: mail
 * filters trust a message with a text part more, and some people read
 * mail as text. Links keep their address ("Confirm my email:
 * https://…"), so every action still works without the HTML.
 */
export function emailHtmlToText(html: string): string {
  return html
    .replace(/<(style|script|head)[^>]*>[\s\S]*?<\/\1>/gi, "")
    .replace(/<img[^>]*alt="([^"]*)"[^>]*>/gi, "$1")
    .replace(/<a\s[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, (_m, href: string, text: string) => {
      const label = text.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
      return label && label !== href ? `${label}: ${href}` : href;
    })
    .replace(/<li[^>]*>/gi, "\n- ")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|h[1-6]|ul|ol|li|tr)>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** A header value with no line breaks (so nothing can add a header of its
 *  own through, say, a name typed into the contact form), kept short. */
export function headerSafe(value: string, max = 200): string {
  return value.replace(/[\r\n\u2028\u2029]+/g, " ").trim().slice(0, max);
}
