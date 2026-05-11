/**
 * Email sending via Resend.
 *
 * Set RESEND_API_KEY in Vercel env vars to enable. If the key isn't set,
 * sends are no-ops so local dev / preview builds don't fail.
 *
 * Free tier: 3,000/month, 100/day. More than enough until we're sending
 * thousands of alerts a day.
 */

import { Resend } from 'resend';

const FROM = 'Clipprr <alerts@clipprr.co.uk>';

function client() {
  const key = process.env.RESEND_API_KEY;
  if (!key) return null;
  return new Resend(key);
}

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}): Promise<{ ok: boolean; error?: string }> {
  const resend = client();
  if (!resend) {
    console.warn('[email] RESEND_API_KEY not set — skipping send to', to);
    return { ok: false, error: 'no_api_key' };
  }

  try {
    const { error } = await resend.emails.send({ from: FROM, to, subject, html });
    if (error) {
      console.error('[email] Resend error:', error);
      return { ok: false, error: error.message };
    }
    return { ok: true };
  } catch (e: any) {
    console.error('[email] Send failed:', e);
    return { ok: false, error: e.message };
  }
}

/**
 * Renders a price-drop email. Plain HTML, no fancy templates — works in
 * every inbox and stays readable as plain text fallback.
 */
export function priceDropEmailHtml({
  productName,
  brandName,
  imageKey,
  oldPrice,
  newPrice,
  retailerName,
  retailerUrl,
  productUrl,
}: {
  productName: string;
  brandName: string;
  imageKey: string | null;
  oldPrice: number;
  newPrice: number;
  retailerName: string;
  retailerUrl: string;
  productUrl: string;
}): string {
  const saving = (oldPrice - newPrice).toFixed(2);
  const pct = Math.round(((oldPrice - newPrice) / oldPrice) * 100);
  const imgSrc = imageKey
    ? `https://clipprr.co.uk/products/${imageKey}.png`
    : null;

  return `
<!doctype html>
<html lang="en">
  <body style="margin:0;padding:0;background:#f5f5f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#0a0a0a;">
    <table cellpadding="0" cellspacing="0" border="0" align="center" width="100%" style="max-width:540px;margin:0 auto;padding:32px 24px;">
      <tr>
        <td style="font-size:13px;letter-spacing:0.18em;text-transform:uppercase;color:#7c2d12;font-weight:600;padding-bottom:8px;">
          Price drop
        </td>
      </tr>
      <tr>
        <td style="font-size:28px;font-weight:800;line-height:1.2;padding-bottom:24px;letter-spacing:-0.02em;">
          ${brandName} ${productName}<br/>just dropped to £${newPrice.toFixed(2)}.
        </td>
      </tr>
      ${
        imgSrc
          ? `<tr>
              <td align="center" style="padding:8px 0 24px;">
                <img src="${imgSrc}" alt="${productName}" width="280" style="max-width:280px;height:auto;display:block;"/>
              </td>
            </tr>`
          : ''
      }
      <tr>
        <td style="background:#ffffff;border:1px solid #e7e5e4;border-radius:8px;padding:20px;">
          <div style="font-size:13px;color:#78716c;margin-bottom:4px;">${retailerName}</div>
          <div style="font-size:24px;font-weight:700;color:#0a0a0a;">£${newPrice.toFixed(2)}</div>
          <div style="font-size:13px;color:#78716c;margin-top:2px;">
            was <span style="text-decoration:line-through;">£${oldPrice.toFixed(2)}</span> — you save £${saving} (${pct}% off)
          </div>
          <a href="${retailerUrl}"
             style="display:inline-block;margin-top:16px;background:#0a0a0a;color:#fff;text-decoration:none;padding:12px 20px;border-radius:6px;font-weight:600;font-size:14px;">
            Buy at ${retailerName} →
          </a>
        </td>
      </tr>
      <tr>
        <td style="padding:24px 4px;font-size:14px;color:#78716c;line-height:1.5;">
          You set a bell on this product at <a href="${productUrl}" style="color:#0a0a0a;">${productUrl.replace('https://','')}</a>.
          We'll keep watching it and email you again if it drops further.
        </td>
      </tr>
      <tr>
        <td style="padding:8px 4px 0;font-size:12px;color:#a8a29e;border-top:1px solid #e7e5e4;">
          <a href="https://clipprr.co.uk/account/alerts" style="color:#78716c;">Manage your alerts</a>
          &nbsp;·&nbsp; Clipprr — UK barber tool price comparison
        </td>
      </tr>
    </table>
  </body>
</html>`;
}
