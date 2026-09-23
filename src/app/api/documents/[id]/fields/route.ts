import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const fieldSchema = z.object({
  page: z.number().int().min(1),
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  width: z.number().gt(0).max(1),
  height: z.number().gt(0).max(1),
});

const bodySchema = z.object({
  fields: z.array(fieldSchema).min(1, "Cần đặt ít nhất 1 vị trí ký"),
});

export async function POST(
  request: Request,
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
  if (document.status !== "draft") {
    return NextResponse.json(
      { error: "Tài liệu đã gửi đi, không thể chỉnh vị trí ký" },
      { status: 409 }
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

  await prisma.$transaction([
    prisma.signatureField.deleteMany({ where: { documentId: id } }),
    prisma.signatureField.createMany({
      data: parsed.data.fields.map((f) => ({ ...f, documentId: id })),
    }),
  ]);

  return NextResponse.json({ ok: true });
}
