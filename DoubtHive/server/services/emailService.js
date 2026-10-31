const nodemailer = require('nodemailer');

// In-memory log of sent emails (useful for integration testing and development diagnostics)
const sentEmailsLog = [];

/**
 * Escapes user-supplied content to prevent HTML/XSS injection in emails
 */
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Validates email address format
 */
function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  return /^[\w.+-]+@[\w-]+\.[a-zA-Z]{2,}$/.test(email.trim());
}

/**
 * Creates and caches the Nodemailer transporter.
 * Supports configurable SMTP (Gmail, SendGrid, Mailgun, Amazon SES, or custom SMTP).
 * Falls back to an in-memory/stream dev transport with terminal logging if SMTP is not configured.
 */
let cachedTransporter = null;

function getTransporter() {
  if (cachedTransporter) return cachedTransporter;

  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const port = parseInt(process.env.SMTP_PORT, 10) || 587;
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;

  if (host && user && pass) {
    // Real SMTP configuration
    cachedTransporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
      tls: {
        rejectUnauthorized: process.env.NODE_ENV === 'production',
      },
    });
  } else {
    // Development / Test transporter: safely records and logs emails without crashing
    cachedTransporter = nodemailer.createTransport({
      jsonTransport: true,
    });
  }

  return cachedTransporter;
}

/**
 * Generates branded HTML emails using DoubtHive's signature Honeycomb/Gold & Slate theme.
 */
function buildHtmlTemplate({ title, preheader = '', contentHtml, ctaText = '', ctaUrl = '' }) {
  const safePreheader = escapeHtml(preheader);
  const clientUrl = (process.env.CLIENT_URL || 'http://localhost:5173').replace(/\/+$/, '');
  const homeUrl = clientUrl;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #0B0F19;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #E2E8F0;
      -webkit-font-smoothing: antialiased;
    }
    .wrapper {
      width: 100%;
      background-color: #0B0F19;
      padding: 30px 10px;
      box-sizing: border-box;
    }
    .container {
      max-width: 580px;
      margin: 0 auto;
      background-color: #131B2E;
      border: 1px solid #1E293B;
      border-radius: 14px;
      overflow: hidden;
      box-shadow: 0 10px 25px rgba(0, 0, 0, 0.4);
    }
    .header {
      background: linear-gradient(135deg, #1E293B 0%, #0F172A 100%);
      padding: 24px 28px;
      border-bottom: 2px solid #F59E0B;
      text-align: left;
    }
    .brand {
      display: inline-flex;
      align-items: center;
      text-decoration: none;
      color: #FFFFFF;
      font-size: 20px;
      font-weight: 700;
      letter-spacing: 0.5px;
    }
    .brand-icon {
      font-size: 24px;
      margin-right: 8px;
    }
    .brand-highlight {
      color: #F59E0B;
    }
    .content {
      padding: 28px;
      line-height: 1.6;
      font-size: 15px;
      color: #CBD5E1;
    }
    .title {
      font-size: 20px;
      font-weight: 700;
      color: #FFFFFF;
      margin: 0 0 16px 0;
    }
    .badge-pill {
      display: inline-block;
      padding: 4px 10px;
      font-size: 12px;
      font-weight: 600;
      border-radius: 20px;
      background: rgba(245, 158, 11, 0.15);
      color: #FBBF24;
      border: 1px solid rgba(245, 158, 11, 0.3);
      margin-bottom: 14px;
    }
    .card {
      background-color: #0F172A;
      border: 1px solid #1E293B;
      border-left: 3px solid #F59E0B;
      border-radius: 8px;
      padding: 16px 18px;
      margin: 18px 0;
      color: #E2E8F0;
    }
    .cta-container {
      text-align: center;
      margin: 28px 0 10px 0;
    }
    .btn {
      display: inline-block;
      padding: 12px 26px;
      background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%);
      color: #0B0F19 !important;
      text-decoration: none;
      font-weight: 700;
      font-size: 14px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(245, 158, 11, 0.25);
    }
    .btn:hover {
      background: #F59E0B;
    }
    .footer {
      padding: 20px 28px;
      background-color: #0C1220;
      border-top: 1px solid #1E293B;
      text-align: center;
      font-size: 12px;
      color: #64748B;
      line-height: 1.5;
    }
    .footer a {
      color: #94A3B8;
      text-decoration: underline;
    }
    .preheader {
      display: none !important;
      visibility: hidden;
      mso-hide: all;
      font-size: 1px;
      line-height: 1px;
      max-height: 0;
      max-width: 0;
      opacity: 0;
      overflow: hidden;
    }
  </style>
</head>
<body>
  <span class="preheader">${safePreheader}</span>
  <div class="wrapper">
    <div class="container">
      <div class="header">
        <a href="${homeUrl}" class="brand">
          <span class="brand-icon">🐝</span> Doubt<span class="brand-highlight">Hive</span>
        </a>
      </div>
      <div class="content">
        <h1 class="title">${escapeHtml(title)}</h1>
        ${contentHtml}
        ${
          ctaText && ctaUrl
            ? `<div class="cta-container">
                 <a href="${escapeHtml(ctaUrl)}" class="btn" target="_blank">${escapeHtml(ctaText)}</a>
               </div>`
            : ''
        }
      </div>
      <div class="footer">
        <p>This is an automated notification from DoubtHive — A Gamified Doubt Resolution Platform.</p>
        <p><a href="${homeUrl}">Visit DoubtHive</a> · Ask · Answer · Learn · Earn</p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Sends an email safely.
 * Never throws an unhandled error to prevent disrupting primary API requests.
 */
async function sendMail({ to, subject, html, text }) {
  try {
    if (!isValidEmail(to)) {
      console.warn(`[EMAIL] Skipped sending: invalid recipient email address "${to}"`);
      return { success: false, reason: 'Invalid recipient email' };
    }

    const transporter = getTransporter();
    const fromAddress = process.env.EMAIL_FROM || '"DoubtHive" <no-reply@doubthive.com>';

    const mailOptions = {
      from: fromAddress,
      to: to.trim().toLowerCase(),
      subject: String(subject || 'DoubtHive Notification').trim(),
      html,
      text: text || subject,
    };

    const info = await transporter.sendMail(mailOptions);

    // Save to test/dev log
    const logEntry = {
      to: mailOptions.to,
      subject: mailOptions.subject,
      timestamp: new Date().toISOString(),
      messageId: info.messageId,
      preview: text ? text.slice(0, 100) : '',
    };
    sentEmailsLog.push(logEntry);

    // Development diagnostic: if running without real SMTP, log clean summary
    if (!process.env.SMTP_HOST) {
      console.log(`[EMAIL:DEV] ✉ Sent to: ${mailOptions.to} | Subject: "${mailOptions.subject}"`);
    } else {
      console.log(`[EMAIL] ✉ Delivered to ${mailOptions.to} (ID: ${info.messageId})`);
    }

    return { success: true, messageId: info.messageId };
  } catch (err) {
    // Log failure safely without exposing SMTP credentials
    console.error(`[EMAIL ERROR] Failed to send email to "${to}":`, err.message);
    return { success: false, error: err.message };
  }
}

function getSentEmailsLog() {
  return [...sentEmailsLog];
}

function clearSentEmailsLog() {
  sentEmailsLog.length = 0;
}

module.exports = {
  escapeHtml,
  isValidEmail,
  buildHtmlTemplate,
  sendMail,
  getTransporter,
  getSentEmailsLog,
  clearSentEmailsLog,
};
