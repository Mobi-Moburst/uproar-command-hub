/** Shared helpers so the compose box and the sent email agree on formatting. */

export function looksLikeHtml(s: string): boolean {
  return /<(p|div|br|ul|ol|li|a|b|strong|i|em|span)\b/i.test(s);
}

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Plain text to HTML: blank lines become paragraphs, bare URLs become links. */
export function textToHtml(text: string): string {
  const linkify = (s: string) =>
    s.replace(/(https?:\/\/[^\s<]+)/g, (url) => `<a href="${url}">${url}</a>`);
  return text
    .split(/\n\s*\n/)
    .map((block) => `<p>${linkify(escapeHtml(block.trim())).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

/** HTML back to readable plain text, used for copy to clipboard. */
export function htmlToText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|ul|ol|h[1-6])>/gi, "\n")
    .replace(/<li[^>]*>/gi, "- ")
    .replace(/<a[^>]+href="([^"]+)"[^>]*>(.*?)<\/a>/gi, (_m, href, label) =>
      label && !String(label).includes(href) ? `${label} (${href})` : href)
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Anything coming out of the AI draft is plain text, so normalize it once. */
export function toEditorHtml(value: string): string {
  if (!value) return "";
  return looksLikeHtml(value) ? value : textToHtml(value);
}
