"use client";

import { useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import SignatureCanvas from "react-signature-canvas";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

const PAGE_WIDTH = 600;

interface Field {
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export function SignEditor({
  token,
  pdfUrl,
  documentTitle,
  signerName,
  fields,
}: {
  token: string;
  pdfUrl: string;
  documentTitle: string;
  signerName: string;
  fields: Field[];
}) {
  const [numPages, setNumPages] = useState(0);
  const [pageNumber, setPageNumber] = useState(fields[0]?.page ?? 1);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const sigRef = useRef<SignatureCanvas>(null);

  const fieldsOnPage = fields.filter((f) => f.page === pageNumber);

  async function handleConfirm() {
    setError(null);
    const canvas = sigRef.current;
    if (!canvas || canvas.isEmpty()) {
      setError("Vui lòng ký tên vào ô chữ ký trước");
      return;
    }
    setLoading(true);
    try {
      const signatureDataUrl = canvas.getTrimmedCanvas().toDataURL("image/png");
      const res = await fetch(`/api/sign/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signatureDataUrl }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Ký thất bại, vui lòng thử lại");
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Có lỗi xảy ra");
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="mx-auto max-w-md rounded-xl border border-emerald-200 bg-emerald-50 p-8 text-center">
        <h1 className="text-lg font-semibold text-emerald-800">Ký thành công!</h1>
        <p className="mt-2 text-sm text-emerald-700">
          Cảm ơn {signerName}, bạn đã ký tài liệu &quot;{documentTitle}&quot;.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div>
        <h1 className="text-xl font-semibold">{documentTitle}</h1>
        <p className="text-sm text-slate-500">Xin chào {signerName}, vui lòng xem và ký tài liệu bên dưới.</p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="relative mx-auto w-fit overflow-hidden rounded-lg border border-slate-200">
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

          {fieldsOnPage.map((f, i) => (
            <div
              key={i}
              className="pointer-events-none absolute flex items-center justify-center rounded border-2 border-dashed border-blue-500 bg-blue-500/10 text-xs font-medium text-blue-600"
              style={{
                left: `${f.x * 100}%`,
                top: `${f.y * 100}%`,
                width: `${f.width * 100}%`,
                height: `${f.height * 100}%`,
              }}
            >
              Ký ở đây
            </div>
          ))}
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

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex items-center justify-between">
          <h2 className="font-medium">Ký tên của bạn</h2>
          <button
            type="button"
            onClick={() => sigRef.current?.clear()}
            className="text-sm text-slate-500 underline"
          >
            Xóa
          </button>
        </div>
        <div className="mt-2 rounded-lg border border-slate-300 bg-slate-50">
          <SignatureCanvas
            ref={sigRef}
            canvasProps={{ className: "w-full h-40 touch-none" }}
            penColor="#0f172a"
          />
        </div>

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        <button
          type="button"
          onClick={handleConfirm}
          disabled={loading}
          className="mt-4 w-full rounded-lg bg-slate-900 px-4 py-3 text-sm font-medium text-white hover:bg-slate-700 disabled:opacity-50"
        >
          {loading ? "Đang xử lý..." : "Xác nhận ký"}
        </button>
      </div>
    </div>
  );
}
