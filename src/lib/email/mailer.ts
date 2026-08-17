import nodemailer, { type Transporter } from "nodemailer";
import { env } from "../../config/env.js";

const isEmailConfigured = Boolean(
  env.SMTP_HOST && env.SMTP_USER && env.SMTP_PASS && env.SMTP_FROM,
);

let transporter: Transporter | null = null;

const getTransporter = (): Transporter => {
  if (!isEmailConfigured) {
    throw new Error(
      "Email is not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASS and SMTP_FROM.",
    );
  }
  transporter ??= nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
  });
  return transporter;
};

export interface MailOptions {
  to: string | string[];
  subject: string;
  text: string;
  html: string;
}

export const sendMail = async (options: MailOptions): Promise<void> => {
  await getTransporter().sendMail({
    from: env.SMTP_FROM,
    ...options,
  });
};

export const verifyMailer = async () => {
  if (!isEmailConfigured) {
    console.warn("[mailer] SMTP not configured - emails are disabled.");
    return;
  }
  try {
    await getTransporter().verify();
    console.log("[mailer] SMTP connection verified.");
  } catch (err) {
    console.error("[mailer] SMTP verification failed:", err);
  }
};
