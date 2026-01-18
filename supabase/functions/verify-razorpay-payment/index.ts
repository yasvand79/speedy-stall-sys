import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function verifySignature(
  razorpayOrderId: string,
  razorpayPaymentId: string,
  signature: string,
  secret: string
): Promise<boolean> {
  const encoder = new TextEncoder();
  const data = `${razorpayOrderId}|${razorpayPaymentId}`;
  
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
  const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  
  return expectedSignature === signature;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const RAZORPAY_KEY_SECRET = Deno.env.get('RAZORPAY_KEY_SECRET');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!RAZORPAY_KEY_SECRET) {
      throw new Error('Razorpay secret not configured');
    }

    const { 
      razorpayOrderId, 
      razorpayPaymentId, 
      razorpaySignature,
      orderId,
      amount 
    } = await req.json();

    console.log('Verifying Razorpay payment:', razorpayPaymentId, 'for order:', orderId);

    // Verify signature
    const isValid = await verifySignature(
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature,
      RAZORPAY_KEY_SECRET
    );

    if (!isValid) {
      console.error('Invalid Razorpay signature');
      throw new Error('Payment verification failed - invalid signature');
    }

    console.log('Signature verified successfully');

    // Create payment record
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    
    const { error: paymentError } = await supabase.from('payments').insert({
      order_id: orderId,
      amount: amount,
      method: 'upi',
      transaction_id: razorpayPaymentId,
    });

    if (paymentError) {
      console.error('Error creating payment record:', paymentError);
      throw new Error('Failed to record payment');
    }

    // Check if order is fully paid
    const { data: payments } = await supabase
      .from('payments')
      .select('amount')
      .eq('order_id', orderId);

    const { data: order } = await supabase
      .from('orders')
      .select('total')
      .eq('id', orderId)
      .single();

    if (order && payments) {
      const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
      if (totalPaid >= order.total) {
        await supabase
          .from('orders')
          .update({ 
            payment_status: 'completed',
            status: 'completed',
            completed_at: new Date().toISOString()
          })
          .eq('id', orderId);
      } else {
        await supabase
          .from('orders')
          .update({ payment_status: 'partial' })
          .eq('id', orderId);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Payment verified and recorded',
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error verifying payment:', error);
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
