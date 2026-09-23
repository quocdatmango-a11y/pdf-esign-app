import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { saveFile } from "@/lib/storage";
import { convertDocxToPdf } from "@/lib/convert";

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

const DOCX_MIME =
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  const title = formData.get("title");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Thiếu file tài liệu" }, { status: 400 });
  }
  if (typeof title !== "string" || title.trim().length === 0) {
    return NextResponse.json({ error: "Thiếu tên tài liệu" }, { status: 400 });
  }
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "File vượt quá 20MB" }, { status: 400 });
  }

  const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
  const isDocx =
    file.type === DOCX_MIME || file.name.toLowerCase().endsWith(".docx");

  if (!isPdf && !isDocx) {
    return NextResponse.json(
      { error: "Chỉ hỗ trợ file PDF hoặc Word (.docx)" },
      { status: 400 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  const document = await prisma.document.create({
    data: {
      ownerId: session.user.id,
      title: title.trim(),
      originalFileKey: "",
      originalFileType: isPdf ? "pdf" : "docx",
      status: "draft",
    },
  });

  try {
    const originalKey = await saveFile(document.id, file.name, buffer);

    let pdfKey: string;
    if (isPdf) {
      pdfKey = originalKey;
    } else {
      const pdfBuffer = await convertDocxToPdf(buffer, file.name);
      pdfKey = await saveFile(document.id, `${file.name}.pdf`, pdfBuffer);
    }

    const updated = await prisma.document.update({
      where: { id: document.id },
      data: { originalFileKey: originalKey, pdfFileKey: pdfKey },
    });

    return NextResponse.json({ id: updated.id });
  } catch (error) {
    await prisma.document.delete({ where: { id: document.id } }).catch(() => {});
    const message = error instanceof Error ? error.message : "Không thể xử lý file";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
