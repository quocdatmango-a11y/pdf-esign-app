"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function DeleteDocumentButton({
  documentId,
  documentTitle,
}: {
  documentId: string;
  documentTitle: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    const confirmed = window.confirm(
      `Xóa vĩnh viễn tài liệu "${documentTitle}"? Hành động này không thể hoàn tác.`
    );
    if (!confirmed) return;

    setLoading(true);
    const res = await fetch(`/api/documents/${documentId}`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(data.error ?? "Không thể xóa tài liệu");
      setLoading(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={loading}
      className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
    >
      {loading ? "Đang xóa..." : "Xóa tài liệu"}
    </button>
  );
}
