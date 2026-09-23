import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { readFile, saveFile } from "@/lib/storage";
import { embedSignatureInPdf } from "@/lib/pdf-sign";
import { getClientIp } from "@/lib/request";
import { sendEmail, signCompletedEmail } from "@/lib/email";

const bodySchema = z.object({
  signatureDataUrl: z
    .string()
    .startsWith("data:image/png;base64,", "Chữ ký không hợp lệ"),
});

function formatVnDate(date: Date): string {
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(date);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const signer = await prisma.signer.findUnique({
    where: { accessToken: token },
    include: { document: { include: { signatureFields: true, owner: true } } },
  });

  if (!signer || signer.expiresAt < new Date()) {
    return NextResponse.json({ error: "Link không hợp lệ hoặc đã hết hạn" }, { status: 404 });
  }
  if (signer.status === "signed") {
    return NextResponse.json({ error: "Tài liệu này đã được ký rồi" }, { status: 409 });
  }
  if (!signer.document.pdfFileKey) {
    return NextResponse.json({ error: "Tài liệu chưa sẵn sàng" }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" },
      { status: 400 }
    );
  }

  const base64 = parsed.data.signatureDataUrl.split(",")[1] ?? "";
  const signaturePng = Buffer.from(base64, "base64");

  const now = new Date();
  const caption = `Ký bởi ${signer.name} - ${formatVnDate(now)}`;

  let pdfBytes = await readFile(signer.document.pdfFileKey);
  for (const field of signer.document.signatureFields) {
    pdfBytes = await embedSignatureInPdf(pdfBytes, signaturePng, field, caption);
  }

  const signedKey = await saveFile(
    signer.documentId,
    `${signer.document.title}-signed.pdf`,
    pdfBytes
  );

  const ipAddress = getClientIp(request);

  await prisma.$transaction([
    prisma.signer.update({
      where: { id: signer.id },
      data: { status: "signed", signedAt: now, ipAddress },
    }),
    prisma.document.update({
      where: { id: signer.documentId },
      data: { status: "signed", signedFileKey: signedKey },
    }),
    prisma.auditLog.create({
      data: {
        documentId: signer.documentId,
        action: "signed",
        actorEmail: signer.email,
        ipAddress,
      },
    }),
  ]);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin;
  const { subject, html } = signCompletedEmail({
    ownerName: signer.document.owner.name,
    signerName: signer.name,
    documentTitle: signer.document.title,
    documentUrl: `${appUrl}/dashboard/documents/${signer.documentId}`,
  });
  await sendEmail({ to: signer.document.owner.email, subject, html });

  return NextResponse.json({ ok: true });
}
