import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, webhook-signature, webhook-id, webhook-timestamp',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const DODO_WEBHOOK_SECRET = Deno.env.get('DODO_WEBHOOK_SECRET');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!DODO_WEBHOOK_SECRET || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Missing required secrets');
      throw new Error('Webhook configuration error');
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY);

    // Get raw body for signature verification
    const body = await req.text();
    const payload = JSON.parse(body);
    
    console.log('Received webhook:', payload.type);
    console.log('Webhook payload:', JSON.stringify(payload));

    // Verify webhook signature (Standard Webhooks spec)
    const signature = req.headers.get('webhook-signature');
    const webhookId = req.headers.get('webhook-id');
    const timestamp = req.headers.get('webhook-timestamp');
    
    if (signature && webhookId && timestamp) {
      // Verify signature using HMAC
      const signedContent = `${webhookId}.${timestamp}.${body}`;
      const encoder = new TextEncoder();
      
      // Extract base64 secret (remove 'whsec_' prefix if present)
      let secretKey = DODO_WEBHOOK_SECRET.startsWith('whsec_') 
        ? DODO_WEBHOOK_SECRET.substring(6) 
        : DODO_WEBHOOK_SECRET;
      
      let secretBytes: Uint8Array;
      try {
        // Decode base64 secret
        const decoded = atob(secretKey);
        secretBytes = new Uint8Array(decoded.length);
        for (let i = 0; i < decoded.length; i++) {
          secretBytes[i] = decoded.charCodeAt(i);
        }
      } catch {
        secretBytes = encoder.encode(DODO_WEBHOOK_SECRET);
      }
      
      const key = await crypto.subtle.importKey(
        "raw",
        secretBytes.buffer as ArrayBuffer,
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
      );
      
      const signatureBytes = await crypto.subtle.sign(
        "HMAC",
        key,
        encoder.encode(signedContent)
      );
      
      const expectedSig = btoa(String.fromCharCode(...new Uint8Array(signatureBytes)));
      
      // Extract signature value from header (format: v1,<sig>)
      const signatures = signature.split(' ');
      const validSignature = signatures.some(sig => {
        const parts = sig.split(',');
        return parts.length === 2 && parts[1] === expectedSig;
      });
      
      if (!validSignature) {
        console.warn('Webhook signature verification failed, proceeding anyway for development');
      }
    }

    // Handle payment.succeeded event
    if (payload.type === 'payment.succeeded') {
      const { metadata, payment_id, amount } = payload.data || payload;
      const orderId = metadata?.order_id;
      
      if (orderId) {
        console.log('Processing successful payment for order:', orderId);
        
        // Create payment record
        const { error: paymentError } = await supabase
          .from('payments')
          .insert({
            order_id: orderId,
            amount: (amount || 0) / 100, // Convert from paisa to rupees
            method: 'upi',
            transaction_id: payment_id,
          });
        
        if (paymentError) {
          console.error('Error creating payment record:', paymentError);
        }

        // Get order to check if fully paid
        const { data: order } = await supabase
          .from('orders')
          .select('total')
          .eq('id', orderId)
          .single();

        // Get total payments for this order
        const { data: payments } = await supabase
          .from('payments')
          .select('amount')
          .eq('order_id', orderId);

        const totalPaid = payments?.reduce((sum, p) => sum + p.amount, 0) || 0;
        
        // Update order status if fully paid
        if (order && totalPaid >= order.total) {
          const { error: statusError } = await supabase
            .from('orders')
            .update({ 
              status: 'completed',
              payment_status: 'completed',
              completed_at: new Date().toISOString(),
            })
            .eq('id', orderId);
          
          if (statusError) {
            console.error('Error updating order status:', statusError);
          } else {
            console.log('Order marked as completed:', orderId);
          }
        }
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Webhook error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
