import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateSignerToken } from "@/lib/token";
import { sendEmail, signRequestEmail } from "@/lib/email";

const bodySchema = z.object({
  name: z.string().trim().min(1, "Vui lòng nhập tên người ký"),
  email: z.string().trim().toLowerCase().email("Email không hợp lệ"),
});

const SIGNER_LINK_TTL_DAYS = 30;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  const { id } = await params;
  const document = await prisma.document.findUnique({
    where: { id },
    include: { signatureFields: true, owner: true },
  });
  if (!document || document.ownerId !== session.user.id) {
    return NextResponse.json({ error: "Không tìm thấy tài liệu" }, { status: 404 });
  }
  if (document.status !== "draft") {
    return NextResponse.json({ error: "Tài liệu đã được gửi trước đó" }, { status: 409 });
  }
  if (document.signatureFields.length === 0) {
    return NextResponse.json(
      { error: "Cần đặt vị trí ký trước khi gửi" },
      { status: 400 }
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dữ liệu không hợp lệ" },
      { status: 400 }
    );
  }

  const accessToken = generateSignerToken();
  const expiresAt = new Date(Date.now() + SIGNER_LINK_TTL_DAYS * 24 * 60 * 60 * 1000);

  await prisma.$transaction([
    prisma.signer.create({
      data: {
        documentId: id,
        name: parsed.data.name,
        email: parsed.data.email,
        accessToken,
        expiresAt,
      },
    }),
    prisma.document.update({ where: { id }, data: { status: "sent" } }),
    prisma.auditLog.create({
      data: {
        documentId: id,
        action: "sent",
        actorEmail: session.user.email ?? undefined,
      },
    }),
  ]);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin;
  const signUrl = `${appUrl}/sign/${accessToken}`;

  const { subject, html } = signRequestEmail({
    signerName: parsed.data.name,
    ownerName: document.owner.name,
    documentTitle: document.title,
    signUrl,
  });
  await sendEmail({ to: parsed.data.email, subject, html });

  return NextResponse.json({ ok: true });
}
