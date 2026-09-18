import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import {
  authorizeAppUserOAuth,
  disconnectAppUser,
  exchangeAppUserOAuthCode,
} from "../_shared/appUserConnector.ts";
import {
  adminClient,
  deleteConnectionForUser,
  getConnectionKeyForUser,
  saveConnectionKeyForUser,
  setAccountEmail,
} from "../_shared/appUserConnections.ts";
import { GATEWAY_BASE_URL, GOOGLE_MAIL_CONNECTOR_ID, GOOGLE_MAIL_SCOPES } from "../_shared/appUserScopes.ts";
import { getProfile, ReconnectRequiredError } from "../_shared/gmail.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } },
    );
    const { data: { user } } = await authClient.auth.getUser();
    if (!user) return json({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const action = String(body.action ?? "status");

    if (action === "status") {
      const { data } = await adminClient()
        .from("app_user_connections")
        .select("account_email, reconnect_required, updated_at")
        .eq("user_id", user.id)
        .eq("connector_id", GOOGLE_MAIL_CONNECTOR_ID)
        .maybeSingle();
      if (!data) return json({ connected: false });
      return json({
        connected: !data.reconnect_required,
        reconnectRequired: data.reconnect_required,
        accountEmail: data.account_email,
        connectedAt: data.updated_at,
      });
    }

    if (action === "start") {
      const clientAPIKey = Deno.env.get("GOOGLE_MAIL_APP_USER_CONNECTOR_CLIENT_API_KEY");
      if (!clientAPIKey) {
        return json({ error: "Gmail connector client is not configured for this project" }, 500);
      }
      const origin = String(body.origin ?? "");
      if (!/^https?:\/\/[^\s]+$/.test(origin)) return json({ error: "origin required" }, 400);

      const existing = await getConnectionKeyForUser(user.id, GOOGLE_MAIL_CONNECTOR_ID);
      const { authorizationUrl } = await authorizeAppUserOAuth({
        gatewayBaseUrl: GATEWAY_BASE_URL,
        connectorId: GOOGLE_MAIL_CONNECTOR_ID,
        appUserId: user.id,
        clientAPIKey,
        returnUrl: new URL("/oauth/gmail/return", origin).toString(),
        connectionAPIKey: existing ?? undefined,
        credentialsConfiguration: { scopes: GOOGLE_MAIL_SCOPES },
      });
      return json({ authorizationUrl });
    }

    if (action === "complete") {
      const code = String(body.code ?? "");
      if (!code) return json({ error: "code required" }, 400);
      const { connectionAPIKey, connectorId } = await exchangeAppUserOAuthCode(GATEWAY_BASE_URL, code);
      if (connectorId !== GOOGLE_MAIL_CONNECTOR_ID) {
        return json({ error: "OAuth completion returned the wrong connector" }, 400);
      }
      await saveConnectionKeyForUser(user.id, connectorId, connectionAPIKey);
      let accountEmail: string | null = null;
      try {
        accountEmail = await getProfile(connectionAPIKey);
        if (accountEmail) await setAccountEmail(user.id, connectorId, accountEmail);
      } catch (e) {
        if (!(e instanceof ReconnectRequiredError)) console.error("profile read failed:", e);
      }
      return json({ ok: true, accountEmail });
    }

    if (action === "disconnect") {
      const key = await getConnectionKeyForUser(user.id, GOOGLE_MAIL_CONNECTOR_ID);
      if (key) {
        try {
          await disconnectAppUser({
            gatewayBaseUrl: GATEWAY_BASE_URL,
            connectionAPIKey: key,
            connectorId: GOOGLE_MAIL_CONNECTOR_ID,
          });
        } catch (e) {
          console.error("gateway disconnect failed:", e);
        }
      }
      await deleteConnectionForUser(user.id, GOOGLE_MAIL_CONNECTOR_ID);
      return json({ ok: true });
    }

    return json({ error: `Unknown action: ${action}` }, 400);
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    console.error("gmail-connection error:", message);
    return json({ error: message }, 500);
  }
});
