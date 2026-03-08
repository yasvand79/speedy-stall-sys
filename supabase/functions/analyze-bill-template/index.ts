import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const { image_base64, mime_type } = await req.json();
    if (!image_base64) throw new Error("No image provided");

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are an expert at analyzing bill/receipt/invoice templates from images. Extract the layout details and text content from the uploaded receipt image. Identify: shop name, address, phone, header tagline text (appears below shop name), footer message (thank you text), terms/notes, GST number, FSSAI license number, and UPI ID. If a field is not visible in the image, return an empty string for text fields. For boolean fields, return true if the element appears to be shown on the receipt, false otherwise.`,
          },
          {
            role: "user",
            content: [
              {
                type: "image_url",
                image_url: {
                  url: `data:${mime_type || "image/jpeg"};base64,${image_base64}`,
                },
              },
              {
                type: "text",
                text: "Analyze this bill/receipt template and extract all the fields using the tool provided.",
              },
            ],
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_bill_template",
              description: "Extract bill/receipt template fields from the analyzed image",
              parameters: {
                type: "object",
                properties: {
                  shop_name: { type: "string", description: "Name of the shop/restaurant" },
                  address: { type: "string", description: "Shop address" },
                  phone: { type: "string", description: "Shop phone number" },
                  gst_number: { type: "string", description: "GST/GSTIN number" },
                  fssai_license: { type: "string", description: "FSSAI license number" },
                  upi_id: { type: "string", description: "UPI payment ID" },
                  bill_header_text: { type: "string", description: "Tagline or header text below shop name (e.g. Pure Veg | Since 2010)" },
                  bill_footer_text: { type: "string", description: "Footer/thank you message on the receipt" },
                  bill_terms: { type: "string", description: "Terms, conditions, or notes on the receipt" },
                  bill_show_gstin: { type: "boolean", description: "Whether GSTIN is displayed on the receipt" },
                  bill_show_fssai: { type: "boolean", description: "Whether FSSAI license is displayed on the receipt" },
                  bill_show_upi: { type: "boolean", description: "Whether UPI ID is displayed on the receipt" },
                },
                required: [
                  "shop_name", "address", "phone", "gst_number", "fssai_license",
                  "upi_id", "bill_header_text", "bill_footer_text", "bill_terms",
                  "bill_show_gstin", "bill_show_fssai", "bill_show_upi",
                ],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "extract_bill_template" } },
      }),
    });

    if (!response.ok) {
      const status = response.status;
      const text = await response.text();
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits in Settings → Workspace → Usage." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      console.error("AI gateway error:", status, text);
      throw new Error(`AI gateway error: ${status}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No structured response from AI");

    const extracted = JSON.parse(toolCall.function.arguments);

    return new Response(JSON.stringify({ success: true, data: extracted }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("analyze-bill-template error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
