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

function buildDefaultTemplate(vars: Record<string, string>): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Receipt - ${vars.ORDER_NUMBER}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    @page { size: 80mm auto; margin: 0; }
    body { font-family: 'Courier New', 'Courier', monospace; width: 80mm; margin: 0 auto; padding: 8mm 5mm; background: #fff; color: #000; font-size: 11px; line-height: 1.4; }
    .receipt { width: 100%; }
    .sep { border: none; border-top: 1px dashed #000; margin: 6px 0; }
    .sep-double { border: none; border-top: 2px solid #000; margin: 6px 0; }
    .sep-stars { text-align: center; font-size: 10px; letter-spacing: 2px; margin: 4px 0; }
    .shop-name { text-align: center; font-size: 18px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 2px; }
    .shop-detail { text-align: center; font-size: 9px; color: #333; line-height: 1.5; }
    .branch-name { text-align: center; font-size: 11px; font-weight: 600; margin-top: 2px; }
    .receipt-title { text-align: center; font-size: 13px; font-weight: 700; letter-spacing: 3px; text-transform: uppercase; margin: 4px 0; }
    .info-row { display: flex; justify-content: space-between; font-size: 10px; line-height: 1.6; }
    .info-label { color: #555; }
    .info-value { font-weight: 600; text-align: right; }
    .items-table { width: 100%; border-collapse: collapse; margin: 4px 0; }
    .items-table th { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; padding: 4px 0; border-bottom: 1px solid #000; text-align: left; }
    .items-table th:nth-child(2) { text-align: center; }
    .items-table th:nth-child(3), .items-table th:nth-child(4) { text-align: right; }
    .item-name { padding: 3px 0; font-size: 10px; max-width: 120px; overflow: hidden; text-overflow: ellipsis; }
    .item-qty { text-align: center; padding: 3px 0; font-size: 10px; }
    .item-rate { text-align: right; padding: 3px 0; font-size: 10px; color: #555; }
    .item-amt { text-align: right; padding: 3px 0; font-size: 10px; font-weight: 600; }
    .total-row { display: flex; justify-content: space-between; font-size: 10px; padding: 2px 0; }
    .total-row.discount { color: #16a34a; }
    .grand-total { display: flex; justify-content: space-between; font-size: 15px; font-weight: 700; padding: 6px 0; letter-spacing: 0.5px; }
    .payment-status { text-align: center; font-size: 12px; font-weight: 700; padding: 4px 0; letter-spacing: 2px; text-transform: uppercase; }
    .payment-paid { color: #16a34a; }
    .payment-pending { color: #d97706; }
    .footer-msg { text-align: center; font-size: 10px; margin: 2px 0; }
    .footer-msg.big { font-size: 12px; font-weight: 700; margin: 6px 0 2px 0; }
    .footer-small { text-align: center; font-size: 8px; color: #888; margin: 2px 0; }
    @media print { body { padding: 2mm 3mm; } }
  </style>
</head>
<body>
  <div class="receipt">
    <div class="shop-name">${vars.SHOP_NAME}</div>
    ${vars.SHOP_ADDRESS ? `<div class="shop-detail">${vars.SHOP_ADDRESS}</div>` : ''}
    ${vars.SHOP_PHONE ? `<div class="shop-detail">Tel: ${vars.SHOP_PHONE}</div>` : ''}
    ${vars.BRANCH_NAME ? `<div class="branch-name">Branch: ${vars.BRANCH_NAME}</div>` : ''}
    ${vars.BILL_HEADER_TEXT ? `<div class="shop-detail" style="margin-top:2px;">${vars.BILL_HEADER_TEXT}</div>` : ''}
    <hr class="sep" />
    <div class="receipt-title">Cash Receipt</div>
    <hr class="sep" />
    <div class="info-row"><span class="info-label">Receipt #</span><span class="info-value">${vars.ORDER_NUMBER}</span></div>
    <div class="info-row"><span class="info-label">Date</span><span class="info-value">${vars.DATE}</span></div>
    <div class="info-row"><span class="info-label">Time</span><span class="info-value">${vars.TIME}</span></div>
    <div class="info-row"><span class="info-label">Type</span><span class="info-value">${vars.ORDER_TYPE}</span></div>
    ${vars.CUSTOMER_NAME ? `<div class="info-row"><span class="info-label">Customer</span><span class="info-value">${vars.CUSTOMER_NAME}</span></div>` : ''}
    ${vars.CUSTOMER_PHONE ? `<div class="info-row"><span class="info-label">Phone</span><span class="info-value">${vars.CUSTOMER_PHONE}</span></div>` : ''}
    ${vars.STAFF_NAME ? `<div class="info-row"><span class="info-label">Cashier</span><span class="info-value">${vars.STAFF_NAME}</span></div>` : ''}
    <hr class="sep-double" />
    <table class="items-table">
      <thead><tr><th>Item</th><th>Qty</th><th>Rate</th><th>Amt</th></tr></thead>
      <tbody>${vars.ITEMS_HTML}</tbody>
    </table>
    <hr class="sep" />
    <div class="total-row"><span>Total Items</span><span style="font-weight:600">${vars.TOTAL_ITEMS}</span></div>
    <hr class="sep" />
    <div class="total-row"><span>Sub Total</span><span>₹${vars.SUBTOTAL}</span></div>
    <div class="total-row"><span>GST (${vars.GST_RATE}%)</span><span>₹${vars.GST_AMOUNT}</span></div>
    ${vars.DISCOUNT_HTML}
    <hr class="sep-double" />
    <div class="grand-total"><span>TOTAL</span><span>₹${vars.TOTAL}</span></div>
    <hr class="sep-double" />
    <div class="payment-status ${vars.PAYMENT_STATUS_CLASS}">${vars.PAYMENT_STATUS_TEXT}</div>
    <hr class="sep" />
    ${vars.GSTIN_HTML}
    ${vars.FSSAI_HTML}
    ${vars.GSTIN_FSSAI_SEP}
    <div class="footer-msg big">${vars.BILL_FOOTER_TEXT}</div>
    <div class="sep-stars">********************************</div>
    ${vars.BILL_TERMS ? `<div class="footer-small" style="font-size:9px; color:#555;">${vars.BILL_TERMS}</div>` : ''}
    <div class="footer-small">This is a computer-generated receipt</div>
    <div class="footer-small">No signature required</div>
    ${vars.UPI_HTML}
  </div>
</body>
</html>`;
}

function applyCustomTemplate(templateHtml: string, vars: Record<string, string>): string {
  let html = templateHtml;
  
  // Replace all placeholders
  for (const [key, value] of Object.entries(vars)) {
    html = html.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
  }
  
  // Process conditionals: <!-- IF KEY -->content<!-- ENDIF -->
  html = html.replace(/<!-- IF (\w+) -->([\s\S]*?)<!-- ENDIF -->/g, (_, key, content) => {
    return vars[key] ? content : '';
  });
  
  return html;
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
      .select(`*, order_items (*, menu_items (name, category)), branches (name, location, phone, email, code)`)
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      return new Response(
        JSON.stringify({ error: 'Order not found or access denied' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch shop settings
    const { data: shopSettings } = await supabase
      .from('shop_settings')
      .select('*')
      .limit(1)
      .maybeSingle();

    const s = shopSettings as any;
    const billShowGstin = s?.bill_show_gstin ?? true;
    const billShowFssai = s?.bill_show_fssai ?? true;
    const billShowUpi = s?.bill_show_upi ?? true;
    
    const shopName = escapeHtml(s?.shop_name || order.branches?.name || 'Restaurant');
    const shopAddress = escapeHtml(s?.address || order.branches?.location || '');
    const shopPhone = escapeHtml(s?.phone || order.branches?.phone || '');
    const gstNumber = escapeHtml(s?.gst_number || '');
    const fssaiLicense = escapeHtml(s?.fssai_license || '');
    const upiId = escapeHtml(s?.upi_id || '');
    const branchName = escapeHtml(order.branches?.name || '');
    const billHeaderText = escapeHtml(s?.bill_header_text || '');
    const billFooterText = escapeHtml(s?.bill_footer_text || 'Thank You! Visit us again');
    const billTerms = escapeHtml(s?.bill_terms || '');

    const orderDate = new Date(order.created_at);
    const dateStr = orderDate.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const timeStr = orderDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });

    const itemsHtml = order.order_items.map((item: any) => {
      const name = escapeHtml(item.menu_items?.name) || 'Item';
      const qty = Number(item.quantity);
      const price = Number(item.price);
      const total = qty * price;
      return `<tr><td class="item-name">${name}</td><td class="item-qty">${qty}</td><td class="item-rate">₹${price.toFixed(2)}</td><td class="item-amt">₹${total.toFixed(2)}</td></tr>`;
    }).join('');

    const totalItems = order.order_items.reduce((sum: number, i: any) => sum + Number(i.quantity), 0);

    const gstinHtml = billShowGstin && gstNumber
      ? `<div class="info-row"><span class="info-label">GSTIN</span><span class="info-value">${gstNumber}</span></div>` : '';
    const fssaiHtml = billShowFssai && fssaiLicense
      ? `<div class="info-row"><span class="info-label">FSSAI</span><span class="info-value">${fssaiLicense}</span></div>` : '';
    const gstinFssaiSep = (gstinHtml || fssaiHtml) ? '<hr class="sep" />' : '';
    const discountHtml = Number(order.discount) > 0
      ? `<div class="total-row discount"><span>Discount</span><span>-₹${Number(order.discount).toFixed(2)}</span></div>` : '';
    const upiHtml = billShowUpi && upiId
      ? `<hr class="sep" /><div class="footer-small" style="font-size:9px; color:#333;">UPI: ${upiId}</div>` : '';

    // Build template variables
    const vars: Record<string, string> = {
      SHOP_NAME: shopName,
      SHOP_ADDRESS: shopAddress,
      SHOP_PHONE: shopPhone,
      BRANCH_NAME: branchName,
      BILL_HEADER_TEXT: billHeaderText,
      ORDER_NUMBER: escapeHtml(order.order_number),
      DATE: dateStr,
      TIME: timeStr,
      ORDER_TYPE: order.type === 'dine-in' ? `Dine-In / Table ${Number(order.table_number) || '-'}` : 'Takeaway',
      CUSTOMER_NAME: escapeHtml(order.customer_name || ''),
      CUSTOMER_PHONE: escapeHtml(order.customer_phone || ''),
      STAFF_NAME: escapeHtml(order.staff_name || ''),
      ITEMS_HTML: itemsHtml,
      TOTAL_ITEMS: String(totalItems),
      SUBTOTAL: Number(order.subtotal).toFixed(2),
      GST_RATE: String(s?.gst_rate || 5),
      GST_AMOUNT: Number(order.gst).toFixed(2),
      DISCOUNT_HTML: discountHtml,
      TOTAL: Number(order.total).toFixed(2),
      PAYMENT_STATUS_CLASS: order.payment_status === 'completed' ? 'payment-paid' : 'payment-pending',
      PAYMENT_STATUS_TEXT: order.payment_status === 'completed' ? '✓ PAID' : '⏳ PAYMENT PENDING',
      GSTIN_HTML: gstinHtml,
      FSSAI_HTML: fssaiHtml,
      GSTIN_FSSAI_SEP: gstinFssaiSep,
      BILL_FOOTER_TEXT: billFooterText,
      BILL_TERMS: billTerms,
      UPI_HTML: upiHtml,
    };

    // Use custom template if available, otherwise default
    const customTemplate = s?.custom_bill_html;
    const html = customTemplate
      ? applyCustomTemplate(customTemplate, vars)
      : buildDefaultTemplate(vars);

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
