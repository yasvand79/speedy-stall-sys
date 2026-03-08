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

    const prompt = `You are a friendly hotel/restaurant business advisor who explains things in simple, easy-to-understand language. Analyze this data and give a COMPLETE business health report.

DATA:
- Revenue: ₹${metrics.totalRevenue} from ${metrics.completedOrders} orders
- Average Order Value: ₹${metrics.avgOrderValue}
- Cancellation Rate: ${metrics.cancelRate}%
- Dine-in: ${metrics.dineInOrders} orders (₹${metrics.dineInRevenue})
- Takeaway: ${metrics.takeawayOrders} orders (₹${metrics.takeawayRevenue})
- GST Collected: ₹${metrics.totalGST}
- Discounts Given: ₹${metrics.totalDiscount}
- Peak Hour: ${metrics.peakHour}
- Busiest Day: ${metrics.busiestDay}
- Top Category: ${metrics.topCategory || 'N/A'}
- Top Item: ${metrics.topItem || 'N/A'}
- Repeat Customer Rate: ${metrics.repeatRate}%
- Total Customers: ${metrics.totalCustomers}
- Staff Count: ${metrics.staffCount}
- Tables Active: ${metrics.activeTables}

Return ONLY a valid JSON object (no markdown, no explanation) with this EXACT format:
{
  "summary": "2-3 sentence overall business health summary in simple language",
  "healthScore": <number 1-100>,
  "sections": [
    {
      "id": "sales",
      "title": "Sales Performance",
      "score": <number 1-100>,
      "status": "excellent|good|average|needs_work",
      "summary": "2 sentence simple explanation of sales health",
      "insights": [
        {"point": "short finding in simple words", "type": "positive|negative|neutral"},
        {"point": "short finding in simple words", "type": "positive|negative|neutral"},
        {"point": "short finding in simple words", "type": "positive|negative|neutral"}
      ],
      "tips": ["actionable tip 1 in simple language", "actionable tip 2"]
    },
    {
      "id": "customers",
      "title": "Customer Analysis",
      "score": <number 1-100>,
      "status": "excellent|good|average|needs_work",
      "summary": "2 sentence simple explanation",
      "insights": [
        {"point": "finding", "type": "positive|negative|neutral"},
        {"point": "finding", "type": "positive|negative|neutral"},
        {"point": "finding", "type": "positive|negative|neutral"}
      ],
      "tips": ["tip 1", "tip 2"]
    },
    {
      "id": "staff",
      "title": "Staff & Operations",
      "score": <number 1-100>,
      "status": "excellent|good|average|needs_work",
      "summary": "2 sentence simple explanation",
      "insights": [
        {"point": "finding", "type": "positive|negative|neutral"},
        {"point": "finding", "type": "positive|negative|neutral"}
      ],
      "tips": ["tip 1", "tip 2"]
    },
    {
      "id": "growth",
      "title": "Growth Tips",
      "score": <number 1-100>,
      "status": "excellent|good|average|needs_work",
      "summary": "2 sentence simple explanation of growth potential",
      "insights": [
        {"point": "finding", "type": "positive|negative|neutral"},
        {"point": "finding", "type": "positive|negative|neutral"}
      ],
      "tips": ["specific actionable growth tip 1", "specific actionable growth tip 2", "specific actionable growth tip 3"]
    }
  ]
}

IMPORTANT RULES:
- Use simple Tamil-hotel-owner-friendly language (English but simple)
- Be specific with numbers from the data
- Each tip should be something they can do THIS WEEK
- Score based on realistic restaurant benchmarks
- If data is zero/low, acknowledge it's early days and give starter tips`;

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
        max_tokens: 2500,
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Too many requests. Please try again in a minute." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Please add credits." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "{}";
    
    let analysis;
    try {
      const cleaned = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      analysis = JSON.parse(cleaned);
    } catch {
      analysis = null;
    }

    return new Response(JSON.stringify({ analysis }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message, analysis: null }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
