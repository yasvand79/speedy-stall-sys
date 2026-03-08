

## Plan: AI-Powered Bill Template Import from Image

### What it does
Admins can upload an image of an existing bill/receipt template. The system uses AI (Lovable AI with Gemini vision) to analyze the image, extract layout details (header text, footer text, terms, which fields are shown), and auto-fill the bill template settings accordingly.

### Architecture

1. **New Edge Function: `analyze-bill-template`**
   - Accepts a base64 image from the client
   - Sends it to Lovable AI Gateway using `google/gemini-2.5-flash` (multimodal - can read images)
   - Uses tool calling to extract structured output: `{ bill_header_text, bill_footer_text, bill_terms, bill_show_gstin, bill_show_fssai, bill_show_upi, shop_name, gst_number, fssai_license, upi_id }`
   - Returns the extracted fields to the client

2. **Settings Page UI Update (`src/pages/Settings.tsx`)**
   - Add an "Import from Image" button with file upload (accept images: jpg, png, heic, pdf) in the Bill Template card
   - On upload, convert to base64, call the edge function
   - Show a loading state ("Analyzing template...")
   - Auto-populate the `billTemplate` and relevant `shopDetails` fields with AI-extracted values
   - Show a toast confirming import, user can review and save

3. **Config Update (`supabase/config.toml`)**
   - Register `analyze-bill-template` function with `verify_jwt = false`

### Technical Details

- **Edge function** uses `LOVABLE_API_KEY` (already available) to call `https://ai.gateway.lovable.dev/v1/chat/completions` with the image as a multimodal message
- Uses tool calling for structured extraction (header, footer, terms, toggle fields)
- The prompt instructs the model to identify receipt layout elements and map them to the template fields
- Client sends image as base64 data URL; edge function forwards to AI gateway
- No database changes needed - extracted values populate existing form fields for user review before saving

### Files to Create/Edit
- **Create**: `supabase/functions/analyze-bill-template/index.ts`
- **Edit**: `src/pages/Settings.tsx` - add upload button + import logic in Bill Template section
- Config auto-updates for the new edge function

