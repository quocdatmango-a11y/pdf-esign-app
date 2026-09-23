import { PDFDocument, rgb } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import { promises as fs } from "fs";
import path from "path";

const FONT_PATH = path.join(process.cwd(), "src/assets/fonts/NotoSans-Regular.ttf");

export interface SignaturePlacement {
  /** 1-indexed page number the field was placed on */
  page: number;
  /** Ratios (0..1) relative to the page's width/height, origin top-left */
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Burns a signature PNG plus a caption line into a PDF at the given
 * placement and returns the resulting PDF bytes. Coordinates are stored as
 * ratios of the page size so the same field works regardless of the zoom
 * level used when it was placed in the browser.
 */
export async function embedSignatureInPdf(
  pdfBytes: Buffer,
  signaturePngBytes: Buffer,
  placement: SignaturePlacement,
  caption: string
): Promise<Buffer> {
  const pdfDoc = await PDFDocument.load(pdfBytes);
  pdfDoc.registerFontkit(fontkit);

  const pages = pdfDoc.getPages();
  const pageIndex = placement.page - 1;
  if (pageIndex < 0 || pageIndex >= pages.length) {
    throw new Error(
      `Signature field references page ${placement.page}, but the PDF only has ${pages.length} page(s)`
    );
  }
  const page = pages[pageIndex];
  const { width: pageWidth, height: pageHeight } = page.getSize();

  const pngImage = await pdfDoc.embedPng(signaturePngBytes);

  const boxX = placement.x * pageWidth;
  const boxWidth = placement.width * pageWidth;
  const boxHeight = placement.height * pageHeight;
  const boxTopY = pageHeight - placement.y * pageHeight;

  const imageAreaHeight = boxHeight * 0.75;
  const scaled = pngImage.scaleToFit(boxWidth, imageAreaHeight);

  page.drawImage(pngImage, {
    x: boxX + (boxWidth - scaled.width) / 2,
    y: boxTopY - imageAreaHeight + (imageAreaHeight - scaled.height) / 2,
    width: scaled.width,
    height: scaled.height,
  });

  const fontBytes = await fs.readFile(FONT_PATH);
  const font = await pdfDoc.embedFont(fontBytes, { subset: true });
  const fontSize = Math.max(6, Math.min(9, boxWidth / 22));

  page.drawText(caption, {
    x: boxX,
    y: boxTopY - boxHeight + 2,
    size: fontSize,
    font,
    color: rgb(0.35, 0.35, 0.35),
  });

  const outBytes = await pdfDoc.save();
  return Buffer.from(outBytes);
}

export async function getPdfPageCount(pdfBytes: Buffer): Promise<number> {
  const pdfDoc = await PDFDocument.load(pdfBytes);
  return pdfDoc.getPageCount();
}
