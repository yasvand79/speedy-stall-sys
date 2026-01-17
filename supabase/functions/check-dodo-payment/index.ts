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
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!DODO_API_KEY) {
      throw new Error('DoDo Pay API key not configured');
    }

    const { paymentId, orderId } = await req.json();
    
    console.log('Checking payment status for:', paymentId || orderId);

    if (paymentId) {
      // Check payment status with DoDo API
      const response = await fetch(`https://live.dodopayments.com/payments/${paymentId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${DODO_API_KEY}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      console.log('DoDo payment status:', JSON.stringify(data));

      if (!response.ok) {
        throw new Error(data.message || 'Failed to check payment status');
      }

      return new Response(JSON.stringify({
        success: true,
        status: data.status,
        paid: data.status === 'succeeded',
        amount: data.amount ? data.amount / 100 : 0,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Alternatively, check by order ID from database
    if (orderId) {
      const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
      
      const { data: order } = await supabase
        .from('orders')
        .select('payment_status, status, total')
        .eq('id', orderId)
        .single();

      const { data: payments } = await supabase
        .from('payments')
        .select('amount')
        .eq('order_id', orderId);

      const totalPaid = payments?.reduce((sum, p) => sum + p.amount, 0) || 0;

      return new Response(JSON.stringify({
        success: true,
        paid: order?.payment_status === 'completed' || totalPaid >= (order?.total || 0),
        status: order?.payment_status,
        totalPaid,
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    throw new Error('Either paymentId or orderId is required');

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
