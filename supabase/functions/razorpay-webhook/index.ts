import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-razorpay-signature',
};

// Verify Razorpay webhook signature
async function verifyWebhookSignature(payload: string, signature: string, secret: string): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    
    const signatureBuffer = await crypto.subtle.sign(
      'HMAC',
      key,
      encoder.encode(payload)
    );
    
    const expectedSignature = Array.from(new Uint8Array(signatureBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    return expectedSignature === signature;
  } catch (error) {
    console.error('Signature verification error:', error);
    return false;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const RAZORPAY_WEBHOOK_SECRET = Deno.env.get('RAZORPAY_WEBHOOK_SECRET');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Supabase credentials not configured');
    }

    const payload = await req.text();
    const signature = req.headers.get('x-razorpay-signature');
    
    console.log('Received Razorpay webhook');
    
    // Verify signature if webhook secret is configured
    if (RAZORPAY_WEBHOOK_SECRET && signature) {
      const isValid = await verifyWebhookSignature(payload, signature, RAZORPAY_WEBHOOK_SECRET);
      if (!isValid) {
        console.error('Invalid webhook signature');
        return new Response(JSON.stringify({ error: 'Invalid signature' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      console.log('Webhook signature verified');
    }

    const event = JSON.parse(payload);
    console.log('Webhook event:', event.event);
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Handle payment link paid event
    if (event.event === 'payment_link.paid') {
      const paymentLink = event.payload.payment_link.entity;
      const payment = event.payload.payment.entity;
      
      console.log('Payment link paid:', paymentLink.id);
      console.log('Payment details:', JSON.stringify(payment));
      
      // Extract order ID from notes
      const orderId = paymentLink.notes?.order_id;
      const amountPaid = payment.amount / 100; // Convert from paise to rupees
      
      if (!orderId) {
        console.log('No order_id found in payment link notes');
        return new Response(JSON.stringify({ success: true, message: 'No order to update' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      // Check if payment already recorded
      const { data: existingPayment } = await supabase
        .from('payments')
        .select('id')
        .eq('transaction_id', paymentLink.id)
        .maybeSingle();

      if (existingPayment) {
        console.log('Payment already recorded');
        return new Response(JSON.stringify({ success: true, message: 'Payment already recorded' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      console.log('Recording payment for order:', orderId);
      
      // Record the payment
      const { error: paymentError } = await supabase.from('payments').insert({
        order_id: orderId,
        amount: amountPaid,
        method: 'upi',
        transaction_id: paymentLink.id,
      });

      if (paymentError) {
        console.error('Error creating payment record:', paymentError);
        throw paymentError;
      }

      // Check if order is fully paid and update status
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
        console.log(`Total paid: ${totalPaid}, Order total: ${order.total}`);
        
        if (totalPaid >= order.total) {
          await supabase
            .from('orders')
            .update({ 
              payment_status: 'completed',
              status: 'completed',
              completed_at: new Date().toISOString()
            })
            .eq('id', orderId);
          console.log('Order marked as completed');
        } else {
          await supabase
            .from('orders')
            .update({ payment_status: 'partial' })
            .eq('id', orderId);
          console.log('Order marked as partially paid');
        }
      }
      
      return new Response(JSON.stringify({ success: true, message: 'Payment recorded' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Handle other events
    console.log('Unhandled event type:', event.event);
    return new Response(JSON.stringify({ success: true, message: 'Event received' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Webhook error:', error);
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
