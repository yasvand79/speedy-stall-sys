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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    // Get authorization header from request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('Missing authorization header');
      return new Response(
        JSON.stringify({ error: 'Unauthorized - missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create client with user's token - RLS will apply
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: authHeader,
        },
      },
    });

    // Verify the user is authenticated
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('Invalid or expired token:', userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized - invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Authenticated user:', user.id);

    const { orderId } = await req.json();

    if (!orderId) {
      console.error('Missing orderId in request');
      return new Response(
        JSON.stringify({ error: 'Order ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate orderId format (UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(orderId)) {
      console.error('Invalid orderId format:', orderId);
      return new Response(
        JSON.stringify({ error: 'Invalid order ID format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Generating invoice for order:', orderId);

    // Fetch order with items and branch - RLS will automatically filter based on user's permissions
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(`
        *,
        order_items (
          *,
          menu_items (name, category)
        ),
        branches (name, location, phone, email, code)
      `)
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      console.error('Order not found or access denied:', orderError);
      return new Response(
        JSON.stringify({ error: 'Order not found or access denied' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Order fetched successfully:', order.order_number);

    // Generate HTML for PDF
    const invoiceDate = new Date(order.created_at).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    const branchName = order.branches?.name || 'Main Branch';
    const branchLocation = order.branches?.location || '';
    const branchPhone = order.branches?.phone || '';
    const branchEmail = order.branches?.email || '';

    const itemsHtml = order.order_items.map((item: any) => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.menu_items?.name || 'Unknown Item'}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">₹${Number(item.price).toFixed(2)}</td>
        <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">₹${(Number(item.price) * item.quantity).toFixed(2)}</td>
      </tr>
    `).join('');

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Invoice - ${order.order_number}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 40px; background: #fff; color: #333; }
    .invoice-container { max-width: 800px; margin: 0 auto; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; padding-bottom: 20px; border-bottom: 3px solid #3b82f6; }
    .company-info h1 { color: #3b82f6; font-size: 28px; margin-bottom: 5px; }
    .company-info p { color: #666; font-size: 14px; line-height: 1.6; }
    .invoice-details { text-align: right; }
    .invoice-details h2 { font-size: 24px; color: #333; margin-bottom: 10px; }
    .invoice-details p { font-size: 14px; color: #666; }
    .invoice-number { font-size: 18px; font-weight: bold; color: #3b82f6; }
    .info-section { display: flex; justify-content: space-between; margin-bottom: 30px; }
    .info-box { flex: 1; padding: 20px; background: #f8fafc; border-radius: 8px; margin-right: 20px; }
    .info-box:last-child { margin-right: 0; }
    .info-box h3 { font-size: 12px; text-transform: uppercase; color: #666; margin-bottom: 10px; letter-spacing: 1px; }
    .info-box p { font-size: 14px; line-height: 1.6; }
    .items-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
    .items-table th { background: #3b82f6; color: white; padding: 12px; text-align: left; font-size: 14px; }
    .items-table th:nth-child(2), .items-table th:nth-child(3), .items-table th:nth-child(4) { text-align: center; }
    .items-table th:last-child { text-align: right; }
    .totals { margin-left: auto; width: 300px; }
    .totals-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
    .totals-row.grand-total { border-bottom: none; border-top: 2px solid #3b82f6; padding-top: 15px; margin-top: 10px; font-size: 18px; font-weight: bold; color: #3b82f6; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; color: #999; font-size: 12px; }
    .payment-badge { display: inline-block; padding: 5px 15px; border-radius: 20px; font-size: 12px; font-weight: bold; text-transform: uppercase; }
    .payment-paid { background: #dcfce7; color: #16a34a; }
    .payment-pending { background: #fef3c7; color: #d97706; }
    .staff-info { background: #f0f9ff; padding: 15px; border-radius: 8px; margin-bottom: 30px; }
    .staff-info p { font-size: 14px; color: #0369a1; }
  </style>
</head>
<body>
  <div class="invoice-container">
    <div class="header">
      <div class="company-info">
        <h1>${branchName}</h1>
        <p>${branchLocation}</p>
        ${branchPhone ? `<p>Phone: ${branchPhone}</p>` : ''}
        ${branchEmail ? `<p>Email: ${branchEmail}</p>` : ''}
      </div>
      <div class="invoice-details">
        <h2>INVOICE</h2>
        <p class="invoice-number">${order.order_number}</p>
        <p>${invoiceDate}</p>
        <p style="margin-top: 10px;">
          <span class="payment-badge ${order.payment_status === 'completed' ? 'payment-paid' : 'payment-pending'}">
            ${order.payment_status === 'completed' ? 'PAID' : 'PENDING'}
          </span>
        </p>
      </div>
    </div>

    <div class="info-section">
      <div class="info-box">
        <h3>Order Details</h3>
        <p><strong>Type:</strong> ${order.type === 'dine-in' ? 'Dine-In' : 'Takeaway'}</p>
        ${order.table_number ? `<p><strong>Table:</strong> ${order.table_number}</p>` : ''}
        <p><strong>Status:</strong> ${order.status.charAt(0).toUpperCase() + order.status.slice(1)}</p>
      </div>
      <div class="info-box">
        <h3>Customer Details</h3>
        <p><strong>Name:</strong> ${order.customer_name || 'Walk-in Customer'}</p>
        ${order.customer_phone ? `<p><strong>Phone:</strong> ${order.customer_phone}</p>` : ''}
      </div>
    </div>

    <div class="staff-info">
      <p><strong>Served by:</strong> ${order.staff_name || 'Staff'} | <strong>Branch:</strong> ${branchName}</p>
    </div>

    <table class="items-table">
      <thead>
        <tr>
          <th>Item</th>
          <th>Qty</th>
          <th>Price</th>
          <th>Total</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml}
      </tbody>
    </table>

    <div class="totals">
      <div class="totals-row">
        <span>Subtotal</span>
        <span>₹${Number(order.subtotal).toFixed(2)}</span>
      </div>
      <div class="totals-row">
        <span>GST (5%)</span>
        <span>₹${Number(order.gst).toFixed(2)}</span>
      </div>
      ${order.discount > 0 ? `
      <div class="totals-row">
        <span>Discount</span>
        <span>-₹${Number(order.discount).toFixed(2)}</span>
      </div>
      ` : ''}
      <div class="totals-row grand-total">
        <span>Grand Total</span>
        <span>₹${Number(order.total).toFixed(2)}</span>
      </div>
    </div>

    <div class="footer">
      <p>Thank you for your visit!</p>
      <p style="margin-top: 5px;">This is a computer-generated invoice.</p>
    </div>
  </div>
</body>
</html>
    `;

    console.log('Invoice HTML generated successfully');

    return new Response(
      JSON.stringify({ 
        success: true, 
        html,
        order: {
          order_number: order.order_number,
          total: order.total,
          branch_name: branchName
        }
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error generating invoice:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to generate invoice' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
