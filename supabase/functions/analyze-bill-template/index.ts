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
            content: `You are an expert receipt/bill template designer. Analyze the uploaded bill/receipt image and:
1. Extract all text fields (shop name, address, phone, header text, footer, terms, GST number, FSSAI license, UPI ID)
2. Generate a COMPLETE HTML receipt template that visually matches the uploaded image's layout, typography, spacing, and style.

The HTML template MUST use these exact placeholders that will be replaced with real data:
- {{SHOP_NAME}} - Shop name
- {{SHOP_ADDRESS}} - Shop address  
- {{SHOP_PHONE}} - Phone number
- {{BRANCH_NAME}} - Branch name
- {{BILL_HEADER_TEXT}} - Header tagline
- {{ORDER_NUMBER}} - Receipt/order number
- {{DATE}} - Date string
- {{TIME}} - Time string
- {{ORDER_TYPE}} - Dine-In/Takeaway with table number
- {{CUSTOMER_NAME}} - Customer name (wrap in conditional: <!-- IF CUSTOMER_NAME -->...<!-- ENDIF -->)
- {{CUSTOMER_PHONE}} - Customer phone (wrap in conditional: <!-- IF CUSTOMER_PHONE -->...<!-- ENDIF -->)
- {{STAFF_NAME}} - Cashier name (wrap in conditional: <!-- IF STAFF_NAME -->...<!-- ENDIF -->)
- {{ITEMS_HTML}} - Table rows for items (will be <tr> elements with classes: item-name, item-qty, item-rate, item-amt)
- {{TOTAL_ITEMS}} - Total item count
- {{SUBTOTAL}} - Subtotal amount
- {{GST_RATE}} - GST percentage
- {{GST_AMOUNT}} - GST amount
- {{DISCOUNT_HTML}} - Discount row (already wrapped in conditional)
- {{TOTAL}} - Grand total
- {{PAYMENT_STATUS_CLASS}} - CSS class: payment-paid or payment-pending
- {{PAYMENT_STATUS_TEXT}} - Text: ✓ PAID or ⏳ PAYMENT PENDING
- {{GSTIN_HTML}} - GSTIN display (already wrapped in conditional)
- {{FSSAI_HTML}} - FSSAI display (already wrapped in conditional)
- {{GSTIN_FSSAI_SEP}} - Separator after GSTIN/FSSAI (conditional)
- {{BILL_FOOTER_TEXT}} - Footer message
- {{BILL_TERMS}} - Terms (wrap in conditional: <!-- IF BILL_TERMS -->...<!-- ENDIF -->)
- {{UPI_HTML}} - UPI display (already wrapped in conditional)

The template must be a complete HTML document with <html>, <head> with <style>, and <body>.
Use 80mm thermal printer width. Include @page { size: 80mm auto; margin: 0; }
Use monospace fonts. Match the visual style of the uploaded image exactly.`,
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
                text: "Analyze this bill/receipt template. Extract text fields AND generate a complete HTML template matching this exact design. Use the placeholders specified in the system prompt.",
              },
            ],
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_bill_template",
              description: "Extract bill template fields and generate matching HTML template",
              parameters: {
                type: "object",
                properties: {
                  shop_name: { type: "string", description: "Name of the shop/restaurant" },
                  address: { type: "string", description: "Shop address" },
                  phone: { type: "string", description: "Shop phone number" },
                  gst_number: { type: "string", description: "GST/GSTIN number" },
                  fssai_license: { type: "string", description: "FSSAI license number" },
                  upi_id: { type: "string", description: "UPI payment ID" },
                  bill_header_text: { type: "string", description: "Tagline or header text below shop name" },
                  bill_footer_text: { type: "string", description: "Footer/thank you message" },
                  bill_terms: { type: "string", description: "Terms, conditions, or notes" },
                  bill_show_gstin: { type: "boolean", description: "Whether GSTIN is displayed" },
                  bill_show_fssai: { type: "boolean", description: "Whether FSSAI license is displayed" },
                  bill_show_upi: { type: "boolean", description: "Whether UPI ID is displayed" },
                  custom_bill_html: { type: "string", description: "Complete HTML document for the receipt template matching the uploaded image design, using the specified placeholders" },
                },
                required: [
                  "shop_name", "address", "phone", "gst_number", "fssai_license",
                  "upi_id", "bill_header_text", "bill_footer_text", "bill_terms",
                  "bill_show_gstin", "bill_show_fssai", "bill_show_upi", "custom_bill_html",
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
