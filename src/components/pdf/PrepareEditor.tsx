"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Document, Page, pdfjs } from "react-pdf";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

const PAGE_WIDTH = 650;
const FIELD_WIDTH_RATIO = 0.28;
const FIELD_HEIGHT_RATIO = 0.08;

interface Field {
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export function PrepareEditor({
  documentId,
  pdfUrl,
}: {
  documentId: string;
  pdfUrl: string;
}) {
  const router = useRouter();
  const [numPages, setNumPages] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [field, setField] = useState<Field | null>(null);
  const [signerName, setSignerName] = useState("");
  const [signerEmail, setSignerEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const pageContainerRef = useRef<HTMLDivElement>(null);

  const currentFieldOnPage = useMemo(
    () => (field && field.page === pageNumber ? field : null),
    [field, pageNumber]
  );

  function handlePageClick(e: React.MouseEvent<HTMLDivElement>) {
    const container = pageContainerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const clickX = (e.clientX - rect.left) / rect.width;
    const clickY = (e.clientY - rect.top) / rect.height;

    const width = FIELD_WIDTH_RATIO;
    const height = FIELD_HEIGHT_RATIO;
    const x = Math.min(Math.max(clickX - width / 2, 0), 1 - width);
    const y = Math.min(Math.max(clickY - height / 2, 0), 1 - height);

    setField({ page: pageNumber, x, y, width, height });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!field) {
      setError("Bấm vào tài liệu để đặt vị trí ký trước");
      return;
    }
    setError(null);
    setLoading(true);

    try {
      const fieldsRes = await fetch(`/api/documents/${documentId}/fields`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fields: [field] }),
      });
      if (!fieldsRes.ok) {
        const data = await fieldsRes.json();
        throw new Error(data.error ?? "Không thể lưu vị trí ký");
      }

      const sendRes = await fetch(`/api/documents/${documentId}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: signerName, email: signerEmail }),
      });
      if (!sendRes.ok) {
        const data = await sendRes.json();
        throw new Error(data.error ?? "Không thể gửi lời mời ký");
      }

      router.push(`/dashboard/documents/${documentId}`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Có lỗi xảy ra");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <p className="mb-3 text-sm text-slate-500">
          Bấm vào vị trí trên tài liệu để đặt khung chữ ký.
        </p>
        <div
          ref={pageContainerRef}
          onClick={handlePageClick}
          className="relative mx-auto w-fit cursor-crosshair select-none overflow-hidden rounded-lg border border-slate-200"
        >
          <Document
            file={pdfUrl}
            onLoadSuccess={({ numPages }) => setNumPages(numPages)}
            loading={<div className="p-10 text-sm text-slate-400">Đang tải tài liệu...</div>}
          >
            <Page
              pageNumber={pageNumber}
              width={PAGE_WIDTH}
              renderTextLayer={false}
              renderAnnotationLayer={false}
            />
          </Document>

          {currentFieldOnPage && (
            <div
              className="pointer-events-none absolute flex items-center justify-center rounded border-2 border-dashed border-blue-500 bg-blue-500/10 text-xs font-medium text-blue-600"
              style={{
                left: `${currentFieldOnPage.x * 100}%`,
                top: `${currentFieldOnPage.y * 100}%`,
                width: `${currentFieldOnPage.width * 100}%`,
                height: `${currentFieldOnPage.height * 100}%`,
              }}
            >
              Chữ ký
            </div>
          )}
        </div>

        {numPages > 1 && (
          <div className="mt-3 flex items-center justify-center gap-3 text-sm">
            <button
              type="button"
              onClick={() => setPageNumber((p) => Math.max(1, p - 1))}
              disabled={pageNumber <= 1}
              className="rounded border border-slate-300 px-2 py-1 disabled:opacity-40"
            >
              Trước
            </button>
            <span>
              Trang {pageNumber}/{numPages}
              {field && field.page !== pageNumber ? " (đã đặt ký ở trang " + field.page + ")" : ""}
            </span>
            <button
              type="button"
              onClick={() => setPageNumber((p) => Math.min(numPages, p + 1))}
              disabled={pageNumber >= numPages}
              className="rounded border border-slate-300 px-2 py-1 disabled:opacity-40"
            >
              Sau
            </button>
          </div>
        )}
      </div>

      <form
        onSubmit={handleSubmit}
        className="h-fit space-y-4 rounded-xl border border-slate-200 bg-white p-6"
      >
        <h2 className="font-semibold">Gửi cho người ký</h2>
        <div>
          <label className="block text-sm font-medium text-slate-700">Tên người ký</label>
          <input
            required
            value={signerName}
            onChange={(e) => setSignerName(e.target.value)}
            placeholder="Ví dụ: Anh Giám đốc"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Email người ký</label>
          <input
            type="email"
            required
            value={signerEmail}
            onChange={(e) => setSignerEmail(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
        >
          {loading ? "Đang gửi..." : "Lưu vị trí & Gửi"}
        </button>
      </form>
    </div>
  );
}
