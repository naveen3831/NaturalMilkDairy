require('dotenv').config();
const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');

const COMPANY_LOGO_URL = 'https://res.cloudinary.com/ddgjubbbx/image/upload/v1791460679/natural-milk-dairy/branding/logo.jpg';
const localLogoPath = path.resolve(__dirname, '../../client/public/logo.png');
const hasLocalLogo = fs.existsSync(localLogoPath);
const LOGO_CID = 'company-logo@naturalmilkdairy';

/**
 * Configure Nodemailer transporter using environment variables only
 */
const createTransporter = () => {
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS ? process.env.SMTP_PASS.replace(/\s+/g, '') : '';
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = Number(process.env.SMTP_PORT) || 465;

  if (!user || !pass) {
    console.warn('⚠️ SMTP_USER or SMTP_PASS not set in .env. Emails will not be sent.');
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass,
    },
  });
};

/**
 * Verify transporter connectivity
 */
const verifyEmailConnection = async () => {
  const transporter = createTransporter();
  if (!transporter) return false;
  try {
    await transporter.verify();
    console.log('📧 SMTP Email Service Connected Successfully:', process.env.SMTP_USER);
    return true;
  } catch (err) {
    console.error('❌ SMTP Connection Error:', err.message);
    return false;
  }
};

const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

/**
 * Build a clean, light, simple & professional credentials email with inline company logo.
 */
const buildCredentialsEmailHtml = ({
  pageTitle,
  subtitle,
  greetingName,
  introText,
  credentialRows,
  detailsTitle,
  detailsLines,
  ctaLabel,
  ctaUrl,
  accentColor = '#0d5c3a',
}) => {
  const logoSrc = hasLocalLogo ? `cid:${LOGO_CID}` : COMPANY_LOGO_URL;

  const rowsHtml = credentialRows
    .map(
      ({ label, value, isCode }, idx) => `
      <tr${idx < credentialRows.length - 1 ? ' style="border-bottom: 1px solid #e2ece5;"' : ''}>
        <td width="38%" style="padding: 10px 14px; font-size: 13px; font-weight: 700; color: #475569;">${escapeHtml(label)}</td>
        <td width="62%" style="padding: 10px 14px; font-size: ${isCode ? '15px' : '14px'}; font-weight: 800; color: ${isCode ? accentColor : '#0f172a'}; ${isCode ? "font-family: 'Courier New', Courier, monospace; letter-spacing: 0.6px;" : ''}">${escapeHtml(value)}</td>
      </tr>`
    )
    .join('');

  const detailsBlockHtml =
    Array.isArray(detailsLines) && detailsLines.length > 0
      ? `
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; margin-bottom: 22px;">
          <tr>
            <td style="padding: 14px 16px;">
              <div style="color: #0f172a; font-size: 13px; font-weight: 800; margin-bottom: 6px;">${escapeHtml(detailsTitle)}</div>
              <div style="font-size: 13px; color: #475569; line-height: 1.6;">
                ${detailsLines.map((line) => `&bull; ${escapeHtml(line)}`).join('<br>')}
              </div>
            </td>
          </tr>
        </table>`
      : '';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${escapeHtml(pageTitle)}</title>
    </head>
    <body style="font-family: Arial, Helvetica, sans-serif; background-color: #f4f7f5; margin: 0; padding: 24px; color: #1e293b;">
      <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 560px; background-color: #ffffff; border-radius: 14px; overflow: hidden; border: 1px solid #dcebe2; box-shadow: 0 4px 14px rgba(13, 92, 58, 0.06);">
        <!-- Simple Light Header with Company Logo -->
        <tr>
          <td align="center" style="background-color: #f0fdf4; border-bottom: 1px solid #d1fae5; padding: 24px 20px 20px; text-align: center;">
            <table border="0" cellpadding="0" cellspacing="0" align="center" style="margin: 0 auto 10px auto;">
              <tr>
                <td align="center" style="width: 68px; height: 68px; border-radius: 50%; background-color: #ffffff; border: 1px solid #bbf7d0; padding: 5px;">
                  <img
                    src="${logoSrc}"
                    alt="Natural Milk Dairy"
                    width="58"
                    height="58"
                    style="width: 58px; height: 58px; border-radius: 50%; display: block; object-fit: contain; margin: 0 auto;"
                  />
                </td>
              </tr>
            </table>
            <h1 style="color: #064e3b; font-size: 19px; font-weight: 900; margin: 0; letter-spacing: 0.4px; font-family: Arial, Helvetica, sans-serif;">NATURAL MILK DAIRY</h1>
            <p style="color: #059669; font-size: 11px; text-transform: uppercase; margin: 4px 0 0 0; letter-spacing: 1.4px; font-weight: 700; font-family: Arial, Helvetica, sans-serif;">
              ${escapeHtml(subtitle)}
            </p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding: 26px 24px;">
            <h2 style="color: #0f172a; font-size: 18px; font-weight: 800; margin: 0 0 8px 0;">
              Welcome, ${escapeHtml(greetingName)}
            </h2>
            <p style="font-size: 14px; color: #475569; line-height: 1.55; margin: 0 0 20px 0;">
              ${escapeHtml(introText)}
            </p>

            <!-- Credentials Card -->
            <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f8fcfa; border: 1px solid #cbe7d5; border-radius: 10px; border-collapse: collapse; margin-bottom: 20px;">
              ${rowsHtml}
            </table>

            ${detailsBlockHtml}

            <!-- CTA Button -->
            <table align="center" border="0" cellpadding="0" cellspacing="0" style="margin: 4px auto 0 auto;">
              <tr>
                <td align="center" style="background-color: ${accentColor}; border-radius: 8px; padding: 12px 28px;">
                  <a href="${escapeHtml(ctaUrl)}" target="_blank" style="color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 800; display: inline-block;">
                    ${escapeHtml(ctaLabel)} &rarr;
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td align="center" style="background-color: #f8faf9; padding: 16px 20px; border-top: 1px solid #e2ece5; font-size: 12px; color: #64748b; line-height: 1.5;">
            &copy; ${new Date().getFullYear()} Natural Milk Dairy. All rights reserved.<br>
            Please keep your login credentials confidential.
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
};

const sendCredentialsMail = async ({ to, subject, text, html }) => {
  const transporter = createTransporter();
  if (!transporter) return { success: false, message: 'SMTP not configured' };
  if (!to) return { success: false, message: 'No recipient email provided' };

  const fromEmail = process.env.EMAIL_FROM || process.env.SMTP_USER;
  try {
    const info = await transporter.sendMail({
      from: `"Natural Milk Dairy" <${fromEmail}>`,
      replyTo: fromEmail,
      to,
      subject,
      text,
      html,
      attachments: hasLocalLogo
        ? [
            {
              filename: 'logo.png',
              path: localLogoPath,
              cid: LOGO_CID,
              contentDisposition: 'inline',
            },
          ]
        : [],
      headers: {
        'X-Priority': '1',
        Importance: 'high',
      },
    });
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error(`❌ Failed to send credentials email to ${to}:`, err.message);
    return { success: false, error: err.message };
  }
};

/**
 * Send welcome email with login credentials to new Customer
 * @param {object} customer - Customer object
 * @param {string} password - Login password
 * @param {object} [options] - { createdByRole, createdByName }
 */
const sendCustomerCredentialsEmail = async (customer, password, options = {}) => {
  if (!customer?.email) return { success: false, message: 'No customer email provided' };

  const loginUrl = process.env.CLIENT_URL || 'http://localhost:3000';
  const customerPortalLoginUrl = `${loginUrl}/?portal=customer&tab=login`;
  const createdByRole = options?.createdByRole || 'admin';
  const createdByName = options?.createdByName ? ` (${options.createdByName})` : '';

  let introText =
    'Your customer account has been registered by the Natural Milk Dairy administrator. Here are your portal login credentials:';
  if (createdByRole === 'self') {
    introText =
      'Thank you for registering with Natural Milk Dairy. Your customer account is ready—here are your login credentials:';
  } else if (createdByRole === 'delivery_boy') {
    introText = `Your customer account has been registered by your delivery partner${createdByName}. Here are your portal login credentials:`;
  }

  const credentialRows = [
    { label: 'Full Name', value: customer.name },
    { label: 'Customer ID', value: customer.customerId || 'CUST-ID' },
    { label: 'Login Email', value: customer.email },
    { label: 'Mobile Number', value: customer.mobile },
    { label: 'Password', value: password, isCode: true },
    { label: 'Account Role', value: 'Customer Account' },
  ];

  const milkQty = Number(customer.deliveryPlan?.milkQty || 0);
  const curdQty = Number(customer.deliveryPlan?.curdQty || 0);
  const detailsLines = [];
  if (milkQty > 0) {
    detailsLines.push(
      `Milk Plan: ${milkQty} ${customer.deliveryPlan?.milkUnit || 'L'} (${customer.deliveryPlan?.frequency || 'Daily'})`
    );
  }
  if (curdQty > 0) {
    detailsLines.push(`Farm Curd: ${curdQty} ${customer.deliveryPlan?.curdUnit || 'g'}`);
  }
  if (customer.address) {
    detailsLines.push(`Delivery Address: ${customer.address}${customer.area ? ` (${customer.area})` : ''}`);
  }

  const htmlContent = buildCredentialsEmailHtml({
    pageTitle: 'Natural Milk Dairy - Account Credentials',
    subtitle: 'Pure • Fresh • Doorstep Delivery',
    greetingName: customer.name,
    introText,
    credentialRows,
    detailsTitle: milkQty > 0 ? 'Subscription & Delivery Details' : 'Delivery Address',
    detailsLines,
    ctaLabel: 'Sign In to Customer Portal',
    ctaUrl: customerPortalLoginUrl,
    accentColor: '#0d5c3a',
  });

  const plainText = [
    'NATURAL MILK DAIRY - ACCOUNT CREDENTIALS',
    '========================================',
    `Welcome, ${customer.name}!`,
    '',
    introText,
    '',
    `- Name: ${customer.name}`,
    `- Customer ID: ${customer.customerId || 'CUST-ID'}`,
    `- Login Email: ${customer.email}`,
    `- Mobile Number: ${customer.mobile}`,
    `- Password: ${password}`,
    `- Portal URL: ${customerPortalLoginUrl}`,
    ...(detailsLines.length ? ['', ...detailsLines] : []),
    '',
    'Please keep your login credentials confidential.',
    'Natural Milk Dairy Team',
  ].join('\n');

  const res = await sendCredentialsMail({
    to: customer.email,
    subject: `Natural Milk Dairy — Your Login Credentials (${customer.name})`,
    text: plainText,
    html: htmlContent,
  });
  if (res.success) {
    console.log(`✅ Welcome credentials email sent to customer: ${customer.email} [ID: ${res.messageId}]`);
  }
  return res;
};

/**
 * Send welcome email with login credentials to new Delivery Partner
 * @param {object} partner - Delivery Boy / Partner object
 * @param {string} password - Login password
 */
const sendPartnerCredentialsEmail = async (partner, password) => {
  if (!partner?.email) return { success: false, message: 'No partner email provided' };

  const loginUrl = process.env.CLIENT_URL || 'http://localhost:3000';
  const driverPortalLoginUrl = `${loginUrl}/?portal=delivery&tab=login`;

  const introText =
    'You have been registered as a Delivery Partner by the Natural Milk Dairy administrator. Use the credentials below to sign in to your delivery partner portal:';

  const credentialRows = [
    { label: 'Partner Name', value: partner.name },
    { label: 'Login Email', value: partner.email },
    { label: 'Mobile Number', value: partner.mobile },
    { label: 'Password', value: password, isCode: true },
    { label: 'Assigned Route', value: partner.assignedArea || 'Assigned Area' },
    ...(partner.vehicleNumber ? [{ label: 'Vehicle Number', value: partner.vehicleNumber }] : []),
  ];

  const detailsLines = [
    'Sign in to the Partner Portal before 5:30 AM for daily morning drops.',
    'Update delivery status and collect cash or UPI payments at the doorstep.',
  ];

  const htmlContent = buildCredentialsEmailHtml({
    pageTitle: 'Natural Milk Dairy - Delivery Partner Credentials',
    subtitle: 'Delivery Partner Fleet Portal',
    greetingName: partner.name,
    introText,
    credentialRows,
    detailsTitle: 'Route Guidelines',
    detailsLines,
    ctaLabel: 'Open Delivery Partner Portal',
    ctaUrl: driverPortalLoginUrl,
    accentColor: '#0d5c3a',
  });

  const plainText = [
    'NATURAL MILK DAIRY - DELIVERY PARTNER CREDENTIALS',
    '=================================================',
    `Welcome, ${partner.name}!`,
    '',
    introText,
    '',
    `- Partner Name: ${partner.name}`,
    `- Login Email: ${partner.email}`,
    `- Mobile Number: ${partner.mobile}`,
    `- Password: ${password}`,
    `- Assigned Route: ${partner.assignedArea || 'Assigned Route'}`,
    ...(partner.vehicleNumber ? [`- Vehicle Number: ${partner.vehicleNumber}`] : []),
    `- Portal URL: ${driverPortalLoginUrl}`,
    '',
    'Please keep your login credentials confidential.',
    'Natural Milk Dairy Fleet Operations',
  ].join('\n');

  const res = await sendCredentialsMail({
    to: partner.email,
    subject: `Natural Milk Dairy — Delivery Partner Credentials (${partner.name})`,
    text: plainText,
    html: htmlContent,
  });
  if (res.success) {
    console.log(`✅ Credentials email sent to delivery partner: ${partner.email} [ID: ${res.messageId}]`);
  }
  return res;
};

module.exports = {
  createTransporter,
  verifyEmailConnection,
  sendCustomerCredentialsEmail,
  sendPartnerCredentialsEmail,
};
