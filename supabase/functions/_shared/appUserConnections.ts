// Per-user connector key storage. Service role only, server-only.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { decryptConnectionKey, encryptConnectionKey } from "./connectionKeyCrypto.ts";

export function adminClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

export async function saveConnectionKeyForUser(
  userId: string,
  connectorId: string,
  connectionAPIKey: string,
  accountEmail?: string | null,
) {
  const row: Record<string, unknown> = {
    user_id: userId,
    connector_id: connectorId,
    connection_key_ciphertext: await encryptConnectionKey(connectionAPIKey),
    reconnect_required: false,
    updated_at: new Date().toISOString(),
  };
  if (accountEmail !== undefined) row.account_email = accountEmail;
  const { error } = await adminClient()
    .from("app_user_connections")
    .upsert(row, { onConflict: "user_id,connector_id" });
  if (error) throw new Error(error.message);
}

export async function getConnectionKeyForUser(
  userId: string,
  connectorId: string,
): Promise<string | null> {
  const { data, error } = await adminClient()
    .from("app_user_connections")
    .select("connection_key_ciphertext")
    .eq("user_id", userId)
    .eq("connector_id", connectorId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data ? await decryptConnectionKey(data.connection_key_ciphertext) : null;
}

export async function markReconnectRequired(userId: string, connectorId: string) {
  await adminClient()
    .from("app_user_connections")
    .update({ reconnect_required: true })
    .eq("user_id", userId)
    .eq("connector_id", connectorId);
}

export async function deleteConnectionForUser(userId: string, connectorId: string) {
  await adminClient()
    .from("app_user_connections")
    .delete()
    .eq("user_id", userId)
    .eq("connector_id", connectorId);
}

export async function setAccountEmail(userId: string, connectorId: string, email: string) {
  await adminClient()
    .from("app_user_connections")
    .update({ account_email: email })
    .eq("user_id", userId)
    .eq("connector_id", connectorId);
}
