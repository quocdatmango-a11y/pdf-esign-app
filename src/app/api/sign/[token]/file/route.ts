import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { readFile } from "@/lib/storage";
import { getClientIp } from "@/lib/request";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const signer = await prisma.signer.findUnique({
    where: { accessToken: token },
    include: { document: true },
  });

  if (!signer || signer.expiresAt < new Date()) {
    return NextResponse.json({ error: "Link không hợp lệ hoặc đã hết hạn" }, { status: 404 });
  }
  if (!signer.document.pdfFileKey) {
    return NextResponse.json({ error: "Tài liệu chưa sẵn sàng" }, { status: 404 });
  }

  if (signer.status === "pending") {
    await prisma.$transaction([
      prisma.signer.update({ where: { id: signer.id }, data: { status: "viewed" } }),
      prisma.document.update({
        where: { id: signer.documentId },
        data: { status: "viewed" },
      }),
      prisma.auditLog.create({
        data: {
          documentId: signer.documentId,
          action: "viewed",
          actorEmail: signer.email,
          ipAddress: getClientIp(request),
        },
      }),
    ]);
  }

  const bytes = await readFile(signer.document.pdfFileKey);
  return new NextResponse(new Uint8Array(bytes), {
    headers: { "Content-Type": "application/pdf" },
  });
}
