import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// HMAC SHA256 verification
async function verifySignature(
  orderId: string,
  paymentId: string,
  signature: string,
  secret: string
): Promise<boolean> {
  const data = `${orderId}|${paymentId}`;
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signatureBytes = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
  const expectedSignature = Array.from(new Uint8Array(signatureBytes))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  
  return expectedSignature === signature;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      razorpay_order_id, 
      razorpay_payment_id, 
      razorpay_signature,
      order_id,
      amount,
      method
    } = await req.json();

    const razorpayKeySecret = Deno.env.get('RAZORPAY_KEY_SECRET');

    if (!razorpayKeySecret) {
      throw new Error('Razorpay secret not configured');
    }

    console.log('Verifying payment:', { razorpay_order_id, razorpay_payment_id });

    // Verify the payment signature
    const isValid = await verifySignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      razorpayKeySecret
    );

    if (!isValid) {
      console.error('Payment signature verification failed');
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Payment verification failed' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Payment verified successfully');

    // Create Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Record the payment
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .insert({
        order_id,
        amount,
        method,
        transaction_id: razorpay_payment_id,
      })
      .select()
      .single();

    if (paymentError) {
      console.error('Error recording payment:', paymentError);
      throw paymentError;
    }

    // Check if order is fully paid
    const { data: order } = await supabase
      .from('orders')
      .select('total')
      .eq('id', order_id)
      .single();

    const { data: payments } = await supabase
      .from('payments')
      .select('amount')
      .eq('order_id', order_id);

    if (order && payments) {
      const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);
      const orderTotal = Number(order.total);

      let paymentStatus: 'pending' | 'partial' | 'completed' = 'pending';
      if (totalPaid >= orderTotal) {
        paymentStatus = 'completed';
      } else if (totalPaid > 0) {
        paymentStatus = 'partial';
      }

      await supabase
        .from('orders')
        .update({ 
          payment_status: paymentStatus,
          ...(paymentStatus === 'completed' ? { status: 'completed' } : {})
        })
        .eq('id', order_id);
    }

    return new Response(JSON.stringify({ 
      success: true, 
      payment_id: payment.id,
      transaction_id: razorpay_payment_id
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error verifying payment:', error);
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
