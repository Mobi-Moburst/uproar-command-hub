import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { sowId } = await req.json();
    if (!sowId) {
      return new Response(JSON.stringify({ error: "sowId required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Fetch SOW record
    const { data: sow, error: fetchError } = await supabase
      .from("client_sows")
      .select("*")
      .eq("id", sowId)
      .single();
    if (fetchError || !sow) {
      return new Response(JSON.stringify({ error: "SOW not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Download the PDF from storage
    const { data: fileData, error: dlError } = await supabase.storage
      .from("client-sows")
      .download(sow.storage_path);
    if (dlError || !fileData) {
      return new Response(JSON.stringify({ error: "Could not download file" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Convert PDF to base64 for AI processing
    const arrayBuffer = await fileData.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));

    // Send to Lovable AI for extraction using tool calling
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "system",
            content:
              "You are a contract analyst. Extract key information from this Statement of Work (SOW) PDF. The document is provided as a base64-encoded PDF. Analyze the text content and extract all relevant contract details.",
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: `Please analyze this SOW document for client "${sow.client_name}" and extract all key contract details.`,
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:application/pdf;base64,${base64}`,
                },
              },
            ],
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_sow_fields",
              description: "Extract key fields from a Statement of Work document",
              parameters: {
                type: "object",
                properties: {
                  summary: {
                    type: "string",
                    description: "A comprehensive 2-4 paragraph summary of the SOW covering scope, key deliverables, and important terms",
                  },
                  start_date: {
                    type: "string",
                    description: "Contract start date in YYYY-MM-DD format, or null if not found",
                  },
                  end_date: {
                    type: "string",
                    description: "Contract end date in YYYY-MM-DD format, or null if not found",
                  },
                  renewal_date: {
                    type: "string",
                    description: "Contract renewal date in YYYY-MM-DD format, or null if not found",
                  },
                  retainer_amount: {
                    type: "string",
                    description: "Monthly retainer amount as a string (e.g. '$10,000/mo'), or null if not found",
                  },
                  deliverables: {
                    type: "array",
                    items: { type: "string" },
                    description: "List of key deliverables or services included in the SOW",
                  },
                  raw_text: {
                    type: "string",
                    description: "Full plain-text extraction of the document content for search purposes",
                  },
                },
                required: ["summary", "deliverables", "raw_text"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "extract_sow_fields" } },
      }),
    });

    if (!aiResponse.ok) {
      const errText = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, errText);
      return new Response(JSON.stringify({ error: "AI extraction failed" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const aiResult = await aiResponse.json();
    const toolCall = aiResult.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      console.error("No tool call in AI response:", JSON.stringify(aiResult));
      return new Response(JSON.stringify({ error: "AI did not return structured data" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const extracted = JSON.parse(toolCall.function.arguments);

    // Update the SOW record with extracted data
    const { error: updateError } = await supabase
      .from("client_sows")
      .update({
        summary: extracted.summary || null,
        start_date: extracted.start_date || null,
        end_date: extracted.end_date || null,
        renewal_date: extracted.renewal_date || null,
        retainer_amount: extracted.retainer_amount || null,
        deliverables: extracted.deliverables || [],
        raw_text: extracted.raw_text || null,
        ai_processed: true,
      })
      .eq("id", sowId);

    if (updateError) {
      console.error("Update error:", updateError);
      return new Response(JSON.stringify({ error: "Failed to save extraction" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("extract-sow error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
