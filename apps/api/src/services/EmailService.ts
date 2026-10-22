import nodemailer from 'nodemailer';
import { logger } from '../lib/logger';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.sendgrid.net',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});

const FROM = `${process.env.EMAIL_FROM_NAME || 'NexOS'} <${process.env.EMAIL_FROM || 'noreply@nexos.app'}>`;
const APP_URL = process.env.APP_URL || 'https://nexos.app';

export class EmailService {
  private static async send(options: { to: string; subject: string; html: string; from?: string }) {
    try {
      await transporter.sendMail({ from: options.from || FROM, to: options.to, subject: options.subject, html: options.html });
      logger.info(`Email sent to ${options.to}: ${options.subject}`);
    } catch (err) {
      logger.error(`Email failed to ${options.to}:`, err);
    }
  }

  private static layout(content: string) {
    return `<!DOCTYPE html><html><body style="font-family:sans-serif;background:#f4f6fa;padding:32px">
      <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;padding:32px">
        <div style="font-weight:800;font-size:20px;margin-bottom:24px">Nex<span style="color:#4f8ef7">OS</span></div>
        ${content}
      </div></body></html>`;
  }

  static async sendVerificationEmail(email: string, token: string, tenant: any) {
    const url = `${APP_URL}/verify-email/${token}`;
    await this.send({ to: email, subject: 'Verify your NexOS account', html: this.layout(`
      <h2>Verify your email</h2><p>Click below to verify your email for <strong>${tenant.name}</strong>.</p>
      <a href="${url}" style="background:#4f8ef7;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block">Verify Email</a>
    `) });
  }

  static async sendPasswordReset(email: string, token: string, tenant: any) {
    const url = `${APP_URL}/reset-password?token=${token}`;
    await this.send({ to: email, subject: 'Reset your NexOS password', html: this.layout(`
      <h2>Reset your password</h2><p>We received a request to reset your password for <strong>${tenant?.name || 'NexOS'}</strong>.</p>
      <a href="${url}" style="background:#4f8ef7;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block">Reset Password</a>
      <p style="font-size:13px;color:#94a3b8">Expires in 1 hour. If you didn't request this, ignore this email.</p>
    `) });
  }

  static async sendMagicLink(email: string, token: string, tenant: any) {
    const url = `${APP_URL}/auth/magic-link/verify/${token}`;
    await this.send({ to: email, subject: 'Your NexOS sign-in link', html: this.layout(`
      <h2>Sign in to ${tenant?.name || 'NexOS'}</h2>
      <a href="${url}" style="background:#4f8ef7;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block">Sign In</a>
    `) });
  }

  static async sendTeamInvitation(email: string, token: string, tenant: any, invitedBy: any, role: string) {
    const url = `${APP_URL}/accept-invitation/${token}`;
    await this.send({ to: email, subject: `You're invited to join ${tenant.name}`, html: this.layout(`
      <h2>You're invited!</h2><p><strong>${invitedBy.first_name}</strong> invited you to join <strong>${tenant.name}</strong> as a <strong>${role}</strong>.</p>
      <a href="${url}" style="background:#4f8ef7;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block">Accept Invitation</a>
    `) });
  }

  static async sendCustomEmail(options: { to: string; subject: string; body: string; fromName?: string; fromEmail?: string }) {
    const from = options.fromName && options.fromEmail ? `${options.fromName} <${options.fromEmail}>` : FROM;
    await this.send({ to: options.to, subject: options.subject, html: options.body, from });
  }
}
