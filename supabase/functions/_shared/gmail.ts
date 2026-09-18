// Gmail helpers built on the App User Connector gateway. Server-only.
import { appUserReconnectRequired, callAsAppUser } from "./appUserConnector.ts";
import { GATEWAY_BASE_URL, GOOGLE_MAIL_CONNECTOR_ID, GOOGLE_MAIL_SCOPES } from "./appUserScopes.ts";

export class ReconnectRequiredError extends Error {
  constructor() {
    super("Gmail access needs to be renewed");
  }
}

export async function gmail(
  connectionAPIKey: string,
  path: string,
  init?: RequestInit,
): Promise<Record<string, unknown>> {
  const res = await callAsAppUser({
    gatewayBaseUrl: GATEWAY_BASE_URL,
    connectionAPIKey,
    connectorId: GOOGLE_MAIL_CONNECTOR_ID,
    path,
    init,
    requiredScopes: GOOGLE_MAIL_SCOPES,
  });
  if (await appUserReconnectRequired(res)) throw new ReconnectRequiredError();
  if (!res.ok) {
    const body = await res.text();
    console.error(`Gmail request failed [${res.status}] ${path}: ${body}`);
    throw new Error(`[${res.status}]: ${body}`);
  }
  return await res.json();
}

const b64 = (s: string) =>
  btoa(Array.from(new TextEncoder().encode(s), (b) => String.fromCharCode(b)).join(""));

const header = (v: string) => (/^[\x00-\x7F]*$/.test(v) ? v : `=?UTF-8?B?${b64(v)}?=`);

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** True when the stored draft already holds markup from the rich editor. */
export function looksLikeHtml(s: string): boolean {
  return /<(p|div|br|ul|ol|li|a|b|strong|i|em|span)\b/i.test(s);
}

/** Plain text to HTML: blank lines become paragraphs, bare URLs become links. */
export function textToHtml(text: string): string {
  const linkify = (s: string) =>
    s.replace(
      /(https?:\/\/[^\s<]+)/g,
      (url) => `<a href="${url}">${url}</a>`,
    );
  return text
    .split(/\n\s*\n/)
    .map((block) => `<p>${linkify(escapeHtml(block.trim())).replace(/\n/g, "<br>")}</p>`)
    .join("\n");
}

/** HTML back to readable plain text for the fallback part. */
export function htmlToText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|ul|ol|h[1-6])>/gi, "\n")
    .replace(/<li[^>]*>/gi, "- ")
    .replace(/<a[^>]+href="([^"]+)"[^>]*>(.*?)<\/a>/gi, (_m, href, label) =>
      label && !label.includes(href) ? `${label} (${href})` : href)
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

const HTML_WRAPPER = (inner: string) =>
  `<!DOCTYPE html><html><body style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;color:#202124;">${inner}</body></html>`;

export function buildRawEmail(opts: {
  to: string;
  subject: string;
  body: string;
  signature?: string | null;
  inReplyTo?: string | null;
  references?: string | null;
}): string {
  const htmlBody = looksLikeHtml(opts.body) ? opts.body : textToHtml(opts.body);
  const sig = (opts.signature ?? "").trim();
  const sigHtml = sig ? (looksLikeHtml(sig) ? sig : textToHtml(sig)) : "";
  const html = HTML_WRAPPER(sigHtml ? `${htmlBody}<br>${sigHtml}` : htmlBody);
  const text = htmlToText(sigHtml ? `${htmlBody}<br><br>${sigHtml}` : htmlBody);

  const boundary = `uproar_${crypto.randomUUID().replace(/-/g, "")}`;
  const lines = [
    `To: ${opts.to}`,
    `Subject: ${header(opts.subject)}`,
    "MIME-Version: 1.0",
  ];
  if (opts.inReplyTo) {
    lines.push(`In-Reply-To: ${opts.inReplyTo}`);
    lines.push(`References: ${opts.references || opts.inReplyTo}`);
  }
  lines.push(
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    'Content-Type: text/plain; charset="UTF-8"',
    "",
    text,
    "",
    `--${boundary}`,
    'Content-Type: text/html; charset="UTF-8"',
    "",
    html,
    "",
    `--${boundary}--`,
  );
  return b64(lines.join("\r\n")).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function sendGmail(
  connectionAPIKey: string,
  opts: {
    to: string;
    subject: string;
    body: string;
    signature?: string | null;
    threadId?: string | null;
    inReplyTo?: string | null;
  },
): Promise<{ id: string; threadId: string }> {
  const payload: Record<string, unknown> = {
    raw: buildRawEmail({
      to: opts.to,
      subject: opts.subject,
      body: opts.body,
      signature: opts.signature ?? null,
      inReplyTo: opts.inReplyTo ?? null,
    }),
  };
  if (opts.threadId) payload.threadId = opts.threadId;
  const sent = await gmail(connectionAPIKey, "/gmail/v1/users/me/messages/send", {
    method: "POST",
    body: JSON.stringify(payload),
  });
  return { id: String(sent.id ?? ""), threadId: String(sent.threadId ?? "") };
}

export async function getProfile(connectionAPIKey: string): Promise<string> {
  const profile = await gmail(connectionAPIKey, "/gmail/v1/users/me/profile");
  return String(profile.emailAddress ?? "");
}

/** RFC 822 Message-ID header of a sent message, needed to thread follow-ups. */
export async function getRfcMessageId(
  connectionAPIKey: string,
  messageId: string,
): Promise<string | null> {
  const msg = await gmail(
    connectionAPIKey,
    `/gmail/v1/users/me/messages/${messageId}?format=metadata&metadataHeaders=Message-ID`,
  );
  const headers = ((msg.payload as Record<string, unknown> | undefined)?.headers ?? []) as {
    name: string;
    value: string;
  }[];
  return headers.find((h) => h.name.toLowerCase() === "message-id")?.value ?? null;
}

export interface ThreadReply {
  repliedAt: string | null;
  snippet: string;
}

/** Look for a message in the thread that did not come from the sender. */
export async function findThreadReply(
  connectionAPIKey: string,
  threadId: string,
  senderEmail: string,
): Promise<ThreadReply | null> {
  const thread = await gmail(
    connectionAPIKey,
    `/gmail/v1/users/me/threads/${threadId}?format=metadata&metadataHeaders=From&metadataHeaders=Date`,
  );
  const messages = (thread.messages ?? []) as Record<string, unknown>[];
  for (const m of messages) {
    const headers = ((m.payload as Record<string, unknown> | undefined)?.headers ?? []) as {
      name: string;
      value: string;
    }[];
    const from = headers.find((h) => h.name.toLowerCase() === "from")?.value ?? "";
    if (senderEmail && from.toLowerCase().includes(senderEmail.toLowerCase())) continue;
    const internal = m.internalDate ? new Date(Number(m.internalDate)).toISOString() : null;
    return { repliedAt: internal, snippet: String(m.snippet ?? "").slice(0, 400) };
  }
  return null;
}
