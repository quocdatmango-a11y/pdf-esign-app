import type { DocumentStatus } from "@/generated/prisma/client";

export const documentStatusLabel: Record<DocumentStatus, string> = {
  draft: "Nháp",
  sent: "Đã gửi",
  viewed: "Đã xem",
  signed: "Đã ký",
  declined: "Từ chối",
};

export const documentStatusColor: Record<DocumentStatus, string> = {
  draft: "bg-slate-100 text-slate-600",
  sent: "bg-blue-100 text-blue-700",
  viewed: "bg-amber-100 text-amber-700",
  signed: "bg-emerald-100 text-emerald-700",
  declined: "bg-red-100 text-red-700",
};
