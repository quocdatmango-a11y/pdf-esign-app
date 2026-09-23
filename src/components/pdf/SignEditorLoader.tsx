"use client";

import dynamic from "next/dynamic";

const SignEditor = dynamic(() => import("./SignEditor").then((mod) => mod.SignEditor), {
  ssr: false,
  loading: () => (
    <div className="rounded-xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-400">
      Đang tải tài liệu...
    </div>
  ),
});

export function SignEditorLoader(props: {
  token: string;
  pdfUrl: string;
  documentTitle: string;
  signerName: string;
  fields: { page: number; x: number; y: number; width: number; height: number }[];
}) {
  return <SignEditor {...props} />;
}
