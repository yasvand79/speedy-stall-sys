import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const RAZORPAY_KEY_ID = Deno.env.get('RAZORPAY_KEY_ID');
    const RAZORPAY_KEY_SECRET = Deno.env.get('RAZORPAY_KEY_SECRET');
    
    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
      console.error('Razorpay credentials not configured');
      throw new Error('Razorpay credentials not configured');
    }

    const { orderId, orderNumber, amount } = await req.json();
    
    console.log('Creating Razorpay order for:', orderNumber, 'amount:', amount);

    const auth = btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`);
    
    const response = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: Math.round(amount * 100), // Amount in paisa
        currency: 'INR',
        receipt: orderNumber,
        notes: {
          order_id: orderId,
          order_number: orderNumber,
        },
      }),
    });

    const data = await response.json();
    
    console.log('Razorpay order response:', JSON.stringify(data));

    if (!response.ok) {
      console.error('Razorpay API error:', data);
      throw new Error(data.error?.description || 'Failed to create Razorpay order');
    }

    return new Response(JSON.stringify({
      success: true,
      razorpayOrderId: data.id,
      razorpayKeyId: RAZORPAY_KEY_ID,
      amount: data.amount,
      currency: data.currency,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error creating Razorpay order:', error);
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
