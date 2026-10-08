require('dotenv').config();
const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');

const COMPANY_LOGO_URL = 'https://res.cloudinary.com/ddgjubbbx/image/upload/v1791460679/natural-milk-dairy/branding/logo.jpg';
const localLogoPath = path.resolve(__dirname, '../../client/public/logo.png');
const hasLocalLogo = fs.existsSync(localLogoPath);

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

/**
 * Send welcome email with login credentials to new Customer
 * @param {object} customer - Customer object
 * @param {string} password - Login password
 */
const sendCustomerCredentialsEmail = async (customer, password) => {
  const transporter = createTransporter();
  if (!transporter) return { success: false, message: 'SMTP not configured' };
  if (!customer.email) return { success: false, message: 'No customer email provided' };

  const fromEmail = process.env.EMAIL_FROM || process.env.SMTP_USER;
  const loginUrl = process.env.CLIENT_URL || 'http://localhost:3000';
  const customerPortalLoginUrl = `${loginUrl}/?portal=customer&tab=login`;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Natural Milk Dairy - Customer Credentials</title>
    </head>
    <body style="font-family: Arial, Helvetica, sans-serif; background-color: #f4f7f4; margin: 0; padding: 24px; color: #1e293b;">
      <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 14px; overflow: hidden; border: 1px solid #dcf0e2; box-shadow: 0 4px 12px rgba(0,0,0,0.06);">
        <!-- Header with Official Company Logo -->
        <tr>
          <td align="center" style="background: linear-gradient(135deg, #0d5c3a 0%, #064e3b 100%); background-color: #0d5c3a; padding: 26px 20px; text-align: center;">
            <table border="0" cellpadding="0" cellspacing="0" align="center" style="margin: 0 auto 12px auto;">
              <tr>
                <td align="center" style="width: 80px; height: 80px; border-radius: 50%; background-color: #ffffff; padding: 4px; box-shadow: 0 4px 12px rgba(0,0,0,0.25);">
                  <img
                    src="${COMPANY_LOGO_URL}"
                    alt="Natural Milk Dairy Logo"
                    width="72"
                    height="72"
                    style="width: 72px; height: 72px; border-radius: 50%; display: block; object-fit: contain; margin: 0 auto;"
                  />
                </td>
              </tr>
            </table>
            <h1 style="color: #ffffff; font-size: 22px; font-weight: 900; margin: 0; letter-spacing: 0.5px; font-family: Arial, Helvetica, sans-serif;">NATURAL MILK DAIRY</h1>
            <p style="color: #bbf7d0; font-size: 12px; text-transform: uppercase; margin: 5px 0 0 0; letter-spacing: 1.5px; font-weight: 700; font-family: Arial, Helvetica, sans-serif;">
              Pure • Farm-Fresh • Home Delivery
            </p>
          </td>
        </tr>

        <!-- Content -->
        <tr>
          <td style="padding: 28px 24px;">
            <h2 style="color: #0f172a; font-size: 19px; font-weight: 800; margin: 0 0 12px 0;">
              Welcome, ${customer.name}! 👋
            </h2>
            <p style="font-size: 14px; color: #475569; line-height: 1.6; margin: 0 0 20px 0;">
              Your daily natural milk subscription has been created by the dairy administrator. Here are the exact login credentials to access your customer dashboard, view daily drop records, and manage your monthly ledger:
            </p>

            <!-- Table-based credentials card (bulletproof in Gmail) -->
            <table width="100%" cellpadding="10" cellspacing="0" style="background-color: #f0fdf4; border: 1.5px solid #86efac; border-radius: 10px; border-collapse: collapse; margin-bottom: 22px;">
              <tr style="border-bottom: 1px solid #bbf7d0;">
                <td width="38%" style="padding: 10px 14px; font-size: 13px; font-weight: bold; color: #065f46;">Customer Name:</td>
                <td width="62%" style="padding: 10px 14px; font-size: 14px; font-weight: 800; color: #0f172a;">${customer.name}</td>
              </tr>
              <tr style="border-bottom: 1px solid #bbf7d0;">
                <td style="padding: 10px 14px; font-size: 13px; font-weight: bold; color: #065f46;">Customer ID:</td>
                <td style="padding: 10px 14px; font-size: 14px; font-weight: 800; color: #0f172a;">${customer.customerId || 'CUST-ID'}</td>
              </tr>
              <tr style="border-bottom: 1px solid #bbf7d0;">
                <td style="padding: 10px 14px; font-size: 13px; font-weight: bold; color: #065f46;">Login Email:</td>
                <td style="padding: 10px 14px; font-size: 14px; font-weight: 800; color: #0f172a;">${customer.email}</td>
              </tr>
              <tr style="border-bottom: 1px solid #bbf7d0;">
                <td style="padding: 10px 14px; font-size: 13px; font-weight: bold; color: #065f46;">Mobile Number:</td>
                <td style="padding: 10px 14px; font-size: 14px; font-weight: 800; color: #0f172a;">${customer.mobile}</td>
              </tr>
              <tr style="border-bottom: 1px solid #bbf7d0;">
                <td style="padding: 10px 14px; font-size: 13px; font-weight: bold; color: #065f46;">Portal Password:</td>
                <td style="padding: 10px 14px; font-size: 16px; font-weight: 800; color: #059669; font-family: 'Courier New', Courier, monospace; letter-spacing: 1px;">${password}</td>
              </tr>
              <tr>
                <td style="padding: 10px 14px; font-size: 13px; font-weight: bold; color: #065f46;">Portal Role:</td>
                <td style="padding: 10px 14px; font-size: 13px; font-weight: 700; color: #0d5c3a;">Customer Account</td>
              </tr>
            </table>

            <!-- Subscription plan summary -->
            <table width="100%" cellpadding="12" cellspacing="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 22px;">
              <tr>
                <td>
                  <strong style="color: #0f172a; font-size: 13px; display: block; margin-bottom: 6px;">🥛 Your Active Subscription Plan:</strong>
                  <div style="font-size: 13px; color: #334155; line-height: 1.5;">
                    • <strong>Milk:</strong> ${customer.deliveryPlan?.milkQty || 1} ${customer.deliveryPlan?.milkUnit || 'L'} (${customer.deliveryPlan?.frequency || 'Daily'})<br>
                    ${customer.deliveryPlan?.curdQty > 0 ? `• <strong>Farm Curd:</strong> ${customer.deliveryPlan.curdQty} ${customer.deliveryPlan.curdUnit || 'g'}<br>` : ''}
                    • <strong>Delivery Address:</strong> ${customer.address} (${customer.area || ''})
                  </div>
                </td>
              </tr>
            </table>

            <!-- Action Button -->
            <table align="center" border="0" cellpadding="0" cellspacing="0">
              <tr>
                <td align="center" style="background-color: #0d5c3a; border-radius: 8px; padding: 13px 30px;">
                  <a href="${customerPortalLoginUrl}" target="_blank" style="color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 800; display: inline-block;">
                    Log In to Customer Portal &rarr;
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td align="center" style="background-color: #f8faf8; padding: 18px 24px; border-top: 1px solid #e2ece3; font-size: 12px; color: #64748b;">
            &copy; 2026 Natural Milk Dairy. All rights reserved.<br>
            Please keep your account credentials confidential.
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  const plainText = `NATURAL MILK DAIRY - CUSTOMER LOGIN CREDENTIALS
==================================================
Welcome, ${customer.name}!

Your daily milk subscription has been registered with Natural Milk Dairy.
Here are your portal login credentials:

- Login Email: ${customer.email}
- Mobile Number: ${customer.mobile}
- Customer ID: ${customer.customerId || 'CUST-ID'}
- Password: ${password}
- Portal URL: ${customerPortalLoginUrl}

Milk Plan: ${customer.deliveryPlan?.milkQty || 1} ${customer.deliveryPlan?.milkUnit || 'L'} (${customer.deliveryPlan?.frequency || 'Daily'})
Address: ${customer.address || ''} (${customer.area || ''})

Please keep your login credentials secure.
Natural Milk Dairy Team`;

  try {
    const info = await transporter.sendMail({
      from: `"Natural Milk Dairy" <${fromEmail}>`,
      replyTo: fromEmail,
      to: customer.email,
      subject: `Natural Milk Dairy — Your Customer Login Credentials (${customer.name})`,
      text: plainText,
      html: htmlContent,
      attachments: hasLocalLogo
        ? [
            {
              filename: 'logo.png',
              path: localLogoPath,
              cid: 'company-logo@naturalmilkdairy',
            },
          ]
        : [],
      headers: {
        'X-Priority': '1',
        Importance: 'high',
      },
    });
    console.log(`✅ Welcome credentials email sent to customer: ${customer.email} [ID: ${info.messageId}]`);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error(`❌ Failed to send credentials email to ${customer.email}:`, err.message);
    return { success: false, error: err.message };
  }
};

/**
 * Send welcome email with login credentials to new Delivery Partner
 * @param {object} partner - Delivery Boy / Partner object
 * @param {string} password - Login password
 */
const sendPartnerCredentialsEmail = async (partner, password) => {
  const transporter = createTransporter();
  if (!transporter) return { success: false, message: 'SMTP not configured' };
  if (!partner.email) return { success: false, message: 'No partner email provided' };

  const fromEmail = process.env.EMAIL_FROM || process.env.SMTP_USER;
  const loginUrl = process.env.CLIENT_URL || 'http://localhost:3000';
  const driverPortalLoginUrl = `${loginUrl}/?portal=delivery&tab=login`;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Natural Milk Dairy - Delivery Partner Credentials</title>
    </head>
    <body style="font-family: Arial, Helvetica, sans-serif; background-color: #f4f7f4; margin: 0; padding: 24px; color: #1e293b;">
      <table align="center" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 14px; overflow: hidden; border: 1px solid #dbeafe; box-shadow: 0 4px 12px rgba(0,0,0,0.06);">
        <!-- Header with Official Company Logo -->
        <tr>
          <td align="center" style="background: linear-gradient(135deg, #1e3a8a 0%, #0f172a 100%); background-color: #1e3a8a; padding: 26px 20px; text-align: center;">
            <table border="0" cellpadding="0" cellspacing="0" align="center" style="margin: 0 auto 12px auto;">
              <tr>
                <td align="center" style="width: 80px; height: 80px; border-radius: 50%; background-color: #ffffff; padding: 4px; box-shadow: 0 4px 12px rgba(0,0,0,0.25);">
                  <img
                    src="${COMPANY_LOGO_URL}"
                    alt="Natural Milk Dairy Logo"
                    width="72"
                    height="72"
                    style="width: 72px; height: 72px; border-radius: 50%; display: block; object-fit: contain; margin: 0 auto;"
                  />
                </td>
              </tr>
            </table>
            <h1 style="color: #ffffff; font-size: 22px; font-weight: 900; margin: 0; letter-spacing: 0.5px; font-family: Arial, Helvetica, sans-serif;">NATURAL MILK DAIRY</h1>
            <p style="color: #93c5fd; font-size: 12px; text-transform: uppercase; margin: 5px 0 0 0; letter-spacing: 1.5px; font-weight: 700; font-family: Arial, Helvetica, sans-serif;">
              Delivery Partner Fleet Onboarding
            </p>
          </td>
        </tr>

        <!-- Content -->
        <tr>
          <td style="padding: 28px 24px;">
            <h2 style="color: #0f172a; font-size: 19px; font-weight: 800; margin: 0 0 12px 0;">
              Welcome to the Delivery Fleet, ${partner.name}! 🚚
            </h2>
            <p style="font-size: 14px; color: #475569; line-height: 1.6; margin: 0 0 20px 0;">
              You have been registered as an official Delivery Partner by the dairy administrator. Here are your exact login credentials to access your morning route drop list, customer address cards, and cash collection app:
            </p>

            <!-- Table-based credentials card (bulletproof in Gmail) -->
            <table width="100%" cellpadding="10" cellspacing="0" style="background-color: #eff6ff; border: 1.5px solid #93c5fd; border-radius: 10px; border-collapse: collapse; margin-bottom: 22px;">
              <tr style="border-bottom: 1px solid #bfdbfe;">
                <td width="38%" style="padding: 10px 14px; font-size: 13px; font-weight: bold; color: #1e40af;">Partner Full Name:</td>
                <td width="62%" style="padding: 10px 14px; font-size: 15px; font-weight: 800; color: #0f172a;">${partner.name}</td>
              </tr>
              <tr style="border-bottom: 1px solid #bfdbfe;">
                <td style="padding: 10px 14px; font-size: 13px; font-weight: bold; color: #1e40af;">Login Email:</td>
                <td style="padding: 10px 14px; font-size: 14px; font-weight: 800; color: #0f172a;">${partner.email}</td>
              </tr>
              <tr style="border-bottom: 1px solid #bfdbfe;">
                <td style="padding: 10px 14px; font-size: 13px; font-weight: bold; color: #1e40af;">Mobile Number (Login ID):</td>
                <td style="padding: 10px 14px; font-size: 15px; font-weight: 800; color: #0f172a;">${partner.mobile}</td>
              </tr>
              <tr style="border-bottom: 1px solid #bfdbfe;">
                <td style="padding: 10px 14px; font-size: 13px; font-weight: bold; color: #1e40af;">Portal Password:</td>
                <td style="padding: 10px 14px; font-size: 16px; font-weight: 800; color: #2563eb; font-family: 'Courier New', Courier, monospace; letter-spacing: 1px;">${password}</td>
              </tr>
              <tr style="border-bottom: 1px solid #bfdbfe;">
                <td style="padding: 10px 14px; font-size: 13px; font-weight: bold; color: #1e40af;">Assigned Route Area:</td>
                <td style="padding: 10px 14px; font-size: 14px; font-weight: 800; color: #0f172a;">${partner.assignedArea || 'Assigned Area'}</td>
              </tr>
              ${partner.vehicleNumber ? `
              <tr>
                <td style="padding: 10px 14px; font-size: 13px; font-weight: bold; color: #1e40af;">Vehicle Number:</td>
                <td style="padding: 10px 14px; font-size: 14px; font-weight: 800; color: #0f172a;">${partner.vehicleNumber}</td>
              </tr>` : ''}
            </table>

            <!-- Guidelines -->
            <table width="100%" cellpadding="12" cellspacing="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 22px;">
              <tr>
                <td>
                  <strong style="color: #0f172a; font-size: 13px; display: block; margin-bottom: 6px;">📋 Morning Route Guidelines:</strong>
                  <div style="font-size: 13px; color: #334155; line-height: 1.5;">
                    • Log in to the driver portal before 5:30 AM every morning.<br>
                    • Mark deliveries as Delivered as soon as the milk bottle is placed.<br>
                    • Collect cash or verify UPI payments for non-prepaid orders.<br>
                    • Deposit all collected cash with the dairy administrator at the end of the shift.
                  </div>
                </td>
              </tr>
            </table>

            <!-- Action Button - Redirects directly to Driver Portal Login -->
            <table align="center" border="0" cellpadding="0" cellspacing="0">
              <tr>
                <td align="center" style="background-color: #1e3a8a; border-radius: 8px; padding: 13px 30px;">
                  <a href="${driverPortalLoginUrl}" target="_blank" style="color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 800; display: inline-block;">
                    Open Delivery Partner Portal &rarr;
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td align="center" style="background-color: #f8faf8; padding: 18px 24px; border-top: 1px solid #e2ece3; font-size: 12px; color: #64748b;">
            &copy; 2026 Natural Milk Dairy Fleet Operations.<br>
            Please keep your account credentials confidential.
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  const plainText = `NATURAL MILK DAIRY - DELIVERY PARTNER ONBOARDING
==================================================
Welcome to the Delivery Fleet, ${partner.name}!

You have been registered as an official Delivery Partner by the dairy administrator.
Here are your driver portal login credentials:

- Partner Name: ${partner.name}
- Login Email: ${partner.email}
- Mobile Number: ${partner.mobile}
- Portal Password: ${password}
- Assigned Route Area: ${partner.assignedArea || 'Assigned Route'}
${partner.vehicleNumber ? `- Vehicle Number: ${partner.vehicleNumber}\n` : ''}- Portal URL: ${driverPortalLoginUrl}

Morning Guidelines:
- Log in before 5:30 AM every morning.
- Mark deliveries as Delivered as you place the milk bottles.
- Collect cash or verify UPI payments for non-prepaid orders.
- Deposit collected cash with the dairy administrator at the end of the shift.

Please keep your login credentials secure.
Natural Milk Dairy Fleet Operations`;

  try {
    const info = await transporter.sendMail({
      from: `"Natural Milk Dairy" <${fromEmail}>`,
      replyTo: fromEmail,
      to: partner.email,
      subject: `Natural Milk Dairy — Your Delivery Partner Credentials (${partner.name} - ${partner.assignedArea})`,
      text: plainText,
      html: htmlContent,
      attachments: hasLocalLogo
        ? [
            {
              filename: 'logo.png',
              path: localLogoPath,
              cid: 'company-logo@naturalmilkdairy',
            },
          ]
        : [],
      headers: {
        'X-Priority': '1',
        Importance: 'high',
      },
    });
    console.log(`✅ Credentials email sent to delivery partner: ${partner.email} [ID: ${info.messageId}]`);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error(`❌ Failed to send credentials email to ${partner.email}:`, err.message);
    return { success: false, error: err.message };
  }
};

module.exports = {
  createTransporter,
  verifyEmailConnection,
  sendCustomerCredentialsEmail,
  sendPartnerCredentialsEmail,
};
