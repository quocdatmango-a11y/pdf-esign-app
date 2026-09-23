import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deleteFile } from "@/lib/storage";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  const { id } = await params;
  const document = await prisma.document.findUnique({ where: { id } });
  if (!document || document.ownerId !== session.user.id) {
    return NextResponse.json({ error: "Không tìm thấy tài liệu" }, { status: 404 });
  }

  const keys = new Set(
    [document.originalFileKey, document.pdfFileKey, document.signedFileKey].filter(
      (key): key is string => Boolean(key)
    )
  );
  await Promise.all([...keys].map((key) => deleteFile(key).catch(() => {})));

  await prisma.document.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
