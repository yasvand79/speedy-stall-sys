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
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    
    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
      throw new Error('Razorpay credentials not configured');
    }

    const { orderId, orderNumber, amount, customerName, customerPhone, shopUpiId } = await req.json();
    
    console.log('Creating Razorpay payment link for order:', orderNumber);

    const auth = btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`);
    
    // Build webhook callback URL
    const webhookUrl = `${SUPABASE_URL}/functions/v1/razorpay-webhook`;
    
    // Create payment link with UPI preferred
    const paymentLinkPayload: Record<string, unknown> = {
      amount: Math.round(amount * 100), // Convert to paise
      currency: 'INR',
      accept_partial: false,
      description: `Order ${orderNumber}`,
      reference_id: orderId,
      notes: {
        order_id: orderId,
        order_number: orderNumber,
      },
      callback_url: webhookUrl,
      callback_method: 'get',
      // Enable only UPI for direct app opening
      options: {
        checkout: {
          method: {
            upi: true,
            card: false,
            netbanking: false,
            wallet: false,
            emi: false,
            paylater: false,
          },
        },
      },
    };

    // Add customer details if provided
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

    const data = await response.json();
    
    console.log('Razorpay payment link response:', JSON.stringify(data));

    if (!response.ok) {
      console.error('Razorpay API error:', data);
      throw new Error(data.error?.description || 'Failed to create payment link');
    }

    // Generate direct UPI intent URL using shop's UPI ID for QR display
    // This allows scanning to open directly in GPay/PhonePe
    const upiIntentUrl = shopUpiId 
      ? `upi://pay?pa=${encodeURIComponent(shopUpiId)}&pn=${encodeURIComponent(customerName || 'Shop')}&am=${amount.toFixed(2)}&cu=INR&tn=${encodeURIComponent(`Order ${orderNumber}`)}`
      : data.short_url;

    return new Response(JSON.stringify({
      success: true,
      paymentLinkId: data.id,
      shortUrl: data.short_url,
      upiIntentUrl: upiIntentUrl,
      amount: data.amount,
      currency: data.currency,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error creating payment link:', error);
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
