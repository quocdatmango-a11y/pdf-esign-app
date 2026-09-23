import { prisma } from "@/lib/prisma";
import { SignEditorLoader } from "@/components/pdf/SignEditorLoader";

export default async function SignPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const signer = await prisma.signer.findUnique({
    where: { accessToken: token },
    include: { document: { include: { signatureFields: true } } },
  });

  if (!signer || signer.expiresAt < new Date()) {
    return (
      <main className="flex flex-1 items-center justify-center px-4">
        <div className="max-w-md rounded-xl border border-slate-200 bg-white p-8 text-center">
          <h1 className="text-lg font-semibold">Link không hợp lệ</h1>
          <p className="mt-2 text-sm text-slate-500">
            Link ký tài liệu này không tồn tại hoặc đã hết hạn. Vui lòng liên hệ người gửi để nhận
            link mới.
          </p>
        </div>
      </main>
    );
  }

  if (signer.status === "signed") {
    return (
      <main className="flex flex-1 items-center justify-center px-4">
        <div className="max-w-md rounded-xl border border-emerald-200 bg-emerald-50 p-8 text-center">
          <h1 className="text-lg font-semibold text-emerald-800">Đã ký xong</h1>
          <p className="mt-2 text-sm text-emerald-700">
            Bạn đã ký tài liệu &quot;{signer.document.title}&quot; trước đó rồi.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 px-4 py-10">
      <SignEditorLoader
        token={token}
        pdfUrl={`/api/sign/${token}/file`}
        documentTitle={signer.document.title}
        signerName={signer.name}
        fields={signer.document.signatureFields}
      />
    </main>
  );
}
