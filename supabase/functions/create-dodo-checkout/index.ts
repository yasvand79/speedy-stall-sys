import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const DODO_API_KEY = Deno.env.get('DODO_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    
    if (!DODO_API_KEY) {
      console.error('DODO_API_KEY not configured');
      throw new Error('DoDo Pay API key not configured');
    }

    const { orderId, orderNumber, amount, customerName, customerPhone, returnUrl } = await req.json();
    
    console.log('Creating DoDo checkout for order:', orderNumber, 'amount:', amount);

    // Create checkout session with DoDo Payments
    const response = await fetch('https://live.dodopayments.com/checkouts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${DODO_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        billing: {
          city: 'NA',
          country: 'IN',
          state: 'NA',
          street: 'NA',
          zipcode: '000000',
        },
        customer: {
          email: `${customerPhone || 'customer'}@placeholder.com`,
          name: customerName || 'Customer',
          phone_number: customerPhone || undefined,
        },
        payment_link: true,
        product_cart: [
          {
            product_id: orderId,
            quantity: 1,
          }
        ],
        return_url: returnUrl || `${SUPABASE_URL}/functions/v1/dodo-payment-return?order_id=${orderId}`,
        allowed_payment_method_types: ['upi_collect', 'upi_intent'],
        metadata: {
          order_id: orderId,
          order_number: orderNumber,
        },
        total_amount: Math.round(amount * 100), // Amount in paisa
        currency: 'INR',
      }),
    });

    const data = await response.json();
    
    console.log('DoDo checkout response:', JSON.stringify(data));

    if (!response.ok) {
      console.error('DoDo API error:', data);
      throw new Error(data.message || 'Failed to create checkout session');
    }

    return new Response(JSON.stringify({
      success: true,
      checkoutUrl: data.checkout_url,
      paymentId: data.payment_id,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error creating DoDo checkout:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({
      success: false,
      error: errorMessage,
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
