import nodemailer from "nodemailer";

// Configure Nodemailer Transporter
const createMailer = () => {
  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const port = Number(process.env.SMTP_PORT) || 587;
  const user = process.env.SMTP_USER || process.env.EMAIL_USER || "su92-bscsm-f23-275@superior.edu.pk";
  const pass = process.env.SMTP_PASS || process.env.EMAIL_PASS || "";

  if (user && pass) {
    return nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass },
      tls: { rejectUnauthorized: false },
    });
  }

  // Fallback / simulated transport for dev logging without crashing
  return {
    sendMail: async (mailOptions) => {
      console.log("\n==================================================================");
      console.log("📧 [NODEMAILER EMAIL DISPATCH]");
      console.log("FROM:", mailOptions.from);
      console.log("TO:", mailOptions.to);
      console.log("SUBJECT:", mailOptions.subject);
      console.log("ORDER PREVIEW:", mailOptions.text || "(HTML Email Body Sent)");
      console.log("==================================================================\n");
      return { messageId: `mail-${Date.now()}` };
    },
  };
};

const transporter = createMailer();
const SENDER_EMAIL = `"Clothing Den" <${process.env.EMAIL_FROM || "su92-bscsm-f23-275@superior.edu.pk"}>`;

/**
 * Send Luxury Order Confirmation Email
 */
export async function sendOrderConfirmationEmail({ order, user }) {
  try {
    const recipientEmail = user?.email || order?.contactInfo?.email;
    if (!recipientEmail) return;

    const customerName = user?.fullname || order?.contactInfo?.fullName || "Valued Customer";
    const itemsListHtml = (order.items || [])
      .map((item) => {
        const title = item.product?.title || "Luxury Garment";
        const price = item.priceAtPurchase || item.price || 0;
        const qty = item.quantity || 1;
        const size = item.size || "M";
        return `
          <tr style="border-bottom: 1px solid #e8e8e0;">
            <td style="padding: 12px 8px; font-size: 13px; color: #1a1a14; font-weight: 500;">
              ${title} <br/>
              <span style="font-size: 11px; color: #78786a; font-family: monospace;">Size: ${size} | Qty: ${qty}</span>
            </td>
            <td style="padding: 12px 8px; font-size: 13px; text-align: right; color: #1a1a14; font-weight: 600; font-family: monospace;">
              PKR ${(price * qty).toLocaleString()}
            </td>
          </tr>
        `;
      })
      .join("");

    const address = order.shippingAddress || {};
    const addressStr = `${address.street || ""}, ${address.city || ""}, ${address.province || ""}, Pakistan (${address.zip || ""})`;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Order Confirmation - Clothing Den</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #fafaf8; margin: 0; padding: 24px;">
        <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e8e8e0; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.04);">
          
          <!-- Header -->
          <div style="background: #141410; padding: 32px 24px; text-align: center;">
            <h1 style="color: #ffffff; font-family: Georgia, serif; font-size: 24px; letter-spacing: 0.2em; margin: 0; text-transform: uppercase;">
              Clothing Den
            </h1>
            <p style="color: #c8a24d; font-size: 11px; letter-spacing: 0.15em; margin: 6px 0 0; text-transform: uppercase;">
              Haute Couture & Eastern Luxury Pret
            </p>
          </div>

          <!-- Body -->
          <div style="padding: 32px 28px;">
            <h2 style="font-family: Georgia, serif; font-size: 20px; color: #141410; margin-top: 0;">
              Thank You for Your Order, ${customerName}!
            </h2>
            <p style="font-size: 13px; color: #55554e; line-height: 1.6;">
              We have received your order <strong>#${order._id}</strong>. Our master artisans and logistics team are carefully preparing your garments for dispatch.
            </p>

            <!-- Order Details Table -->
            <div style="margin: 24px 0; background: #fafaf8; border: 1px solid #e8e8e0; border-radius: 6px; padding: 16px;">
              <table style="width: 100%; border-collapse: collapse;">
                <thead>
                  <tr style="border-bottom: 2px solid #141410; text-align: left;">
                    <th style="padding: 8px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: #78786a;">Garment</th>
                    <th style="padding: 8px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: #78786a; text-align: right;">Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsListHtml}
                </tbody>
                <tfoot>
                  <tr>
                    <td style="padding: 14px 8px 4px; font-size: 14px; font-weight: bold; color: #141410;">Total Amount:</td>
                    <td style="padding: 14px 8px 4px; font-size: 16px; font-weight: bold; color: #141410; text-align: right; font-family: monospace;">PKR ${(order.totalAmount || 0).toLocaleString()}</td>
                  </tr>
                  <tr>
                    <td style="padding: 4px 8px; font-size: 12px; color: #78786a;">Payment Method:</td>
                    <td style="padding: 4px 8px; font-size: 12px; color: #141410; text-align: right; text-transform: uppercase; font-family: monospace;">${order.paymentMethod || "COD"}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <!-- Delivery Address -->
            <div style="margin: 20px 0; padding: 16px; border-left: 3px solid #c8a24d; background: #fafaf8;">
              <h4 style="margin: 0 0 6px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em; color: #141410;">
                Delivery Destination
              </h4>
              <p style="margin: 0; font-size: 13px; color: #55554e; line-height: 1.5;">
                ${addressStr}
              </p>
            </div>

            <!-- Reassurance Note -->
            <p style="font-size: 12px; color: #78786a; line-height: 1.6; margin-top: 24px;">
              You will receive another notification with your courier tracking link as soon as your parcel is dispatched from our fulfillment studio.
            </p>
          </div>

          <!-- Footer -->
          <div style="background: #fafaf8; border-top: 1px solid #e8e8e0; padding: 20px; text-align: center; font-size: 11px; color: #8e8e7e;">
            <p style="margin: 0 0 4px;">Clothing Den • Luxury Pret & Festive Lawn</p>
            <p style="margin: 0;">Support: su92-bscsm-f23-275@superior.edu.pk | Lahore, Pakistan</p>
          </div>

        </div>
      </body>
      </html>
    `;

    await transporter.sendMail({
      from: SENDER_EMAIL,
      to: recipientEmail,
      subject: `✨ Order Confirmed: #${order._id} - Clothing Den`,
      html: htmlContent,
    });
    console.log(`✅ Order confirmation email sent to ${recipientEmail}`);
  } catch (err) {
    console.error("Nodemailer confirmation error:", err.message);
  }
}

/**
 * Send Order Dispatched / Courier Tracking Email
 */
export async function sendOrderDispatchedEmail({ order, user, trackingNumber, courier, trackingUrl }) {
  try {
    const recipientEmail = user?.email || order?.contactInfo?.email;
    if (!recipientEmail) return;

    const customerName = user?.fullname || order?.contactInfo?.fullName || "Valued Customer";
    const courierName = courier || order.courier || "Express Courier";
    const trackNum = trackingNumber || order.trackingNumber || "N/A";
    const trackLink = trackingUrl || order.trackingUrl || `https://www.leopardscourier.com/`;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Your Order has Dispatched - Clothing Den</title>
      </head>
      <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #fafaf8; margin: 0; padding: 24px;">
        <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e8e8e0; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.04);">
          
          <div style="background: #141410; padding: 32px 24px; text-align: center;">
            <h1 style="color: #ffffff; font-family: Georgia, serif; font-size: 24px; letter-spacing: 0.2em; margin: 0; text-transform: uppercase;">
              Clothing Den
            </h1>
            <p style="color: #c8a24d; font-size: 11px; letter-spacing: 0.15em; margin: 6px 0 0; text-transform: uppercase;">
              Dispatch Notification
            </p>
          </div>

          <div style="padding: 32px 28px;">
            <div style="display: inline-block; background: #e6f4ea; color: #137333; font-size: 12px; font-weight: bold; padding: 4px 12px; border-radius: 20px; margin-bottom: 16px;">
              🚚 Dispatched & On Its Way
            </div>

            <h2 style="font-family: Georgia, serif; font-size: 20px; color: #141410; margin-top: 0;">
              Your Order #${order._id} Has Shipped!
            </h2>
            <p style="font-size: 13px; color: #55554e; line-height: 1.6;">
              Hello ${customerName}, exciting news! Your parcel has been handed over to <strong>${courierName}</strong> and is currently en route to your delivery address.
            </p>

            <div style="margin: 24px 0; background: #fafaf8; border: 1px solid #e8e8e0; border-radius: 6px; padding: 20px; text-align: center;">
              <p style="margin: 0 0 6px; font-size: 11px; text-transform: uppercase; letter-spacing: 0.15em; color: #78786a;">
                Tracking Number
              </p>
              <p style="margin: 0 0 16px; font-size: 20px; font-weight: bold; font-family: monospace; color: #141410; letter-spacing: 0.05em;">
                ${trackNum}
              </p>
              <a href="${trackLink}" target="_blank" style="display: inline-block; background: #141410; color: #ffffff; text-decoration: none; font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.15em; padding: 12px 28px; border-radius: 4px;">
                Track My Shipment →
              </a>
            </div>

            <p style="font-size: 12px; color: #78786a; line-height: 1.6;">
              Standard courier delivery takes 24–48 hours for major cities. Please ensure the exact amount of <strong>PKR ${(order.totalAmount || 0).toLocaleString()}</strong> is ready upon delivery if using Cash on Delivery.
            </p>
          </div>

          <div style="background: #fafaf8; border-top: 1px solid #e8e8e0; padding: 20px; text-align: center; font-size: 11px; color: #8e8e7e;">
            <p style="margin: 0 0 4px;">Clothing Den • Luxury Pret & Festive Lawn</p>
            <p style="margin: 0;">Inquiries: su92-bscsm-f23-275@superior.edu.pk</p>
          </div>

        </div>
      </body>
      </html>
    `;

    await transporter.sendMail({
      from: SENDER_EMAIL,
      to: recipientEmail,
      subject: `🚚 Dispatched: Your Clothing Den Order #${order._id} is on the way!`,
      html: htmlContent,
    });
    console.log(`✅ Order dispatch email sent to ${recipientEmail}`);
  } catch (err) {
    console.error("Nodemailer dispatch error:", err.message);
  }
}
