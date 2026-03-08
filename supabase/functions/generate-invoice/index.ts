import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function escapeHtml(str: string | null | undefined): string {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { orderId } = await req.json();

    if (!orderId) {
      return new Response(
        JSON.stringify({ error: 'Order ID is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(orderId)) {
      return new Response(
        JSON.stringify({ error: 'Invalid order ID format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch order
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
      return new Response(
        JSON.stringify({ error: 'Order not found or access denied' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch shop settings for GST/FSSAI info
    const { data: shopSettings } = await supabase
      .from('shop_settings')
      .select('*')
      .limit(1)
      .maybeSingle();

    const shopName = escapeHtml(shopSettings?.shop_name || order.branches?.name || 'Restaurant');
    const shopAddress = escapeHtml(shopSettings?.address || order.branches?.location || '');
    const shopPhone = escapeHtml(shopSettings?.phone || order.branches?.phone || '');
    const gstNumber = escapeHtml(shopSettings?.gst_number || '');
    const fssaiLicense = escapeHtml(shopSettings?.fssai_license || '');
    const upiId = escapeHtml(shopSettings?.upi_id || '');
    const branchName = escapeHtml(order.branches?.name || '');

    // Bill template settings
    const billHeaderText = escapeHtml((shopSettings as any)?.bill_header_text || '');
    const billFooterText = escapeHtml((shopSettings as any)?.bill_footer_text || 'Thank You! Visit us again');
    const billTerms = escapeHtml((shopSettings as any)?.bill_terms || '');
    const billShowGstin = (shopSettings as any)?.bill_show_gstin ?? true;
    const billShowFssai = (shopSettings as any)?.bill_show_fssai ?? true;
    const billShowUpi = (shopSettings as any)?.bill_show_upi ?? true;

    const orderDate = new Date(order.created_at);
    const dateStr = orderDate.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const timeStr = orderDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

    // Build items rows
    const itemsHtml = order.order_items.map((item: any, idx: number) => {
      const name = escapeHtml(item.menu_items?.name) || 'Item';
      const qty = Number(item.quantity);
      const price = Number(item.price);
      const total = qty * price;
      return `
        <tr>
          <td class="item-name">${name}</td>
          <td class="item-qty">${qty}</td>
          <td class="item-rate">₹${price.toFixed(2)}</td>
          <td class="item-amt">₹${total.toFixed(2)}</td>
        </tr>`;
    }).join('');

    const totalItems = order.order_items.reduce((s: number, i: any) => s + Number(i.quantity), 0);

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Receipt - ${escapeHtml(order.order_number)}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap');

    * { margin: 0; padding: 0; box-sizing: border-box; }

    @page {
      size: 80mm auto;
      margin: 0;
    }

    body {
      font-family: 'JetBrains Mono', 'Courier New', monospace;
      width: 80mm;
      margin: 0 auto;
      padding: 8mm 5mm;
      background: #fff;
      color: #000;
      font-size: 11px;
      line-height: 1.4;
    }

    .receipt {
      width: 100%;
    }

    /* Dashed separators */
    .sep {
      border: none;
      border-top: 1px dashed #000;
      margin: 6px 0;
    }
    .sep-double {
      border: none;
      border-top: 2px solid #000;
      margin: 6px 0;
    }
    .sep-stars {
      text-align: center;
      font-size: 10px;
      letter-spacing: 2px;
      margin: 4px 0;
    }

    /* Header */
    .shop-name {
      text-align: center;
      font-size: 18px;
      font-weight: 700;
      letter-spacing: 1px;
      text-transform: uppercase;
      margin-bottom: 2px;
    }
    .shop-detail {
      text-align: center;
      font-size: 9px;
      color: #333;
      line-height: 1.5;
    }
    .branch-name {
      text-align: center;
      font-size: 11px;
      font-weight: 600;
      margin-top: 2px;
    }

    /* Receipt title */
    .receipt-title {
      text-align: center;
      font-size: 13px;
      font-weight: 700;
      letter-spacing: 3px;
      text-transform: uppercase;
      margin: 4px 0;
    }

    /* Info rows */
    .info-row {
      display: flex;
      justify-content: space-between;
      font-size: 10px;
      line-height: 1.6;
    }
    .info-label {
      color: #555;
    }
    .info-value {
      font-weight: 600;
      text-align: right;
    }

    /* Items table */
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin: 4px 0;
    }
    .items-table th {
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 4px 0;
      border-bottom: 1px solid #000;
      text-align: left;
    }
    .items-table th:nth-child(2) { text-align: center; }
    .items-table th:nth-child(3),
    .items-table th:nth-child(4) { text-align: right; }

    .item-name {
      padding: 3px 0;
      font-size: 10px;
      max-width: 120px;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .item-qty {
      text-align: center;
      padding: 3px 0;
      font-size: 10px;
    }
    .item-rate {
      text-align: right;
      padding: 3px 0;
      font-size: 10px;
      color: #555;
    }
    .item-amt {
      text-align: right;
      padding: 3px 0;
      font-size: 10px;
      font-weight: 600;
    }

    /* Totals */
    .total-row {
      display: flex;
      justify-content: space-between;
      font-size: 10px;
      padding: 2px 0;
    }
    .total-row.discount {
      color: #16a34a;
    }
    .grand-total {
      display: flex;
      justify-content: space-between;
      font-size: 15px;
      font-weight: 700;
      padding: 6px 0;
      letter-spacing: 0.5px;
    }

    /* Payment info */
    .payment-status {
      text-align: center;
      font-size: 12px;
      font-weight: 700;
      padding: 4px 0;
      letter-spacing: 2px;
      text-transform: uppercase;
    }
    .payment-paid { color: #16a34a; }
    .payment-pending { color: #d97706; }

    /* Footer */
    .footer-msg {
      text-align: center;
      font-size: 10px;
      margin: 2px 0;
    }
    .footer-msg.big {
      font-size: 12px;
      font-weight: 700;
      margin: 6px 0 2px 0;
    }
    .footer-small {
      text-align: center;
      font-size: 8px;
      color: #888;
      margin: 2px 0;
    }

    @media print {
      body { padding: 2mm 3mm; }
    }
  </style>
</head>
<body>
  <div class="receipt">
    <!-- Shop Header -->
    <div class="shop-name">${shopName}</div>
    ${shopAddress ? `<div class="shop-detail">${shopAddress}</div>` : ''}
    ${shopPhone ? `<div class="shop-detail">Tel: ${shopPhone}</div>` : ''}
    ${branchName ? `<div class="branch-name">Branch: ${branchName}</div>` : ''}
    ${billHeaderText ? `<div class="shop-detail" style="margin-top:2px;">${billHeaderText}</div>` : ''}

    <hr class="sep" />

    <div class="receipt-title">Cash Receipt</div>

    <hr class="sep" />

    <!-- Order Info -->
    <div class="info-row">
      <span class="info-label">Receipt #</span>
      <span class="info-value">${escapeHtml(order.order_number)}</span>
    </div>
    <div class="info-row">
      <span class="info-label">Date</span>
      <span class="info-value">${dateStr}</span>
    </div>
    <div class="info-row">
      <span class="info-label">Time</span>
      <span class="info-value">${timeStr}</span>
    </div>
    <div class="info-row">
      <span class="info-label">Type</span>
      <span class="info-value">${order.type === 'dine-in' ? `Dine-In / Table ${Number(order.table_number) || '-'}` : 'Takeaway'}</span>
    </div>
    ${order.customer_name ? `
    <div class="info-row">
      <span class="info-label">Customer</span>
      <span class="info-value">${escapeHtml(order.customer_name)}</span>
    </div>` : ''}
    ${order.customer_phone ? `
    <div class="info-row">
      <span class="info-label">Phone</span>
      <span class="info-value">${escapeHtml(order.customer_phone)}</span>
    </div>` : ''}
    ${order.staff_name ? `
    <div class="info-row">
      <span class="info-label">Cashier</span>
      <span class="info-value">${escapeHtml(order.staff_name)}</span>
    </div>` : ''}

    <hr class="sep-double" />

    <!-- Items -->
    <table class="items-table">
      <thead>
        <tr>
          <th>Item</th>
          <th>Qty</th>
          <th>Rate</th>
          <th>Amt</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml}
      </tbody>
    </table>

    <hr class="sep" />

    <!-- Item count -->
    <div class="total-row">
      <span>Total Items</span>
      <span style="font-weight:600">${totalItems}</span>
    </div>

    <hr class="sep" />

    <!-- Totals -->
    <div class="total-row">
      <span>Sub Total</span>
      <span>₹${Number(order.subtotal).toFixed(2)}</span>
    </div>
    <div class="total-row">
      <span>GST (${shopSettings?.gst_rate || 5}%)</span>
      <span>₹${Number(order.gst).toFixed(2)}</span>
    </div>
    ${Number(order.discount) > 0 ? `
    <div class="total-row discount">
      <span>Discount</span>
      <span>-₹${Number(order.discount).toFixed(2)}</span>
    </div>` : ''}

    <hr class="sep-double" />

    <div class="grand-total">
      <span>TOTAL</span>
      <span>₹${Number(order.total).toFixed(2)}</span>
    </div>

    <hr class="sep-double" />

    <!-- Payment Status -->
    <div class="payment-status ${order.payment_status === 'completed' ? 'payment-paid' : 'payment-pending'}">
      ${order.payment_status === 'completed' ? '✓ PAID' : '⏳ PAYMENT PENDING'}
    </div>

    <hr class="sep" />

    ${billShowGstin && gstNumber ? `
    <div class="info-row">
      <span class="info-label">GSTIN</span>
      <span class="info-value">${gstNumber}</span>
    </div>` : ''}
    ${billShowFssai && fssaiLicense ? `
    <div class="info-row">
      <span class="info-label">FSSAI</span>
      <span class="info-value">${fssaiLicense}</span>
    </div>` : ''}

    ${(billShowGstin && gstNumber) || (billShowFssai && fssaiLicense) ? '<hr class="sep" />' : ''}

    <!-- Footer -->
    <div class="footer-msg big">${billFooterText.split(/[.!]/).shift() || 'Thank You!'}</div>
    ${billFooterText.includes(' ') ? `<div class="footer-msg">${billFooterText}</div>` : ''}

    <div class="sep-stars">********************************</div>

    ${billTerms ? `<div class="footer-small" style="font-size:9px; color:#555;">${billTerms}</div>` : ''}
    <div class="footer-small">This is a computer-generated receipt</div>
    <div class="footer-small">No signature required</div>

    ${billShowUpi && upiId ? `
    <hr class="sep" />
    <div class="footer-small" style="font-size:9px; color:#333;">
      UPI: ${upiId}
    </div>` : ''}
  </div>
</body>
</html>`;

    return new Response(
      JSON.stringify({ 
        success: true, 
        html,
        order: {
          order_number: order.order_number,
          total: order.total,
          branch_name: order.branches?.name || 'Main Branch'
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
