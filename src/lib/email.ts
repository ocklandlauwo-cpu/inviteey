import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host:   process.env.SMTP_HOST,
  port:   Number(process.env.SMTP_PORT ?? 587),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

interface SendEmailOptions {
  to:      string;
  subject: string;
  html:    string;
  text?:   string;
}

export async function sendEmail({ to, subject, html, text }: SendEmailOptions): Promise<void> {
  await transporter.sendMail({
    from:    `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM_ADDRESS}>`,
    to,
    subject,
    html,
    text: text ?? html.replace(/<[^>]+>/g, ""),
  });
}

export function buildVerificationEmail(name: string, verifyUrl: string): string {
  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Verify your Invitee account</h2>
      <p>Hi ${name},</p>
      <p>Click the button below to verify your email address and activate your Invitee account.</p>
      <a href="${verifyUrl}" style="display:inline-block;padding:12px 24px;background:#D97706;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;">
        Verify Email
      </a>
      <p style="color:#78716C;font-size:13px;margin-top:24px;">This link expires in 24 hours. If you didn't create an Invitee account, you can ignore this email.</p>
      <p style="color:#78716C;font-size:13px;">— The Invitee Team</p>
    </div>
  `;
}

export function buildPasswordResetEmail(name: string, resetUrl: string): string {
  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Reset your Invitee password</h2>
      <p>Hi ${name},</p>
      <p>Click the button below to reset your password. This link expires in 1 hour.</p>
      <a href="${resetUrl}" style="display:inline-block;padding:12px 24px;background:#D97706;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;">
        Reset Password
      </a>
      <p style="color:#78716C;font-size:13px;margin-top:24px;">If you didn't request a password reset, you can safely ignore this email.</p>
      <p style="color:#78716C;font-size:13px;">— The Invitee Team</p>
    </div>
  `;
}

export function buildTierActivationEmail(
  name: string,
  eventName: string,
  tier: string
): string {
  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Your ${tier} plan is now active!</h2>
      <p>Hi ${name},</p>
      <p>Great news! Your <strong>${tier}</strong> plan has been activated for <strong>${eventName}</strong>.</p>
      <p>You now have access to all ${tier} features for this event. Log in to your dashboard to get started.</p>
      <a href="${process.env.NEXT_PUBLIC_APP_URL}/events" style="display:inline-block;padding:12px 24px;background:#D97706;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;">
        Go to Dashboard
      </a>
      <p style="color:#78716C;font-size:13px;margin-top:24px;">Questions? Contact us at info@invitee.co.tz or +255 754 405596.</p>
      <p style="color:#78716C;font-size:13px;">— The Invitee Team</p>
    </div>
  `;
}
