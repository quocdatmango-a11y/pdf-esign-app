import { Resend } from "resend";

const resendApiKey = process.env.RESEND_API_KEY;
const fromAddress = process.env.EMAIL_FROM ?? "Ký tài liệu <onboarding@resend.dev>";

interface SendEmailArgs {
  to: string;
  subject: string;
  html: string;
}

/**
 * Sends transactional email via Resend when RESEND_API_KEY is configured.
 * Falls back to logging to the console so the signing flow is fully
 * testable locally without an email provider account.
 */
export async function sendEmail({ to, subject, html }: SendEmailArgs): Promise<void> {
  if (!resendApiKey) {
    console.log(`\n[email:dev] To: ${to}\n[email:dev] Subject: ${subject}\n[email:dev] Body:\n${html}\n`);
    return;
  }

  const resend = new Resend(resendApiKey);
  const { error } = await resend.emails.send({ from: fromAddress, to, subject, html });
  if (error) {
    throw new Error(`Failed to send email: ${error.message}`);
  }
}

export function signRequestEmail(params: {
  signerName: string;
  ownerName: string;
  documentTitle: string;
  signUrl: string;
}) {
  const { signerName, ownerName, documentTitle, signUrl } = params;
  return {
    subject: `${ownerName} mời bạn ký tài liệu: ${documentTitle}`,
    html: `
      <p>Chào ${signerName},</p>
      <p>${ownerName} đã gửi tài liệu <strong>${documentTitle}</strong> cần bạn ký xác nhận.</p>
      <p><a href="${signUrl}">Bấm vào đây để xem và ký tài liệu</a></p>
      <p>Link này chỉ dành riêng cho bạn, vui lòng không chia sẻ cho người khác.</p>
    `,
  };
}

export function signCompletedEmail(params: {
  ownerName: string;
  signerName: string;
  documentTitle: string;
  documentUrl: string;
}) {
  const { ownerName, signerName, documentTitle, documentUrl } = params;
  return {
    subject: `${signerName} đã ký tài liệu: ${documentTitle}`,
    html: `
      <p>Chào ${ownerName},</p>
      <p>${signerName} vừa ký xong tài liệu <strong>${documentTitle}</strong>.</p>
      <p><a href="${documentUrl}">Xem chi tiết và tải file đã ký</a></p>
    `,
  };
}
