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
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
      throw new Error('Razorpay credentials not configured');
    }

    const { paymentLinkId, orderId, amount } = await req.json();
    
    console.log('Checking payment status for link:', paymentLinkId);

    const auth = btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`);
    
    // Fetch payment link status
    const response = await fetch(`https://api.razorpay.com/v1/payment_links/${paymentLinkId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${auth}`,
      },
    });

    const data = await response.json();
    
    console.log('Payment link status:', JSON.stringify(data));

    if (!response.ok) {
      console.error('Razorpay API error:', data);
      throw new Error(data.error?.description || 'Failed to check payment status');
    }

    const isPaid = data.status === 'paid';
    
    // If paid, record the payment in database
    if (isPaid && orderId) {
      const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
      
      // Check if payment already recorded
      const { data: existingPayment } = await supabase
        .from('payments')
        .select('id')
        .eq('transaction_id', paymentLinkId)
        .single();

      if (!existingPayment) {
        console.log('Recording payment for order:', orderId);
        
        const { error: paymentError } = await supabase.from('payments').insert({
          order_id: orderId,
          amount: amount,
          method: 'upi',
          transaction_id: paymentLinkId,
        });

        if (paymentError) {
          console.error('Error creating payment record:', paymentError);
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
      }
    }

    return new Response(JSON.stringify({
      success: true,
      status: data.status,
      isPaid,
      amountPaid: data.amount_paid,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error checking payment:', error);
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
