import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { readFile } from "@/lib/storage";

export async function GET(
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

  const wantsSigned = new URL(request.url).searchParams.get("v") === "signed";
  const key = wantsSigned ? document.signedFileKey : document.pdfFileKey;
  if (!key) {
    return NextResponse.json({ error: "File chưa sẵn sàng" }, { status: 404 });
  }

  const bytes = await readFile(key);
  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${document.title}${wantsSigned ? "-signed" : ""}.pdf"`,
    },
  });
}
