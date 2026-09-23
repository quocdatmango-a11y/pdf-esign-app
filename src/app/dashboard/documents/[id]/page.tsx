import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { documentStatusLabel, documentStatusColor } from "@/lib/status";

const auditActionLabel: Record<string, string> = {
  sent: "Đã gửi lời mời ký",
  viewed: "Đã mở xem tài liệu",
  signed: "Đã ký tài liệu",
};

export default async function DocumentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  const { id } = await params;

  const document = await prisma.document.findUnique({
    where: { id },
    include: {
      signers: { orderBy: { createdAt: "desc" } },
      auditLogs: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!document || document.ownerId !== session.user.id) {
    notFound();
  }

  const dateFormat = new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short" });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{document.title}</h1>
          <span
            className={`mt-2 inline-block rounded-full px-2 py-1 text-xs font-medium ${documentStatusColor[document.status]}`}
          >
            {documentStatusLabel[document.status]}
          </span>
        </div>
        <div className="flex gap-2">
          {document.status === "draft" && (
            <Link
              href={`/dashboard/documents/${document.id}/prepare`}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
            >
              Đặt vị trí ký & Gửi
            </Link>
          )}
          <a
            href={`/api/documents/${document.id}/file`}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50"
          >
            Xem file gốc
          </a>
          {document.status === "signed" && (
            <a
              href={`/api/documents/${document.id}/file?v=signed`}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
            >
              Tải file đã ký
            </a>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="font-semibold">Người ký</h2>
        {document.signers.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">Chưa gửi cho ai ký.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {document.signers.map((signer) => (
              <li key={signer.id} className="flex items-center justify-between text-sm">
                <span>
                  {signer.name} ({signer.email})
                </span>
                <span className="text-slate-500">
                  {signer.status === "signed" && signer.signedAt
                    ? `Đã ký lúc ${dateFormat.format(signer.signedAt)}`
                    : signer.status === "viewed"
                      ? "Đã xem, chưa ký"
                      : "Chưa mở"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6">
        <h2 className="font-semibold">Nhật ký hoạt động</h2>
        {document.auditLogs.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">Chưa có hoạt động nào.</p>
        ) : (
          <ul className="mt-3 space-y-2 text-sm text-slate-600">
            {document.auditLogs.map((log) => (
              <li key={log.id} className="flex items-center justify-between">
                <span>
                  {auditActionLabel[log.action] ?? log.action}
                  {log.actorEmail ? ` — ${log.actorEmail}` : ""}
                  {log.ipAddress ? ` (IP: ${log.ipAddress})` : ""}
                </span>
                <span className="text-slate-400">{dateFormat.format(log.createdAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
