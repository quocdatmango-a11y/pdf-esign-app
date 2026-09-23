"use client";

import dynamic from "next/dynamic";

const PrepareEditor = dynamic(
  () => import("./PrepareEditor").then((mod) => mod.PrepareEditor),
  {
    ssr: false,
    loading: () => (
      <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-400">
        Đang tải trình soạn tài liệu...
      </div>
    ),
  }
);

export function PrepareEditorLoader(props: { documentId: string; pdfUrl: string }) {
  return <PrepareEditor {...props} />;
}
