export const CONTINUATION_TAB_MM = 2;

export interface PdfPageSlice {
  page: number;
  pageContentWidthMm: number;
  startXPx: number;
  endXPx: number;
  sliceWidthPx: number;
}

export interface PdfHorizontalSplitPlan {
  scaleHmmPerPx: number;
  totalImgWidthMm: number;
  numPages: number;
  slices: PdfPageSlice[];
}

export function buildPdfHorizontalSplitPlan(
  canvasWidth: number,
  canvasHeight: number,
  availW: number,
  availH: number,
  continuationTabMm: number = CONTINUATION_TAB_MM,
): PdfHorizontalSplitPlan {
  const scaleHmmPerPx = availH / canvasHeight;
  const totalImgWidthMm = canvasWidth * scaleHmmPerPx;
  const numPages = Math.ceil(totalImgWidthMm / availW);
  const slices: PdfPageSlice[] = [];

  for (let page = 0; page < numPages; page++) {
    const pageContentWidthMm = page < numPages - 1
      ? availW - continuationTabMm
      : availW;
    const startXPx = Math.floor((page * availW) / scaleHmmPerPx);
    const endXPx = Math.ceil((page * availW + pageContentWidthMm) / scaleHmmPerPx);
    const sliceWidthPx = Math.max(0, Math.min(endXPx - startXPx, canvasWidth - startXPx));
    if (sliceWidthPx <= 0) continue;
    slices.push({ page, pageContentWidthMm, startXPx, endXPx, sliceWidthPx });
  }

  return { scaleHmmPerPx, totalImgWidthMm, numPages, slices };
}
