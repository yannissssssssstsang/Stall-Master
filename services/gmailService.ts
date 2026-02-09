
/**
 * Gmail Service for StallMaster POS
 */
import { Transaction, Language } from '../types';

const getAccessToken = () => {
  return (window as any).google_access_token || localStorage.getItem('google_access_token');
};

/**
 * Construct an RFC 2822 formatted email and encode it to base64url.
 */
const createMimeMessage = (to: string, subject: string, body: string) => {
  const message = [
    `To: ${to}`,
    'Content-Type: text/html; charset=utf-8',
    'MIME-Version: 1.0',
    `Subject: ${subject}`,
    '',
    body
  ].join('\n');

  // Standard base64 to base64url conversion
  return btoa(unescape(encodeURIComponent(message)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
};

export const sendReceiptEmail = async (transaction: Transaction, to: string, lang: Language): Promise<boolean> => {
  const token = getAccessToken();
  if (!token) {
    console.error("No Gmail access token found.");
    return false;
  }

  const title = lang === 'zh' ? '您的收據 - 市集管家' : 'Your Receipt - StallMaster';
  
  const itemsHtml = transaction.items.map(item => `
    <tr>
      <td style="padding: 10px 0; border-bottom: 1px solid #eee;">
        <strong>${item.name}</strong> x ${item.quantity}
      </td>
      <td style="padding: 10px 0; border-bottom: 1px solid #eee; text-align: right;">
        $${(item.price * item.quantity).toFixed(1)}
      </td>
    </tr>
  `).join('');

  const body = `
    <div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px; border: 1px solid #f0f0f0; border-radius: 20px;">
      <div style="text-align: center; margin-bottom: 30px;">
        <h1 style="color: #2563eb; margin-bottom: 5px;">${lang === 'zh' ? '市集管家' : 'StallMaster'}</h1>
        <p style="color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: 2px;">
          ${lang === 'zh' ? '智能零售收據' : 'Smart Retail Receipt'}
        </p>
      </div>
      
      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr style="color: #94a3b8; font-size: 10px; text-transform: uppercase;">
            <th style="text-align: left; padding-bottom: 10px;">Item</th>
            <th style="text-align: right; padding-bottom: 10px;">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>
      
      <div style="margin-top: 20px; text-align: right;">
        <p style="margin: 0; color: #64748b; font-size: 12px;">TOTAL</p>
        <h2 style="margin: 0; color: #2563eb; font-size: 28px;">$${transaction.total.toFixed(1)}</h2>
      </div>

      <div style="margin-top: 40px; text-align: center; font-size: 10px; color: #cbd5e1;">
        <p>Transaction ID: ${transaction.id}</p>
        <p>${new Date(transaction.timestamp).toLocaleString()}</p>
        <p>Thank you for your purchase!</p>
      </div>
    </div>
  `;

  try {
    const raw = createMimeMessage(to, title, body);
    const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ raw })
    });

    if (response.ok) {
      console.log("Email sent successfully!");
      return true;
    } else {
      const error = await response.json();
      console.error("Gmail API Error:", error);
      return false;
    }
  } catch (err) {
    console.error("Network error sending email:", err);
    return false;
  }
};
