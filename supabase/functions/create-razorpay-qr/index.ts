import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data, error } = await supabase.auth.getClaims(token);
    if (error || !data?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const RAZORPAY_KEY_ID = Deno.env.get('RAZORPAY_KEY_ID');
    const RAZORPAY_KEY_SECRET = Deno.env.get('RAZORPAY_KEY_SECRET');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    
    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
      throw new Error('Razorpay credentials not configured');
    }

    const { orderId, orderNumber, amount, customerName, customerPhone, shopUpiId } = await req.json();
    
    const auth = btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`);
    const webhookUrl = `${SUPABASE_URL}/functions/v1/razorpay-webhook`;
    
    const paymentLinkPayload: Record<string, unknown> = {
      amount: Math.round(amount * 100),
      currency: 'INR',
      accept_partial: false,
      description: `Order ${orderNumber}`,
      reference_id: orderId,
      notes: { order_id: orderId, order_number: orderNumber },
      callback_url: webhookUrl,
      callback_method: 'get',
      options: {
        checkout: {
          method: { upi: true, card: false, netbanking: false, wallet: false, emi: false, paylater: false },
        },
      },
    };

    if (customerName || customerPhone) {
      paymentLinkPayload.customer = {
        name: customerName || 'Customer',
        contact: customerPhone || '',
      };
    }

    const response = await fetch('https://api.razorpay.com/v1/payment_links', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(paymentLinkPayload),
    });

    const responseData = await response.json();

    if (!response.ok) {
      throw new Error(responseData.error?.description || 'Failed to create payment link');
    }

    const upiIntentUrl = shopUpiId 
      ? `upi://pay?pa=${encodeURIComponent(shopUpiId)}&pn=${encodeURIComponent(customerName || 'Shop')}&am=${amount.toFixed(2)}&cu=INR&tn=${encodeURIComponent(`Order ${orderNumber}`)}`
      : responseData.short_url;

    return new Response(JSON.stringify({
      success: true,
      paymentLinkId: responseData.id,
      shortUrl: responseData.short_url,
      upiIntentUrl,
      amount: responseData.amount,
      currency: responseData.currency,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error creating payment link:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ success: false, error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
