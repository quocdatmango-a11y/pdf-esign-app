"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function UploadPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!file) {
      setError("Vui lòng chọn file");
      return;
    }
    setError(null);
    setLoading(true);

    const formData = new FormData();
    formData.append("title", title);
    formData.append("file", file);

    const res = await fetch("/api/documents", { method: "POST", body: formData });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error ?? "Tải file thất bại");
      return;
    }

    router.push(`/dashboard/documents/${data.id}/prepare`);
  }

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="text-2xl font-semibold">Tải tài liệu mới</h1>
      <p className="mt-1 text-sm text-slate-500">
        Hỗ trợ file PDF hoặc Word (.docx). File Word sẽ được tự động chuyển sang PDF.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4 rounded-xl border border-slate-200 bg-white p-6">
        <div>
          <label className="block text-sm font-medium text-slate-700">Tên tài liệu</label>
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ví dụ: Hợp đồng lao động - Nguyễn Văn A"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">File tài liệu</label>
          <input
            type="file"
            required
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
        >
          {loading ? "Đang xử lý..." : "Tải lên và tiếp tục"}
        </button>
      </form>
    </div>
  );
}
