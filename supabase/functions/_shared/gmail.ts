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

export function buildRawEmail(opts: {
  to: string;
  subject: string;
  body: string;
  inReplyTo?: string | null;
  references?: string | null;
}): string {
  const lines = [
    `To: ${opts.to}`,
    `Subject: ${header(opts.subject)}`,
    "MIME-Version: 1.0",
    'Content-Type: text/plain; charset="UTF-8"',
  ];
  if (opts.inReplyTo) {
    lines.push(`In-Reply-To: ${opts.inReplyTo}`);
    lines.push(`References: ${opts.references || opts.inReplyTo}`);
  }
  lines.push("", opts.body);
  return b64(lines.join("\r\n")).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function sendGmail(
  connectionAPIKey: string,
  opts: { to: string; subject: string; body: string; threadId?: string | null; inReplyTo?: string | null },
): Promise<{ id: string; threadId: string }> {
  const payload: Record<string, unknown> = {
    raw: buildRawEmail({
      to: opts.to,
      subject: opts.subject,
      body: opts.body,
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
