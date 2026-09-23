import { execFile } from "child_process";
import { promisify } from "util";
import { promises as fs } from "fs";
import os from "os";
import path from "path";

const execFileAsync = promisify(execFile);

function resolveSofficeBinary(): string {
  if (process.env.LIBREOFFICE_BIN) return process.env.LIBREOFFICE_BIN;
  if (process.platform === "win32") {
    return "C:\\Program Files\\LibreOffice\\program\\soffice.exe";
  }
  return "soffice";
}

/**
 * Converts a Word document buffer to PDF using headless LibreOffice.
 * Each call runs in its own temp profile/directory so concurrent
 * conversions don't collide on LibreOffice's lock file.
 */
export async function convertDocxToPdf(input: Buffer, originalFilename: string): Promise<Buffer> {
  const workDir = await fs.mkdtemp(path.join(os.tmpdir(), "esign-convert-"));
  const profileDir = await fs.mkdtemp(path.join(os.tmpdir(), "esign-profile-"));

  try {
    const ext = path.extname(originalFilename) || ".docx";
    const inputPath = path.join(workDir, `input${ext}`);
    await fs.writeFile(inputPath, input);

    const soffice = resolveSofficeBinary();
    const profileUrl = `file:///${profileDir.replace(/\\/g, "/")}`;

    await execFileAsync(
      soffice,
      [
        "--headless",
        "--norestore",
        `-env:UserInstallation=${profileUrl}`,
        "--convert-to",
        "pdf",
        "--outdir",
        workDir,
        inputPath,
      ],
      { timeout: 60_000 }
    );

    const outputPath = path.join(workDir, `input.pdf`);
    return await fs.readFile(outputPath);
  } finally {
    await fs.rm(workDir, { recursive: true, force: true }).catch(() => {});
    await fs.rm(profileDir, { recursive: true, force: true }).catch(() => {});
  }
}
