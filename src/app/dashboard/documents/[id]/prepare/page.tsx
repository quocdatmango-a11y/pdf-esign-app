import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { PrepareEditorLoader } from "@/components/pdf/PrepareEditorLoader";

export default async function PreparePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  const { id } = await params;

  const document = await prisma.document.findUnique({ where: { id } });
  if (!document || document.ownerId !== session.user.id) {
    notFound();
  }
  if (document.status !== "draft") {
    redirect(`/dashboard/documents/${id}`);
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold">{document.title}</h1>
      <PrepareEditorLoader documentId={document.id} pdfUrl={`/api/documents/${document.id}/file`} />
    </div>
  );
}
