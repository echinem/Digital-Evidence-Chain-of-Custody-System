const nodemailer = require('nodemailer');

// Create transporter (lazy-initialized)
let transporter = null;

const getTransporter = () => {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT || '587'),
      secure: process.env.EMAIL_SECURE === 'true',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });
  }
  return transporter;
};

/**
 * Send an email. Fails silently in development if not configured.
 */
const sendEmail = async ({ to, subject, html, text }) => {
  if (process.env.NODE_ENV === 'development' && !process.env.EMAIL_USER) {
    console.log(`📧 [DEV] Email to ${to}: ${subject}`);
    return;
  }

  try {
    const info = await getTransporter().sendMail({
      from: process.env.EMAIL_FROM || 'DECS System <noreply@decs.gov>',
      to,
      subject,
      html,
      text,
    });
    console.log(`📧 Email sent: ${info.messageId}`);
  } catch (err) {
    console.error(`📧 Email failed: ${err.message}`);
    // Don't throw — email failure should never break a main operation
  }
};

/**
 * Notify both parties on custody transfer
 */
const sendCustodyTransferEmail = async ({ fromUser, toUser, evidence, reason, adminEmails = [] }) => {
  const subject = `[DECS] Evidence Custody Transfer — ${evidence.name}`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #0a3d62; color: white; padding: 20px; border-radius: 6px 6px 0 0;">
        <h2 style="margin: 0;">🔒 Evidence Custody Transfer Notification</h2>
        <p style="margin: 4px 0 0; opacity: 0.8; font-size: 13px;">Digital Evidence Chain of Custody System</p>
      </div>
      <div style="background: #f8f9fa; padding: 24px; border: 1px solid #ddd; border-top: none;">
        <p>A custody transfer has been recorded in the DECS system.</p>
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
          <tr><td style="padding: 8px; color: #666; width: 140px;">Evidence</td><td style="padding: 8px; font-weight: bold;">${evidence.name}</td></tr>
          <tr style="background: #fff;"><td style="padding: 8px; color: #666;">Evidence ID</td><td style="padding: 8px; font-family: monospace;">${evidence._id}</td></tr>
          <tr><td style="padding: 8px; color: #666;">Case ID</td><td style="padding: 8px; font-family: monospace;">${evidence.caseId}</td></tr>
          <tr style="background: #fff;"><td style="padding: 8px; color: #666;">Transferred From</td><td style="padding: 8px;">${fromUser.name}</td></tr>
          <tr><td style="padding: 8px; color: #666;">Transferred To</td><td style="padding: 8px;">${toUser.name}</td></tr>
          <tr style="background: #fff;"><td style="padding: 8px; color: #666;">Reason</td><td style="padding: 8px;">${reason}</td></tr>
          <tr><td style="padding: 8px; color: #666;">Timestamp</td><td style="padding: 8px;">${new Date().toUTCString()}</td></tr>
        </table>
        <p style="color: #666; font-size: 12px;">This is an automated notification. All custody transfers are permanently recorded in the chain of custody log.</p>
      </div>
    </div>
  `;

  // Notify both sender and recipient (investigators involved)
  await sendEmail({ to: fromUser.email, subject, html });
  await sendEmail({ to: toUser.email, subject, html });

  // Notify admins
  if (adminEmails && adminEmails.length > 0) {
    await sendEmail({ to: adminEmails.join(','), subject, html });
  }
};

/**
 * Alert admins on integrity failure
 */
const sendIntegrityAlertEmail = async ({ adminEmails, evidence, checkedBy }) => {
  const subject = `🚨 [DECS ALERT] Evidence Integrity Compromised — ${evidence.name}`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background: #c0392b; color: white; padding: 20px; border-radius: 6px 6px 0 0;">
        <h2 style="margin: 0;">🚨 INTEGRITY ALERT</h2>
        <p style="margin: 4px 0 0; opacity: 0.9;">Evidence integrity check FAILED</p>
      </div>
      <div style="background: #fff5f5; padding: 24px; border: 1px solid #ffcccc; border-top: none;">
        <p style="color: #c0392b; font-weight: bold;">The SHA-256 hash of the following evidence does not match the stored value. This may indicate tampering.</p>
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
          <tr><td style="padding: 8px; color: #666; width: 140px;">Evidence</td><td style="padding: 8px; font-weight: bold;">${evidence.name}</td></tr>
          <tr><td style="padding: 8px; color: #666;">Evidence ID</td><td style="padding: 8px; font-family: monospace;">${evidence._id}</td></tr>
          <tr><td style="padding: 8px; color: #666;">Case ID</td><td style="padding: 8px;">${evidence.caseId}</td></tr>
          <tr><td style="padding: 8px; color: #666;">Checked By</td><td style="padding: 8px;">${checkedBy.name}</td></tr>
          <tr><td style="padding: 8px; color: #666;">Timestamp</td><td style="padding: 8px;">${new Date().toUTCString()}</td></tr>
        </table>
        <p style="color: #666; font-size: 12px;">Immediate investigation required. Access to this evidence has been flagged.</p>
      </div>
    </div>
  `;

  await sendEmail({ to: adminEmails.join(','), subject, html });
};

module.exports = { sendEmail, sendCustodyTransferEmail, sendIntegrityAlertEmail };
