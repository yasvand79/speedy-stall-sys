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
    const RAZORPAY_KEY_ID = Deno.env.get('RAZORPAY_KEY_ID');
    const RAZORPAY_KEY_SECRET = Deno.env.get('RAZORPAY_KEY_SECRET');
    
    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
      console.error('Razorpay credentials not configured');
      throw new Error('Razorpay credentials not configured');
    }

    const { orderId, orderNumber, amount, customerName } = await req.json();
    
    console.log('Creating Razorpay QR for:', orderNumber, 'amount:', amount);

    const auth = btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`);
    
    // Create a payment link with QR code
    const response = await fetch('https://api.razorpay.com/v1/payment_links', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: Math.round(amount * 100), // Amount in paisa
        currency: 'INR',
        accept_partial: false,
        description: `Order ${orderNumber}`,
        customer: {
          name: customerName || 'Customer',
        },
        notify: {
          sms: false,
          email: false,
        },
        reminder_enable: false,
        notes: {
          order_id: orderId,
          order_number: orderNumber,
        },
        callback_url: '',
        callback_method: '',
      }),
    });

    const data = await response.json();
    
    console.log('Razorpay payment link response:', JSON.stringify(data));

    if (!response.ok) {
      console.error('Razorpay API error:', data);
      throw new Error(data.error?.description || 'Failed to create Razorpay QR');
    }

    return new Response(JSON.stringify({
      success: true,
      paymentLinkId: data.id,
      shortUrl: data.short_url,
      amount: data.amount,
      currency: data.currency,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error creating Razorpay QR:', error);
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
