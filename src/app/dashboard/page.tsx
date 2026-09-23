import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { documentStatusLabel, documentStatusColor } from "@/lib/status";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const documents = await prisma.document.findMany({
    where: { ownerId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: { signers: true },
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Tài liệu của tôi</h1>
        <Link
          href="/dashboard/upload"
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700"
        >
          + Tải tài liệu mới
        </Link>
      </div>

      {documents.length === 0 ? (
        <div className="mt-10 rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500">
          Chưa có tài liệu nào. Bấm &quot;Tải tài liệu mới&quot; để bắt đầu.
        </div>
      ) : (
        <div className="mt-6 overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Tên tài liệu</th>
                <th className="px-4 py-3 font-medium">Người ký</th>
                <th className="px-4 py-3 font-medium">Trạng thái</th>
                <th className="px-4 py-3 font-medium">Ngày tạo</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((doc) => (
                <tr key={doc.id} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3">
                    <Link
                      href={`/dashboard/documents/${doc.id}`}
                      className="font-medium text-slate-900 hover:underline"
                    >
                      {doc.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {doc.signers[0]?.name ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2 py-1 text-xs font-medium ${documentStatusColor[doc.status]}`}
                    >
                      {documentStatusLabel[doc.status]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium" }).format(
                      doc.createdAt
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
