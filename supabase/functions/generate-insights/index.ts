import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { metrics } = await req.json();

    const prompt = `You are a hospitality business consultant. Analyze this restaurant/hotel data and provide exactly 6 actionable insights to improve the business. Be specific with numbers.

DATA:
- Revenue: ₹${metrics.totalRevenue} (${metrics.completedOrders} orders)
- Avg Order Value: ₹${metrics.avgOrderValue}
- Cancellation Rate: ${metrics.cancelRate}%
- Dine-in: ${metrics.dineInOrders} orders (₹${metrics.dineInRevenue})
- Takeaway: ${metrics.takeawayOrders} orders (₹${metrics.takeawayRevenue})
- GST Collected: ₹${metrics.totalGST}
- Discounts Given: ₹${metrics.totalDiscount}
- Peak Hour: ${metrics.peakHour}
- Busiest Day: ${metrics.busiestDay}
- Top Selling Category: ${metrics.topCategory || 'N/A'}
- Repeat Customer Rate: ${metrics.repeatRate}%
- Total Customers: ${metrics.totalCustomers}
- Staff Count Active: ${metrics.staffCount}
- Top Item: ${metrics.topItem || 'N/A'}
- Tables Active: ${metrics.activeTables}

Return ONLY a JSON array of objects with this exact format (no markdown, no explanation):
[{"category":"revenue","title":"short title","insight":"2-3 sentence actionable insight","impact":"high|medium|low","metric":"relevant number or %"}]

Categories: revenue, operations, menu, customers, staff, marketing`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${Deno.env.get("LOVABLE_API_KEY")}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 1500,
      }),
    });

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "[]";
    
    // Parse JSON from response (handle markdown code blocks)
    let insights;
    try {
      const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      insights = JSON.parse(cleaned);
    } catch {
      insights = [];
    }

    return new Response(JSON.stringify({ insights }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message, insights: [] }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
